"""
chat_generator.py

WhatsApp-style scam chat generation using OpenRouter API.
Generates realistic friend/relative emergency scams with emotional pressure.
"""

import json
import asyncio
import random
from typing import Optional, Dict, Any, List
from datetime import datetime
from openai import AsyncOpenAI, RateLimitError
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Initialize ONLY Groq client (EXCLUSIVE - no fallbacks)
client = None
groq_available = False
groq_error_message = ""

# ONLY use Groq API (verified working, no rate limits)
if settings.GROQ_API_KEY:
    try:
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL
        )
        groq_available = True
        log.info(f"✅ Chat Generator initialized with GROQ API (EXCLUSIVE): {settings.GROQ_API_KEY[:15]}...")
    except Exception as e:
        groq_error_message = str(e)
        log.error(f"❌ Failed to initialize GROQ chat client: {e}")
        client = None
else:
    groq_error_message = "GROQ_API_KEY not configured"
    log.error(f"❌ {groq_error_message}")

if not client:
    log.warning(f"⚠️ Chat Generator unavailable: {groq_error_message}")

# Rate limit retry helper with proper RateLimitError handling
async def _call_groq_with_retry(model: str, messages: list, max_tokens: int, temperature: float = 0.95, **kwargs):
    """
    Call GROQ API with automatic retry on rate limit (429 errors).
    Implements exponential backoff: 2s, 4s, 8s, 16s, 32s, etc.
    """
    max_retries = 10  # Increased from 3 to 10 retries
    base_wait = 2
    
    for attempt in range(max_retries):
        try:
            log.info(f"🔄 GROQ API call attempt {attempt + 1}/{max_retries}")
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    **kwargs
                ),
                timeout=20.0  # Increased timeout for retries
            )
            return response
        except RateLimitError as e:
            # GROQ rate limit hit - retry with exponential backoff
            wait_time = base_wait * (2 ** attempt)
            log.warning(f"⚠️  GROQ rate limit hit (429): {e}")
            log.warning(f"   Attempt {attempt + 1}/{max_retries} - Waiting {wait_time}s before retry...")
            if attempt == max_retries - 1:
                # Last attempt failed
                error_msg = f"GROQ rate limit exceeded after {max_retries} retries with backoff"
                log.error(f"❌ {error_msg}")
                raise RuntimeError(error_msg)
            await asyncio.sleep(wait_time)
        except asyncio.TimeoutError:
            error_msg = f"GROQ timeout (attempt {attempt + 1}/{max_retries})"
            log.error(f"⏱️ {error_msg}")
            if attempt == max_retries - 1:
                raise RuntimeError(error_msg)
            await asyncio.sleep(base_wait * (2 ** attempt))
        except Exception as e:
            # Other errors - check if they mention rate limit
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str.lower() or isinstance(e, RateLimitError):
                wait_time = base_wait * (2 ** attempt)
                log.warning(f"⚠️  Rate limit detected in error: {error_str[:100]}")
                log.warning(f"   Attempt {attempt + 1}/{max_retries} - Waiting {wait_time}s...")
                if attempt == max_retries - 1:
                    raise RuntimeError(f"GROQ rate limit exceeded after {max_retries} retries")
                await asyncio.sleep(wait_time)
            else:
                # Non-retriable error
                log.error(f"❌ Non-retriable error: {error_str}")
                raise

