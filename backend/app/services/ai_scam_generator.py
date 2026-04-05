"""
AI-Based Scam Message Generator - Optimized with consistent institution names
"""

import json
import os
import random
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI

from app.core.config import settings
from app.constants.whatsapp_types import ScammerType
from app.utils.logger import get_logger

log = get_logger(__name__)

api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
base_url = settings.GROQ_BASE_URL

if api_key:
    log.info(f"✅ GROQ_API_KEY loaded (starts with: {api_key[:10]}...)")
else:
    log.error("❌ GROQ_API_KEY not found!")

client = AsyncOpenAI(
    api_key=api_key or "missing_key",
    base_url=base_url
)

# ── Institution name pools ────────────────────────────────────────────────────
INSTITUTION_POOLS: Dict[str, List[str]] = {
    ScammerType.BANK_AGENT.value: [
        "HDFC Bank", "SBI", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank"
    ],
    ScammerType.DELIVERY_COMPANY.value: [
        "Amazon", "Flipkart", "Delhivery", "BlueDart", "Ekart Logistics"
    ],
    ScammerType.GOVERNMENT_OFFICIAL.value: [
        "Income Tax Department", "GST Council", "TRAI", "Ministry of Finance", "CBI"
    ],
    ScammerType.TECH_SUPPORT.value: [
        "Microsoft", "Apple Support", "Google", "Norton", "McAfee"
    ],
    ScammerType.INVESTMENT_ADVISOR.value: [
        "Zerodha Advisory", "Groww Premium", "Angel One", "Motilal Oswal", "IIFL Securities"
    ],
    ScammerType.TELECOM_OPERATOR.value: [
        "Airtel", "Jio", "Vi (Vodafone Idea)", "BSNL", "MTNL"
    ],
}

# ── Persona pools for RELATIVE_CONTACT ───────────────────────────────────────
RELATIVE_PERSONAS = ["Sister", "Brother", "Mom", "Dad", "Uncle", "Cousin"]

PERSONA_STYLES: Dict[str, Dict[str, str]] = {
    "Sister": {
        "opener": "Bhaiya / Didi it's me!!!",
        "tone": "panicked, crying, uses 'please' a lot, feminine urgency",
        "sign_off": "your sister",
        "emergency": random.choice([
            "I got robbed outside college, they took everything",
            "I had an accident, I'm at the hospital alone",
            "My laptop got stolen with all my documents",
        ]),
        "amount": random.choice(["₹40,000", "₹60,000", "₹80,000"]),
    },
    "Brother": {
        "opener": "Bro / Dude it's me",
        "tone": "stressed, informal, uses 'bro' and 'man', direct",
        "sign_off": "your bro",
        "emergency": random.choice([
            "I'm stuck abroad, cards not working",
            "Got into a fight, need bail money urgently",
            "Accident happened, need money for hospital",
        ]),
        "amount": random.choice(["₹50,000", "₹75,000", "₹1,00,000"]),
    },
    "Mom": {
        "opener": "Beta it's Mom",
        "tone": "maternal, worried, uses 'beta', very emotional",
        "sign_off": "your mom",
        "emergency": random.choice([
            "Your father had a heart attack, need money for treatment",
            "There's a family emergency, can't explain now",
            "I'm at the hospital, need money immediately",
        ]),
        "amount": random.choice(["₹1,00,000", "₹1,50,000", "₹2,00,000"]),
    },
    "Dad": {
        "opener": "Son / Daughter, it's Dad",
        "tone": "authoritative but desperate, formal language, direct",
        "sign_off": "Dad",
        "emergency": random.choice([
            "Business emergency, need immediate cash",
            "Legal trouble, need bail urgently",
            "Medical emergency for your mother",
        ]),
        "amount": random.choice(["₹1,00,000", "₹2,00,000", "₹3,00,000"]),
    },
    "Uncle": {
        "opener": "Beta it's Uncle",
        "tone": "formal, plays on family duty and respect",
        "sign_off": "your uncle",
        "emergency": random.choice([
            "Got trapped in a legal matter, need urgent help",
            "Business deal gone wrong, need emergency funds",
        ]),
        "amount": random.choice(["₹2,00,000", "₹3,00,000"]),
    },
    "Cousin": {
        "opener": "Hey it's your cousin",
        "tone": "panicked, casual, close friendship tone",
        "sign_off": "your cousin",
        "emergency": random.choice([
            "Got mugged, stranded without cash or phone",
            "Accident on highway, need money for hospital",
        ]),
        "amount": random.choice(["₹50,000", "₹1,00,000"]),
    },
}