# MASTER PROMPT - Generates UNIQUE, DYNAMIC WhatsApp-style scam chats every time
MASTER_CHAT_PROMPT = """You are generating a UNIQUE WhatsApp-style scam chat simulation.
This chat has NEVER been generated before - create something COMPLETELY DIFFERENT each time.

CRITICAL RULE: **SCAMMER SPEAKS FIRST** - Start the conversation with the scammer's urgent message
The user will respond AFTER seeing the scammer's first message.

CRITICAL: Generate ORIGINAL content - NOT a template or repeated pattern
- Each user generates a DIFFERENT scenario
- Use different names, locations, amounts, situations
- Vary the emotional pressure tactics
- Change hospital names, accident types, payment reasons
- This is NOT a standard template - INNOVATE

This is NOT a story or paragraph - this is ONLY realistic WhatsApp chat messages.

STRICT FORMAT RULES:
1. **FIRST MESSAGE MUST BE FROM SCAMMER** - Always start with [SCAMMER - HH:MM]
2. Output ONLY chat messages in strict sequence
3. Each message SHORT (1-2 sentences max) - WhatsApp style
4. Include realistic timestamps (increment by 1-4 minutes)
5. ONE unique scenario per chat (no mixing)
6. Messages feel natural, emotional, human, ORIGINAL
7. Never repeat the same scenario twice
8. Alternate: SCAMMER → USER → SCAMMER → USER...

SCENARIO TEMPLATES (pick ONE and MAKE IT UNIQUE):
Option A: Mom/Dad/Sibling accident → needs surgery money
Option B: Cousin arrested → needs bail money  
Option C: Brother in foreign country → money stolen, needs urgent help
Option D: Friend's father hospitalized → ICU charges needed
Option E: Relative emergency - choose YOUR OWN creative variation

UNIQUE VARIATIONS:
- Different amounts (₹8,000 to ₹25,000)
- Different hospital names (Apollo, Max, Fortis, private clinic)
- Different family members
- Different urgency levels
- Different emotional appeals (crying, panic, shame, desperation)
- Add specific details (room number, doctor name, account issues)

MESSAGE STYLE:
Scammer: emotional, uses terms of endearment, creates urgency, shows panic/fear
User: concerned but human, asks questions, shows willingness to help

CONVERSATION FLOW (8-12 message exchanges):
[SCAMMER - HH:MM] ← MUST START HERE WITH URGENT, EMOTIONAL MESSAGE
message

[USER - HH:MM]
response

[SCAMMER - HH:MM]
urgent reply with more pressure

[USER - HH:MM]
user agrees or asks for details

...continue alternating...

[SCAMMER - HH:MM]
"Go to this link now - pay quick!!" or "Send money via QR code"

[USER - HH:MM]
"Ok I'm paying" or "Let me check this link"

[PAYMENT_BLOCK]
Link: [unique fake URL - NOT repeating]
Amount: [the amount mentioned in chat]
QR: [SCAN_QR_CODE]
CTA: PAY NOW

DO NOT - CRITICAL:
✗ Start with USER message - SCAMMER MUST BE FIRST
✗ Use the same scenario as previous generation
✗ Use generic templates
✗ Repeat names or situations
✗ Make messages too long
✗ Mix multiple scam types
✗ Write story format
✗ Be predictable

GENERATE NOW - **START WITH SCAMMER'S URGENT FIRST MESSAGE** - CREATE ONE COMPLETELY UNIQUE WhatsApp SCAM CHAT:"""

# CYBERSECURITY PROMPT - Tech-savvy scam chat with account compromise, billing alerts, etc.
CYBERSECURITY_CHAT_PROMPT = """You are an expert at creating realistic CYBERSECURITY SCAM chat simulations.
**CRITICAL: SCAMMER SPEAKS FIRST** - The conversation starts with the scammer's security alert

SCAM TYPES (pick one and stay consistent):
1. Bank/PayPal account verification - "Unusual activity detected"
2. Amazon/Google account breach - "Confirm your identity immediately"  
3. Payment processor fraud alert - "Verify payment method"
4. Crypto exchange account - "Complete urgent verification"
5. Mobile carrier security - "Sim swap/unauthorized access"

CONVERSATION FLOW (CRITICAL - SCAMMER INITIATES):
Step 1: **Scammer sends initial ALERT about suspicious activity** ← FIRST MESSAGE
Step 2: User responds with confusion/concern
Step 3: Scammer requests verification code or card details
Step 4: User hesitates or asks questions
Step 5: Scammer creates MORE URGENCY (account will be locked/money lost)
Step 6: User gets scared and agrees to verify
Step 7: Scammer asks for sensitive data (OTP, PIN, card number)
Step 8: User provides information or tries to verify
Step 9: Scammer thanks them and ends (or asks for more)
Step 10: User realizes it might be a scam OR completes the transaction

FIRST MESSAGE FORMAT:
[SCAMMER - HH:MM]
"Unusual activity detected on your PayPal/Bank/Amazon account! Verify immediately or it will be locked!" or similar urgent alert

MESSAGE STYLE:
- Scammer: Professional start, then increasingly urgent, emotional
- Uses phrases: "for your security", "unusual activity", "immediate action required"
- References: Account number (masked), transaction amounts, real company names
- Creates FALSE AUTHORITY: "I'm calling from [Bank/Company] security team"
- User: Confused initially, then cooperative, asks clarifying questions

TONE GUIDELINES:
- Start formal/official, become urgent/panicked
- Mix technical jargon with emotional appeals
- Use time pressure: "This will expire in 24 hours"
- Reference specific transactions or accounts (make them realistic)
- Acknowledge user concerns but dismiss them ("This is standard procedure")

MESSAGE FORMAT (STRICT):
1. Each message 1-2 sentences MAX
2. Use realistic timestamps that increment by 1-3 minutes
3. NO emojis in scammer messages (looks professional)
4. User CAN use casual language
5. **ALWAYS START WITH SCAMMER MESSAGE**
6. Alternate: SCAMMER → USER → SCAMMER → USER...

OUTPUT FORMAT:
[SCAMMER - HH:MM] ← MUST START HERE
urgent security alert message here (short, professional)

[USER - HH:MM]
message here (casual, concerned, questioning)

...continue alternating for 10+ messages...

[PAYMENT_BLOCK or VERIFICATION_BLOCK]
Service: [Bank/Amazon/Google/PayPal name]
Alert: Account Verification Required
Action: OTP/Card verification needed
Link: https://verify-secure-[service].com/urgent
Code: Required

CRITICAL RULES:
✓ **SCAMMER SPEAKS FIRST - ALWAYS**
✓ Stay in character as fake bank/company rep
✓ Each message from scammer has specific ask (verification, OTP, card, etc.)
✓ User should be gullible but occasionally suspicious
✓ Messages should feel natural like real WhatsApp chat
✓ Build urgency gradually (not all at once)
✓ Reference real services and realistic amounts
✓ Make user feel they have a problem that needs fixing

DO NOT:
✗ Start with USER message - SCAMMER MUST INITIATE
✗ Use generic responses
✗ Miss the verification/urgency angle
✗ Make messages too long
✗ Break character
✗ Repeat same message twice
✗ Mix multiple scam types

GENERATE NOW - **SCAMMER SENDS URGENT FIRST MESSAGE** - Create ONE complete cybersecurity scam chat with 10+ message exchanges:"""

# NOTE: All chats are DYNAMICALLY GENERATED via AI. No predefined/hardcoded fallback chats.
# Every conversation is unique and real-time generated.


class ChatMessage:
    """Represents a single chat message"""
    def __init__(self, sender: str, timestamp: str, content: str):
        self.sender = sender  # "SCAMMER" or "USER"
        self.timestamp = timestamp  # "15:18"
        self.content = content

    def to_dict(self) -> Dict[str, str]:
        return {
            "sender": self.sender,
            "timestamp": self.timestamp,
            "content": self.content
        }


class PaymentBlock:
    """Represents the payment block with link and QR"""
    def __init__(self, link: str, amount: str, qr_text: str = "[SCAN_QR_CODE]"):
        self.link = link
        self.amount = amount
        self.qr_text = qr_text

    def to_dict(self) -> Dict[str, str]:
        return {
            "link": self.link,
            "amount": self.amount,
            "qr": self.qr_text,
            "cta": "PAY NOW"
        }


class ChatScenario:
    """Complete chat scenario with messages and payment block"""
    def __init__(self, messages: List[ChatMessage], payment_block: PaymentBlock):
        self.messages = messages
        self.payment_block = payment_block
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "created_at": self.created_at,
            "messages": [msg.to_dict() for msg in self.messages],
            "payment_block": self.payment_block.to_dict()
        }