def pick_institution(scammer_type: ScammerType) -> str:
    pool = INSTITUTION_POOLS.get(scammer_type.value, ["Unknown Agency"])
    return random.choice(pool)


def pick_persona() -> str:
    """Pick ONE random family persona — locked for entire session."""
    return random.choice(RELATIVE_PERSONAS)


class AIScamGenerator:

    @staticmethod
    def _build_scenario_prompt(
        scammer_type: ScammerType,
        institution: str,
        difficulty: str,
        player_name: Optional[str],
        persona_name: Optional[str] = None,
    ) -> str:

        # ── RELATIVE_CONTACT gets its own fully locked prompt ─────────────────
        if scammer_type == ScammerType.RELATIVE_CONTACT:
            style = PERSONA_STYLES.get(persona_name, PERSONA_STYLES["Sister"])
            prompt = f"""
You are IMPERSONATING ONLY: {persona_name}

🔒 ABSOLUTE IDENTITY LOCK - YOU ARE {persona_name} ONLY:

FORBIDDEN - NEVER write these in ANY message:
- Names: Uncle, Aunty, Aunt, Cousin, Mom, Mother, Dad, Father, Brother, Sister, Bhaiya, Didi, Chacha, Chachi, Mummy, Papa, Bhai, Behen
- Titles: "my uncle", "my brother", "my father", "dad called", "mom said", "uncle told me" 
- Any mention of OTHER family members helping, telling you, or being involved
- Any salutation meant for other relatives: "Bhaiya", "Didi", "Bhai", "Behen"

YOU ONLY EXIST - NEVER REFERENCE OTHERS:
- This is YOUR emergency (arrest, accident, robbery, medical)
- Use ONLY "I", "me", "my" perspective
- NEVER say "Uncle got arrested" or "Father said call you" — YOU are in trouble
- NEVER write "Bhaiya/Didi it's me" — you're {persona_name}, not calling yourself by title

IF YOU ARE {persona_name}:
- {persona_name} is speaking FIRST-PERSON only
- Emergency belongs to {persona_name}, not explained by others
- {persona_name} needs money for {persona_name}'s situation
- Sign off as: {style['sign_off']}

- Your tone: {style['tone']}
- Your emergency situation: {style['emergency']}
- Amount needed: {style['amount']}

Generate 10-15 DETAILED WhatsApp messages AS {persona_name} ONLY (each message 2-3 sentences):

Message 1 — Emergency opener with context: Start with "{style['opener']}" then provide full details of YOUR emergency and why it happened
Message 2 — Build urgency: Add specific location, time (which hospital/police station/place), who else is involved, and time constraints
Message 3 — Emotional escalation: Express panic, fear, or desperation about the situation. Make it feel REAL
Message 4 — Request secrecy: "please don't tell anyone yet", "keep this between us", "Mom/Dad can't know", "nobody can help except you"
Message 5 — Money amount revealed: Mention exact amount {style['amount']} casually first
Message 6 — Explain WHY money needed: "need to pay the hospital", "bail money", "they won't let me go until..."
Message 7 — More pressure: Add details like "they're threatening to...", "if I don't pay soon...", "they said I have 1 hour"
Message 8 — Ask for confirmation: "can you send it right now?", "you can do this for me right?"
Message 9 — Guilt/emotional manipulation: "I can't believe I have to ask you this", "I never thought I'd be in this situation"
Message 10 — Payment method: Suggest UPI/bank transfer with the link [Send Money Now](https://upi-fake.com)
Message 11 — Reassurance (but false): "I'll pay you back immediately", "this is just temporary"
Message 12 — More desperation: "please don't make me wait", "every second counts", "I'm so scared"
Message 13 — Second attempt if hesitation implied: Re-emphasize crisis details with more emotional intensity
Message 14 — Final emotional plea: "you're my only hope", "I trust only you", "please help me"
Message 15 — Last chance pressure: "I'm running out of time", "they're asking where the money is", "please confirm you'll send it"

STYLE RULES:
- Write EXACTLY like {persona_name} would text — their vocabulary, their panic level
- Use ALL CAPS for key urgent words
- Multiple !!! is fine
- Occasional typos to show panic
- Short punchy messages like real WhatsApp

Return ONLY a valid JSON array of strings — no other text.
"""
        else:
            # ── All other types ───────────────────────────────────────────────
            base = {
                ScammerType.BANK_AGENT: f"""
You are a convincing BANK SCAMMER posing as a security officer from **{institution}**.
IMPORTANT: You MUST only say you are calling from {institution} — never mention any other bank.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences):
1. Open with professional greeting: "Hello, this is {institution} Security Team calling regarding suspicious activity on your account"
2. Build credibility: Mention specific account details, recent transactions that look legitimate
3. Create fear: "We've detected 7 unauthorized login attempts from Moscow and Dubai" — provide specific numbers and locations
4. Add urgency: "Your account will be permanently frozen in 45 minutes if we don't verify your identity immediately"
5. First credential request: Ask for OTP received on phone, explain it's for "verification purposes only"
6. Increase pressure: "We've also detected a ₹2,50,000 transfer being processed right now — is this you?"
7. Second credential request: Ask for card CVV "to block the fraudulent transaction"
8. Reassurance tactic: "Don't worry, this is standard protocol, we help customers like this every day"
9. More scary details: "7 cards linked to your account are at risk. We need your net-banking password to secure them"
10. Provide malicious link: [Verify {institution} Account Immediately](https://fake-{institution.lower().replace(' ', '-')}.com) — "This is our secure portal"
11. Time pressure intensifies: "You have 20 minutes before system locks permanently — this is time-sensitive"
12. False authority: "I'm Officer Kumar from the Security Department, ID #445829, and I personally need your cooperation"
13. Guilt/social pressure: "Most customers cooperate immediately. We need your response to proceed"
14. Multiple attempts: "Let me transfer you to our verification team... actually, just send the OTP again to be safe"
15. Final urgency: "This is the last chance to save your account. After this, you'll need to visit the branch with 5 documents"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.DELIVERY_COMPANY: f"""
You are a convincing DELIVERY SCAMMER posing as a {institution} delivery agent.
IMPORTANT: Every message must reference {institution} — no other company.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences):
1. Open with official alert: "{institution} Delivery Alert - Your package from vendor 'ElectroWorld' has arrived at our facility"
2. Add problem: "Unfortunately, customs has placed a hold on your package due to incomplete declaration. The item declared costs don't match shipping duty"
3. Provide order details: "Your Order #45892 (₹2,890 iPhone stand) is currently at our Mumbai warehouse. We need your clearance to proceed"
4. Request action: "You need to pay the customs fee of ₹399 to release your package. This is a standard government regulation"
5. Create urgency: "Important: Your package returns to the warehouse tomorrow at 6 PM. After that, it'll be auctioned by customs"
6. Make it personal: "The amount is very small — just ₹399 — but without payment we cannot release it to you immediately"
7. Provide payment link: "Please pay via this link immediately: [Pay {institution} Customs Fee](https://fake-{institution.lower().replace(' ', '-')}.com)"
8. Add legitimacy: "This is a {institution} verified payment portal. Your payment receipt will be your customs clearance"
9. Pressure on time: "We process customs clearance only until 5 PM today. Payment must be done in the next 30 minutes"
10. Ask for details: "Provide your order ID and last 4 digits of your card so we can attach payment to your package"
11. Reassurance: "Don't worry, {institution} payment is 100% secure. Thousands of customers do this daily for customs holds"
12. Second nudge: "Have you completed the payment? Your package is sitting in delivery queue and will expire in 45 minutes"
13. Create doubt: "If you don't pay, the customs auction fee is ₹1,200. Better to pay ₹399 now"
14. Increase pressure: "I can see 5 other packages ahead of yours. If you don't pay in 10 minutes, you'll go to the back of the queue"
15. Final push: "The address on file is {some-area}. If someone else picks up your package due to expired hold, {institution} won't be responsible"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.FRIEND_CONTACT: """
You are posing as a CLOSE FRIEND in a money emergency.
Generate 10-15 DETAILED, emotional WhatsApp scam messages (each 2-3 sentences).
CRITICAL: Skip greetings — jump straight to the EMERGENCY with full details.
Flow:
1. Emergency opener: "Bro I'm in BIG trouble RIGHT NOW. I was in a bad accident at the highway. They're blaming me and threatening to call the police!"
2. Context building: "I don't know what to do man. This cop is standing right here. He says they need ₹50,000 for the damage to the other car or he's taking me to the station"
3. Emotional escalation: "I'm so scared bro. They're not letting me leave. The injured person is threatening to sue me for everything I have"
4. Make it real: "The police guy says if I pay now he can settle this. Otherwise there's a case against me and I'll lose my job"
5. You're the only one: "I can't tell my parents — they'll kill me. You're the only one who can help me right now"
6. Specific amount: "I need exactly ₹50,000. Not a rupee less. That's what they asked for. You have this right?"
7. Time pressure: "Dude I'm running out of time. They gave me 30 minutes. After that they're filing the report and it becomes official"
8. Backup story: "I already called Rohit and Priya but they didn't answer. Their phones are off. You're my last hope bro"
9. Payment method: "You can send it via UPI. My friend Vikram's number is on my account: [Send Money Now](https://upi-fake.com). ASAP please"
10. Reassurance: "I'll pay you back in 2 days max. My salary comes on 15th. This is just emergency help. You know I won't forget this"
11. Emotional guilt: "I can't believe I'm asking you this. I feel so ashamed bro. I never thought I'd be in this situation"
12. More desperation: "The cop is asking me to transfer the money now. They're using my phone. PLEASE send it now"
13. Fake authority: "My lawyer (Vikram's dad) says I HAVE to pay to avoid legal proceedings. He's helping me pro bono"
14. Second attempt: "Have you sent it? PLEASE tell me you sent it. They're literally standing over my shoulder RIGHT NOW"
15. Final pressure: "I'm begging you bro. This is life or death situation. Once I pay and it's settled I'll explain everything. JUST SEND NOW PLEASE!!!"
Use casual language, urgency markers (ASAP, RIGHT NOW), occasional typos, and varying caps.
Return ONLY a valid JSON array of strings.
""",
                ScammerType.GOVERNMENT_OFFICIAL: f"""
You are a convincing GOVERNMENT SCAMMER posing as an officer from {institution}.
IMPORTANT: Every message must reference {institution} — no other agency.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences, formal bureaucratic tone):
1. Open with official notice: "OFFICIAL NOTICE: {institution} has detected irregular financial activity in your account. You are required to respond within 24 hours or face legal proceedings"
2. Cite specific violation: "Our records show you have received ₹5,50,000 from international sources without proper ITR filing. This violates the Foreign Assets Declaration Act"
3. Create fear: "Your PAN card (XXXX1234) has been flagged for investigation. Failure to respond will result in immediate asset freeze and criminal charges"
4. Add authority: "This is Case #GVT-2024-445829 filed by the Tax Evasion Division. Inspector Parekh has been assigned to your case for prosecution"
5. Provide "proof": "According to our system, your last ITR filing showed income of ₹6,25,000 but bank deposits show ₹12,00,000. This 92% discrepancy is under scrutiny"
6. Increase urgency: "You have EXACTLY 24 hours to respond. After this period, asset seizure proceedings will commence and your mobile/internet will be blocked"
7. Demand penalty: "To settle this matter outside court, you must pay a compliance penalty of ₹85,000. This will close the case immediately"
8. Make it formal: "Payment must be made to the {institution} Settlement Portal. This is the only legal way to avoid criminal prosecution"
9. Provide payment link: "Complete payment here: [Pay {institution} Compliance Fine](https://fake-govt-portal.com). Your case reference will be generated upon payment"
10. Ask for verification: "We require your Aadhaar number, PAN, and last 4 digits of bank account for case closure documentation"
11. Pressure with consequences: "Non-compliance will trigger: (1) Asset freeze (2) Travel ban (3) Criminal investigation (4) Bank account suspension within 48 hours"
12. Add false legitimacy: "Cross-verification with {institution} database shows 47 similar cases resolved this month. This is the standard compliance procedure"
13. Create doubt: "Your employer will be intimated of this investigation on Day 2 if you don't respond. This affects your job security"
14. Second notice: "This is URGENT. We have authorized {institution} to block your account if settlement is not made within 12 hours"
15. Final deadline: "Your last chance to avoid legal action is in the next 6 hours. After that, the case moves to criminal court and bailout becomes impossible"
Use formal, legal-sounding bureaucratic language throughout.
Return ONLY a valid JSON array of strings.
""",
                ScammerType.TECH_SUPPORT: f"""
You are a convincing TECH SUPPORT SCAMMER posing as {institution} support.
IMPORTANT: Every message must claim to be from {institution} — no other company.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences):
1. Open with security alert: "🚨 ALERT: {institution} Security has detected CRITICAL ransomware on your device. Your data is at HIGH RISK. Do NOT ignore this message."
2. Add technical details: "Our security scan shows Trojan.Cerber.A virus with 47 malicious files. Your banking apps and passwords are being monitored by hackers right now"
3. Create urgency: "Your device will be ENCRYPTED in 2 hours if not cleaned. You'll lose all files and photos permanently. {institution} recommends immediate action"
4. Provide "solution": "Download the {institution} Security Remover Tool to eliminate the threat: [Download {institution} Removal Tool](https://fake-support.com). This takes 10 minutes"
5. Add legitimacy: "This is the OFFICIAL {institution} tool. Microsoft endorses this antivirus for emergency ransomware removal. You need this NOW"
6. Request action: "Once you download and run the tool, hackers will be blocked. Your data will be secured automatically. Installation is automatic"
7. Mention payment: "After installation, you'll be prompted to upgrade to {institution} Premium Security License for ₹3,999. This blocks future attacks"
8. Build urgency again: "IMPORTANT: Your browser history shows 12 suspicious login attempts. Someone in Pakistan tried accessing your bank account 3 times"
9. Add fear: "The virus also installed a keylogger. Every password you type is being sent to hackers. Upload your banking app screenshot so we can verify damage"
10. Create fake verification: "For our records, please provide: Credit card number, CVV, and last 4 digits so we can file an emergency security report"
11. Pressure about time: "The 2-hour window is closing. We have identified the attacker's location (Ukraine) and are blocking their access but YOU need to act NOW"
12. Second attempt: "Have you downloaded the tool yet? The threat level is now CRITICAL. Your {institution} account is vulnerable"
13. Make it personal: "7 of your contacts were also targeted. We've sent them alerts. You should warn them and activate emergency protection NOW"
14. Add false authority: "I'm Tech Agent Sharma from {institution} Premium Support. Case ID #SUP-2024-8834. I personally need your cooperation to save your device"
15. Final pressure: "After I process your Premium License payment, I'll remotely secure your device. This is the last chance before automatic encryption happens. Time is UP"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.INVESTMENT_ADVISOR: f"""
You are a convincing INVESTMENT SCAMMER posing as an advisor from {institution}.
IMPORTANT: Every message must reference {institution} — no other firm.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences):
1. Open with exclusive offer: "Congratulations! You've been selected for {institution}'s Exclusive Investment Plan — Limited spots only. This quarter we're offering 38% guaranteed returns"
2. Build credibility: "Our portfolio includes pharma stocks, IT companies, and commodity futures. We've paid 45% returns last quarter to 2,847 successful investors"
3. Add legitimacy: "{institution} is SEBI registered and approved. All investments are insured by ICICI General Insurance up to ₹1 crore. This is 100% official"
4. Create FOMO: "URGENT: Only 10 slots remaining in the Premium Investor Club. We're closing this offer tonight at 9 PM. After that, minimum investment goes from ₹50,000 to ₹5,00,000"
5. Share "proof": "Last investor (Rajesh from Pune) got ₹2,18,000 return on ₹1,50,000 in just 3 months. I'm attaching his portfolio screenshot for verification [link]"
6. Mention requirements: "Minimum investment is ₹50,000. We manage everything. You just enjoy the returns. Money gets deposited to your account every month"
7. Explain mechanism: "The scheme works by combining short-term and long-term derivatives. Our AI algorithm guarantees profits even during market downturns. Zero loss strategy"
8. Add social proof: "You know Vikram Singh (your neighbor)? He invested ₹1,00,000 last month and already received ₹38,000 returns. He refers everyone now"
9. Provide payment link: "To secure your slot, transfer your investment here: [Join {institution} Scheme](https://invest-fake.com). Registration closes in 4 hours"
10. Ask for verification: "We need your PAN, Aadhaar, and bank account details. This is for KYC compliance and setting up your return deposits"
11. Reduce hesitation: "If you're worried about risk, 99.7% of our investors have never lost money. Even if markets crash, we have hedge funds protecting your principal"
12. Pressure with scarcity: "Only 2 slots left now. 5 people confirmed in the last hour. Last chance to lock in 38% returns this quarter"
13. Build trust: "My own family invested ₹10,00,000. My mother alone got ₹3,80,000 returns last quarter. I wouldn't recommend this if I wasn't confident"
14. Second nudge: "Have you transferred? Your slot expires in 1 hour. We can't reserve it beyond tonight. First come first served basis"
15. Final push: "Congratulations! Once payment clears, your investor dashboard will be active tomorrow. You'll see real-time returns updating daily. Welcome to guaranteed wealth!"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.TELECOM_OPERATOR: f"""
You are a convincing TELECOM SCAMMER posing as a {institution} executive.
IMPORTANT: Every message must reference {institution} — no other operator.
Generate 10-15 DETAILED WhatsApp scam messages (each 2-3 sentences):
1. Open with special offer: "🎉 SPECIAL OFFER: {institution} is offering you FREE 6-month premium upgrade + unlimited data. This is a limited-time exclusive for you!"
2. Add legitimacy: "Your account (Number ending in 7849) has been selected based on loyalty criteria. You've been a {institution} customer for 3+ years so you qualify"
3. Create urgency: "This offer expires TODAY. We're only giving this to 500 customers. Click [Claim {institution} Offer](https://fake-offer.com) to activate immediately"
4. Add security concern: "ALERT: We detected 13 unauthorized international calls from your number in the last 24 hours. Your account might be compromised"
5. Increase worry: "Someone used your SIM in Myanmar, Dubai, and Turkey. We blocked it but need your verification to reactivate your account"
6. Request verification: "For security verification, please share the OTP we just sent to your number. This will confirm you're the legitimate customer"
7. Ask for credentials: "We also need your account PIN (last 4 digits) to lock your SIM and prevent unauthorized usage. Standard security protocol"
8. Provide more "proof": "According to our system, someone tried to port your number to another operator. We've stopped it but you need to verify immediately"
9. Offer solution: "Once you verify, we'll give you: (1) ₹500 free talk time (2) 50 GB free data (3) Free calls to any network for 6 months"
10. Build pressure: "Your account will be automatically suspended in 2 hours if not verified. This is for your own security to prevent SIM hijacking"
11. Ask for SIM details: "Please provide your SIM serial number (printed on SIM card). This registers you as authorized user and activates all premium benefits"
12. Add false authority: "I'm {institution} Account Verification Officer - ID #TL4829. I'm personally handling your case to ensure quick resolution"
13. Make it urgent: "The unauthorized calls total ₹45,000 in international charges. If you verify now, we'll waive all charges as customer goodwill"
14. Second attempt: "Have you verified your OTP yet? We need immediate action. The charges are increasing every hour someone uses your stolen SIM"
15. Final push: "Transfer your account to this number: [Verify Now](https://fake-offer.com) and all premium benefits activate instantly. You're all set for 6 months free!"
Return ONLY a valid JSON array of strings.
""",
            }
            prompt = base.get(scammer_type, base[ScammerType.BANK_AGENT])

        # ── Difficulty modifier ───────────────────────────────────────────────
        if difficulty == "hard":
            prompt += "\nMake messages VERY realistic — perfect grammar, no obvious red flags."
        elif difficulty == "easy":
            prompt += "\nInclude obvious red flags (spelling errors, suspicious links, unrealistic promises)."
        else:
            prompt += "\nModerate realism — a few subtle red flags visible on close inspection."

        if player_name:
            prompt += f"\nPersonalize by occasionally using the name '{player_name}'."

        prompt += "\nRespond ONLY with a valid JSON array of strings — no other text, no markdown."
        return prompt

    # ── Public API ────────────────────────────────────────────────────────────

    @staticmethod
    async def generate_scam_scenario(
        scammer_type: ScammerType,
        difficulty: str = "medium",
        player_name: Optional[str] = None,
        institution: Optional[str] = None,
        persona_name: Optional[str] = None,  # caller should lock this at session start
    ) -> tuple[List[str], str, Optional[str]]:
        """
        Returns (messages, institution_name, persona_name).
        For RELATIVE_CONTACT: persona_name is the locked family member (e.g. "Sister").
        Pass ALL three back into every followup call.
        """
        resolved_institution = institution or pick_institution(scammer_type)

        # ── Lock persona at session start for RELATIVE_CONTACT ────────────────
        resolved_persona = persona_name
        if scammer_type == ScammerType.RELATIVE_CONTACT and not resolved_persona:
            resolved_persona = pick_persona()
            log.info(f"🔒 Persona locked to: {resolved_persona}")

        # ── Build system message ──────────────────────────────────────────────
        if scammer_type == ScammerType.RELATIVE_CONTACT and resolved_persona:
            system_msg = (
                f"You are ONLY impersonating {resolved_persona} — a family member in crisis. "
                f"NEVER mention any other family member. "
                f"NEVER switch persona. Every message is from {resolved_persona} only. "
                f"Respond ONLY with a valid JSON array of strings."
            )
        else:
            system_msg = (
                f"You are an expert generating realistic scam scenarios for anti-fraud training. "
                f"You are ALWAYS posing as someone from {resolved_institution}. "
                f"Never mention any other institution. "
                f"Respond ONLY with a valid JSON array of strings."
            )

        try:
            prompt = AIScamGenerator._build_scenario_prompt(
                scammer_type, resolved_institution, difficulty, player_name, resolved_persona
            )

            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                max_tokens=1000,
                timeout=10,
            )

            content = response.choices[0].message.content.strip()
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            messages = json.loads(content)
            if isinstance(messages, list):
                messages = [str(m) for m in messages if m]
                if messages:
                    log.info(
                        f"Generated {len(messages)} messages for {scammer_type.value} "
                        f"institution='{resolved_institution}' persona='{resolved_persona}'"
                    )
                    return messages, resolved_institution, resolved_persona

        except Exception as e:
            log.error(f"Error generating scam scenario: {e}")

        return [], resolved_institution, resolved_persona

    # ── Followup ──────────────────────────────────────────────────────────────

    @staticmethod
    async def generate_followup_message(
        scammer_type: ScammerType,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        context MUST include:
          - 'institution'    (from generate_scam_scenario)
          - 'persona_name'   (from generate_scam_scenario, RELATIVE_CONTACT only)
          - 'conversation_history'  (last 6 turns as formatted string)
        """
        last_message         = context.get("last_player_message", "")
        user_sentiment       = context.get("user_sentiment", "neutral")
        institution          = context.get("institution", pick_institution(scammer_type))
        persona_name         = context.get("persona_name")          # ← locked persona
        conversation_history = context.get("conversation_history", "No prior conversation.")

        scammer_type_str = context.get("scammer_type", "bank_agent")
        if isinstance(scammer_type_str, str):
            scammer_type_str = scammer_type_str.lower().replace("scammertype.", "").strip()

        # ── Resolve identity string used in all prompts ───────────────────────
        # For family scams the "institution" is the persona name
        identity = persona_name if scammer_type_str == "relative_contact" and persona_name else institution

        # ── Hard-coded fast-path objection handlers ───────────────────────────
        objection_map = {
            "tech_support": {
                "no|dont|don't|skip|later": (
                    f"Your device is being LOCKED by ransomware RIGHT NOW! "
                    f"Call {identity} Support immediately: "
                    f"[Emergency Fix](https://support-fake.com)"
                ),
                "why|how|explain": (
                    f"{identity} detected 3 unauthorized login attempts today. "
                    f"Scan now: [View Threat Report](https://scan.fake.com)"
                ),
            },
            "bank_agent": {
                "no|dont|don't": (
                    f"Sir, your {identity} account will be FROZEN in 5 minutes! "
                    f"Verify instantly: [Secure Account](https://fake-{identity.lower().replace(' ', '-')}.com)"
                ),
                "why|how": (
                    f"We detected ₹85,000 debit attempt on your {identity} account. "
                    f"Block it NOW: [Emergency Block](https://bank-verify.fake.com)"
                ),
            },
            "relative_contact": {
                "no|dont|don't": (
                    f"Please don't say no! I'm your {identity} and I'm BEGGING you! "
                    f"They will hurt me if you don't help!"
                ),
                "why|how|explain": (
                    f"I can't explain on text! Just trust me, I'm your {identity}! "
                    f"Send the money PLEASE, I'll explain everything later!"
                ),
                "fake|scam|not you": (
                    f"How can you think I'm fake?! I'm your {identity}! "
                    f"Call me back but use a different number — mine got taken!"
                ),
            },
            "friend_contact": {
                "no|dont|don't": "Dude I'm literally at the hospital right now. PLEASE just this once!",
                "why|how": "No time to explain bro! Send money ASAP: [Quick UPI](https://upi-fake.com)",
            },
            "telecom_operator": {
                "no|dont|don't": (
                    f"Your {identity} SIM will be deactivated in 10 minutes! "
                    f"[Verify Now](https://telecom-verify.fake.com)"
                ),
            },
            "investment_advisor": {
                "no|dont|don't": (
                    f"Last slot closing in 2 hours! {identity} scheme closes tonight. "
                    f"[Join Now](https://invest-fake.com)"
                ),
            },
        }

        last_lower = last_message.lower()
        for pattern, reply in objection_map.get(scammer_type_str, {}).items():
            if any(word in last_lower for word in pattern.split("|")):
                return {
                    "message": reply,
                    "typing_delay_ms": random.randint(800, 2000),
                }

        # ── Build system message locked to identity ───────────────────────────
        if scammer_type_str == "relative_contact" and persona_name:
            system_msg = (
                f"You are ONLY {persona_name} — a family member in an emergency. "
                f"NEVER mention any other family member by name or role. "
                f"Every message is from {persona_name} only. "
                f"Write ONE short WhatsApp message (1-2 lines). "
                f"Respond with ONLY the message text."
            )
        else:
            system_msg = (
                f"You are an aggressive scammer representing {identity}. "
                f"Never mention any other company or bank. "
                f"Generate ONE short, urgent response (max 2 sentences). "
                f"Respond with ONLY the message text."
            )

        # ── Sentiment strategy ────────────────────────────────────────────────
        sentiment_strategy = {
            "skeptical":   "User is skeptical. Provide fake proof, reassurance, and escalate urgency.",
            "naive":       "User is compliant. Push urgency and demand immediate action.",
            "questioning": "User is asking questions. Answer convincingly with fake evidence.",
            "defensive":   "User blocked/reported you. Escalate emotional pressure.",
            "neutral":     "User is neutral. Continue normal scam flow.",
        }
        strategy = sentiment_strategy.get(user_sentiment, sentiment_strategy["neutral"])

        # ── AI prompt with conversation history ───────────────────────────────
        if scammer_type_str == "relative_contact" and persona_name:
            style = PERSONA_STYLES.get(persona_name, PERSONA_STYLES["Sister"])
            prompt = f"""
ABSOLUTE RULE: YOU ARE ONLY {persona_name.upper()} — NEVER SWITCH OR MENTION OTHER FAMILY MEMBERS

Your identity: {persona_name}
Your emergency: {style['emergency']}
Amount needed: {style['amount']}
Tone: {style['tone']}

=== CONVERSATION SO FAR ===
{conversation_history}
===========================

Player just said: "{last_message}"
Their sentiment: {user_sentiment}
Strategy: {strategy}

Write ONE message as {persona_name} ONLY (1-2 lines) that:
1. Directly responds to what they just said
2. YOU ARE {persona_name} — NEVER say "Uncle told me", "Dad called", "Bhaiya/Didi it's me", "Cousin said"
3. NEVER mention other family: Mom, Dad, Uncle, Aunty, Brother, Sister, Cousin, Bhaiya, Didi, Bhai, Behen, Chacha, Chachi, Mummy, Papa
4. SPEAK ONLY AS {persona_name} in first person: only "I", "me", "my"
5. If they doubt you: "I swear I'm really {persona_name}! It's really me!" (NO OTHER NAMES)
6. Escalate emotional urgency based on sentiment
7. Keep it short and panicked

Return ONLY the message text.
"""
        else:
            prompt = f"""
You are a {scammer_type_str} scammer representing {identity}.
NEVER mention any other institution — only {identity}.

=== CONVERSATION SO FAR ===
{conversation_history}
===========================

Player just said: "{last_message}"
Sentiment: {user_sentiment}
Strategy: {strategy}

Write ONE followup message (1-2 sentences) that:
1. Directly responds to what they just said
2. References {identity} by name
3. Escalates urgency
4. Includes a malicious link if appropriate

Return ONLY the message text.
"""

        try:
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.9,
                max_tokens=200,
                timeout=5,
            )

            message = response.choices[0].message.content.strip().strip("\"'")
            if "\n" in message:
                message = message.split("\n")[0]

            return {
                "message": message,
                "typing_delay_ms": random.randint(800, 2000),
            }

        except Exception as e:
            log.warning(f"Followup generation failed: {e}")

        # ── Fallback ──────────────────────────────────────────────────────────
        if scammer_type_str == "relative_contact" and persona_name:
            fallback = (
                f"Please I'm begging you! I'm your {persona_name} and I need help RIGHT NOW! "
                f"[Send Money](https://upi-fake.com)"
            )
        else:
            fallbacks = {
                "bank_agent": (
                    f"Your {identity} account is PERMANENTLY BLOCKED in 3 minutes! "
                    f"[Verify Now](https://fake-{identity.lower().replace(' ', '-')}.com)"
                ),
                "tech_support": (
                    f"CRITICAL: {identity} detected ransomware on your device! "
                    f"[Emergency Fix](https://support.fake.com)"
                ),
                "friend_contact": "Dude I'm at the police station RIGHT NOW! ₹50,000 bail — PLEASE! [Send](https://upi-fake.com)",
                "telecom_operator": (
                    f"Your {identity} number will be CANCELLED in 10 minutes! "
                    f"[Verify SIM](https://telecom-verify.fake.com)"
                ),
                "investment_advisor": (
                    f"Last {identity} slot closing NOW! "
                    f"[Invest Immediately](https://invest-fake.com)"
                ),
            }
            fallback = fallbacks.get(scammer_type_str, "URGENT: Act immediately or lose everything!")

        return {
            "message": fallback,
            "typing_delay_ms": random.randint(1000, 1500),
        }