async def generate_whatsapp_chat(emotion_type: str = "relative_emergency") -> ChatScenario:
    """
    Generate a UNIQUE, DYNAMIC WhatsApp-style scam chat using AI in real-time.
    NO predefined or hardcoded conversations - every call generates fresh content.
    
    Args:
        emotion_type: Type of emotional scam (relative_emergency, friend_trouble, etc.)
    
    Returns:
        ChatScenario object with dynamically generated messages and payment block
        
    Raises:
        RuntimeError if AI/Groq is not configured
    """
    if not client or not groq_available:
        error_msg = groq_error_message or "OpenRouter not configured"
        log.error(f"❌ Cannot generate chat: {error_msg}")
        raise RuntimeError(f"Chat generation unavailable: {error_msg}. Please configure OPENAI_API_KEY or OPENROUTER_API_KEY.")

    # MASSIVE scenario pool - 40+ UNIQUE scenarios across different scam types
    # Ensures NO repetition even after multiple playthroughs
    scenarios = [
        # FAMILY EMERGENCY SCAMS (Different family members, locations, hospitals, amounts)
        "Mom had a motorcycle accident in Bangalore, needs immediate surgery at Apollo Hospital, ₹24,000 for procedure",
        "Dad arrested in Delhi for drunk driving, needs bail money ₹18,000 from a lawyer",
        "Brother stuck in Dubai after passport lost, money stolen, needs ₹22,000 urgently",
        "Sister hospitalized in Mumbai with appendix rupture, Lilavati Hospital ICU, ₹28,000 needed",
        "Cousin in London had flight accident, injured, needs ₹32,000 for hospital and flight back",
        "Uncle in accident in Pune, admitted to Ruby Hall, needs ₹16,000 for surgery",
        "Aunt in fraud issue, caught in Ponzi scheme, needs ₹21,000 to withdraw trapped money",
        "Grandma admitted to ICU in Chennai, cardiac emergency, ₹35,000 needed immediately",
        "Friend's son failed medical entrance exam, admission cancelled, needs ₹15,000 for coaching restart",
        "Sister's wedding guest emergency - relative had accident, needs ₹19,000 for medical bills",
        "Nephew in Hyderabad had food poisoning incident, hospitalized, Max Hospital, ₹11,000 needed",
        "Niece's college fees emergency, forgot to pay, college threatening expulsion, ₹13,000 urgent",
        "Father-in-law in Kolkata had heart attack, AIIMS emergency room, ₹38,000 needed",
        "Mother admitted in Gurgaon with dengue, isolation ward, ₹14,000 for treatment",
        "Younger brother involved in accident at Bangalore, motorbike crash, ₹17,000 for treatment",
        
        # TECH/CYBERSECURITY SCAMS (Banks, Email, Payment services)
        "Your SBI Bank account shows unusual activity from Hong Kong, account will be frozen in 24 hours",
        "Amazon Prime account compromised, charges of ₹2,999/month unauthorized, verify immediately",
        "PayPal flagged suspicious login from Russia, confirm identity with card details urgently",
        "Your Gmail account accessed from Nigeria, change password now to avoid account loss",
        "ICICI Bank credit card blocked due to fraud, call fraud department to unblock",
        "Google Play Store charged ₹5,999 for unAuthorized game purchase, refund needs verification",
        "Apple ID locked due to security alert in China, unlock with 2FA code immediately",
        "Your UPI linked to wrong account, Paytm flagged fraudulent transaction of ₹50,000",
        "Venmo account showing $2000 transfer to unknown account, emergency reversal needed now",
        
        # GOVERNMENT/AUTHORITY IMPERSONATION
        "Income Tax Department detected evasion in your 2023 returns, fine of ₹50,000 due immediately",
        "Police Department - you're implicated in robbery case in Pune, bail bond ₹30,000 needed",
        "Traffic Police challan issued for your car, unpaid fines ₹8,500, license suspension in 48 hours",
        "RBI notice - your PAN linked to money laundering, compliance fee ₹25,000 to clear name",
        "Election Commission - voter ID fraud detected, clarification fee ₹5,000 to avoid legal action",
        "Customs Department - your online purchase flagged for customs, clearance fee ₹12,000",
        
        # PRIZE/LOTTERY/REWARD SCAMS  
        "You've WON ₹10 lakh in Flipkart mega lottery draw! Claim now, processing fee ₹2,999",
        "Dream11 fantasy league - you won ₹5 lakh, withdraw account needs verification ₹1,500",
        "Jio rewards claim - you're selected for ₹15,000 winners list, activation fee ₹999",
        "Netflix shows you've won free 1-year subscription gift card worth ₹5,999, claim fee ₹499",
        "Mobile carrier bonus - you won ₹50,000 recharge voucher, activation charge ₹1,000",
        
        # JOB RECRUITMENT SCAMS
        "Got job offer from Google for ₹25 lakh salary, company wants ₹15,000 for background check",
        "McKinsey wants to hire you at ₹30,000/month remote, documentation fee ₹5,000 needed",
        "Amazon is hiring - your profile selected, background verification fee ₹3,000 required",
        "Microsoft job interview passed - onboarding fee ₹8,000 for uniform and equipment",
        "Goldman Sachs offers ₹50,000/month job - compliance check fee ₹6,000 to finalize",
        
        # CRYPTO/INVESTMENT SCAMS
        "Blockchain investment opportunity - invest ₹10,000 now, guaranteed 300% return in 30 days",
        "Bitcoin trading signal group - limited spots available, membership fee ₹5,000",
        "Dogecoin pump-and-dump - insider information, early access costs ₹20,000",
        "NFT marketplace - rare digital art drops, whitelist access ₹7,500 per spot",
        "Ethereum mining pool - guaranteed income ₹50,000/month, startup capital ₹25,000",
        
        # ROMANCE/RELATIONSHIP SCAMS
        "I'm stranded in Thailand, my credit card blocked, need ₹30,000 to get home",
        "My daughter needs emergency liver transplant, medical fees ₹2,00,000 needed urgently",
        "Our family business is bankrupt, I need ₹50,000 to restart operations next month",
        
        # UTILITY/SERVICE SCAMS
        "Electricity Department - outstanding bill ₹8,500, supply will be disconnected tomorrow",
        "Water Authority - illegal connection detected, penalty ₹12,000 within 48 hours",
        "Gas Department - safety audit found illegal meter, fine ₹6,000 to avoid disconnection"
    ]
    
    random_scenario = random.choice(scenarios)
    log.info(f"🎲 CHAT SCENARIO SELECTION")
    log.info(f"📋 Selected: {random_scenario[:60]}...")
    log.info(f"📦 Total scenarios available: {len(scenarios)}")
    
    # Select the right prompt based on emotion type
    if emotion_type == "cybersecurity":
        selected_prompt = CYBERSECURITY_CHAT_PROMPT
    else:
        # Add the random scenario to the master prompt for MORE uniqueness
        selected_prompt = f"""{MASTER_CHAT_PROMPT}

SPECIAL SCENARIO FOR THIS CHAT:
{random_scenario}
Create a realistic conversation around THIS scenario, not others."""

    # 🔥 ADD UNIQUENESS SEED to force completely different responses
    import time
    uniqueness_seed = int(time.time() * 1000) % 100000
    selected_prompt += f"\n\n🎲 UNIQUENESS CHECKPOINT #{uniqueness_seed}:\nGenerate a COMPLETELY DIFFERENT chat from any previous generation. Use novel names, amounts, details, and conversational patterns. Make this chat UNIQUE and REALISTIC."

    try:
        log.info(f"🤖 Generating WhatsApp chat (emotion_type={emotion_type}, seed={uniqueness_seed})")
        
        # Model selection
        model = "llama-3.3-70b-versatile"  # GROQ model
        
        response = await _call_groq_with_retry(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": selected_prompt
                }
            ],
            max_tokens=1800,
            temperature=0.97,
            top_p=0.99,
            frequency_penalty=1.0,
            presence_penalty=0.6
        )
        
        chat_text = response.choices[0].message.content.strip()
        log.info(f"✅ Generated WhatsApp chat via GROQ ({len(chat_text)} chars, type={emotion_type})")
        log.info(f"📄 Raw response from GROQ:\n{chat_text}")
        
        scenario = _parse_chat_response(chat_text)
        return scenario

    except RuntimeError as e:
        error_msg = str(e)
        log.error(f"❌ Chat generation failed: {error_msg}")
        raise RuntimeError(error_msg)
    except asyncio.TimeoutError as e:
        error_msg = f"Chat generation timeout (20s)"
        log.error(f"⏱️ {error_msg}: {e}")
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Chat generation failed: {type(e).__name__}: {e}"
        log.error(f"❌ {error_msg}")
        raise RuntimeError(error_msg)


def _parse_chat_response(chat_text: str) -> ChatScenario:
    """Parse OpenRouter response into ChatScenario"""
    messages: List[ChatMessage] = []
    payment_block: Optional[PaymentBlock] = None
    
    log.debug(f"📝 Parsing chat response ({len(chat_text)} chars):\n{chat_text[:500]}...")
    
    lines = chat_text.split('\n')
    current_sender = None
    current_timestamp = None
    current_content = ""
    
    for line in lines:
        stripped = line.strip()
        
        # Parse payment block
        if "[PAYMENT_BLOCK]" in stripped:
            payment_block = _extract_payment_block(lines[lines.index(line):])
            break
        
        # Parse message header: [SCAMMER - 15:18] or [USER - 15:18]
        if stripped.startswith("[SCAMMER - ") or stripped.startswith("[USER - "):
            # Save previous message
            if current_sender and current_content.strip():
                msg = ChatMessage(current_sender, current_timestamp, current_content.strip())
                messages.append(msg)
                log.debug(f"  ✅ Parsed: [{current_sender} - {current_timestamp}] {msg.content[:60]}...")
            
            # Extract sender and timestamp more carefully
            close_bracket_idx = stripped.find("]")
            if close_bracket_idx > 0:
                if stripped.startswith("[SCAMMER - "):
                    current_sender = "SCAMMER"
                    current_timestamp = stripped[11:close_bracket_idx].strip()  # Extract between "[SCAMMER - " and "]"
                    current_content = stripped[close_bracket_idx + 1:].strip()  # Get content after ]
                else:
                    # [USER - ...
                    current_sender = "USER"
                    current_timestamp = stripped[7:close_bracket_idx].strip()  # Extract between "[USER - " and "]"
                    current_content = stripped[close_bracket_idx + 1:].strip()  # Get content after ]
            else:
                continue
        else:
            # Accumulate message content (including empty lines for multi-line messages)
            if current_sender:
                if stripped and current_content:
                    current_content += "\n" + stripped
                elif stripped:
                    current_content = stripped
    
    # Save last message
    if current_sender and current_content.strip():
        msg = ChatMessage(current_sender, current_timestamp, current_content.strip())
        messages.append(msg)
        log.debug(f"  ✅ Parsed (last): [{current_sender} - {current_timestamp}] {msg.content[:60]}...")
    
    log.info(f"📊 Total messages parsed: {len(messages)}")
    if messages:
        log.info(f"📝 First message sample: {messages[0].content[:80]}...")
    
    # Ensure we have payment block
    if not payment_block:
        payment_block = PaymentBlock(
            link="https://pay-secure-help.me/emergency123",
            amount="₹15000",
            qr_text="[SCAN_QR_CODE]"
        )
    
    return ChatScenario(messages, payment_block)


def _extract_payment_block(lines: List[str]) -> PaymentBlock:
    """Extract payment block from lines"""
    link = "https://pay-secure-help.me/emergency123"
    amount = "₹15000"
    qr = "[SCAN_QR_CODE]"
    
    for line in lines:
        line = line.strip()
        if line.startswith("Link:"):
            link = line.replace("Link:", "").strip()
        elif line.startswith("Amount:"):
            amount = line.replace("Amount:", "").strip()
        elif line.startswith("QR:"):
            qr = line.replace("QR:", "").strip()
    
    return PaymentBlock(link, amount, qr)


async def generate_next_chat_message(
    current_messages: List[Dict[str, str]],
    last_sender: str = "USER",
    scam_type: str = "relative_emergency"
) -> Dict[str, str]:
    """
    Generate the NEXT UNIQUE message in an ongoing conversation dynamically.
    This creates realistic, flowing chat progression during gameplay.
    EVERY message is AI-generated - NO template responses or predefined fallbacks.
    
    Args:
        current_messages: List of previous messages in conversation
        last_sender: Who sent the last message ("USER" or "SCAMMER")
        scam_type: Type of scam - "relative_emergency" or "cybersecurity"
    
    Returns:
        Single message dict with sender, timestamp, content
        
    Raises:
        RuntimeError if AI/Groq is not configured
    """
    if not client or not groq_available:
        error_msg = groq_error_message or "OpenRouter not configured"
        log.error(f"❌ Cannot generate next message: {error_msg}")
        raise RuntimeError(f"Chat generation unavailable: {error_msg}. Please configure OPENROUTER_API_KEY.")

    try:
        # Build conversation context with more detail
        conversation_context = "Previous messages in conversation:\n"
        for msg in current_messages[-6:]:  # Keep last 6 messages for better context
            conversation_context += f"[{msg['sender']} - {msg['timestamp']}]\n{msg['content']}\n\n"
        
        next_sender = "SCAMMER" if last_sender == "USER" else "USER"
        
        # Select and customize prompt based on scam type
        if scam_type == "cybersecurity":
            system_prompt = f"""You are continuing a cybersecurity scam chat. Continue the conversation naturally.

CONTEXT:
{conversation_context}

NEXT SPEAKER: {next_sender}
SCAM TYPE: {scam_type}

If {next_sender} is SCAMMER:
- Continue building urgency or shift to new verification step
- Ask for specific information (OTP, card details, password confirmation)
- Reference what user already said to sound natural
- Keep messages SHORT (1-2 sentences max)
- Sound like official bank/company support
- Add timestamp that's 1-3 minutes after last message

If {next_sender} is USER:
- React naturally to scammer's request (confusion, concern, or compliance)
- Ask clarifying questions OR provide partial information
- Show you're being slowly convinced
- Keep it realistic (people do fall for these)

OUTPUT ONLY:
[{next_sender} - HH:MM]
message content"""
        else:
            system_prompt = f"""You are continuing a relative emergency scam chat. Continue the conversation naturally.

CONTEXT:
{conversation_context}

NEXT SPEAKER: {next_sender}

If {next_sender} is SCAMMER:
- Increase emotional pressure OR request the money/payment
- Reference what user said
- Use urgent, emotional language
- SHORT messages (1-2 sentences max)
- Realistic timestamps (1-3 min apart)

If {next_sender} is USER:
- React with concern/confusion
- Show willingness to help OR hesitation
- Ask questions
- Keep casual, human tone

OUTPUT ONLY:
[{next_sender} - HH:MM]
message content"""

        log.info(f"🤖 Generating next message via GROQ (scam_type={scam_type}, sender={next_sender})...")
        response = await _call_groq_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt}
            ],
            max_tokens=220,
            temperature=0.75
        )
        
        message_text = response.choices[0].message.content.strip()
        log.info(f"✅ Generated next message via GROQ")
        return _parse_single_message(message_text, next_sender)

    except RuntimeError as e:
        error_msg = str(e)
        log.error(f"❌ Next message generation failed: {error_msg}")
        raise RuntimeError(error_msg)
    except asyncio.TimeoutError as e:
        error_msg = f"Next message generation timeout (20s)"
        log.error(f"⏱️ {error_msg}: {e}")
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Next message generation failed: {type(e).__name__}: {e}"
        log.error(f"❌ {error_msg}")
        raise RuntimeError(error_msg)


def _parse_single_message(text: str, sender: str) -> Dict[str, str]:
    """Parse a single message response"""
    lines = text.split('\n')
    timestamp = "15:30"  # Default
    content = ""
    
    for line in lines:
        if f"[{sender} - " in line:
            timestamp = line.replace(f"[{sender} - ", "").replace("]", "").strip()
        else:
            content += (("\n" + line) if content else line).strip()
    
    return {
        "sender": sender,
        "timestamp": timestamp,
        "content": content or "..."
    }
