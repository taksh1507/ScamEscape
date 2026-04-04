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

Generate 5-7 urgent WhatsApp messages AS {persona_name} ONLY:

Message 1 — Emergency opener: Start with "{style['opener']}" then immediately describe YOUR crisis
Message 2 — Make it more real: Add specific details about YOUR situation (location, time pressure)
Message 3 — Secrecy request: "please don't tell anyone yet", "keep this between us", "don't share this with anyone"
Message 4 — Money ask: Specify exact amount {style['amount']} and WHY you need it
Message 5 — Payment: [Send Money Now](https://upi-fake.com) — "this is the safest way right now"
Message 6 — Guilt if needed: "I can't believe you're doubting me when I'm in THIS situation"
Message 7 — Final push: More desperation, "please I'm running out of time"

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
Generate 5-7 realistic WhatsApp scam messages that:
1. Open by introducing yourself as "{institution} Security Team"
2. Claim suspicious activity on the customer's {institution} account
3. Build urgency (account will be frozen in 30 minutes)
4. Ask for OTP / card CVV / net-banking password
5. Include 2-3 malicious links like [Verify {institution} Account](https://fake-{institution.lower().replace(' ', '-')}.com)
6. Threaten permanent account suspension if ignored
Return ONLY a valid JSON array of strings.
""",
                ScammerType.DELIVERY_COMPANY: f"""
You are a convincing DELIVERY SCAMMER posing as a {institution} delivery agent.
IMPORTANT: Every message must reference {institution} — no other company.
Generate 5-7 WhatsApp scam messages that:
1. Open with "{institution} Delivery Alert"
2. Claim package held due to address mismatch or customs fee
3. Demand small payment to release the package
4. Add time pressure (returns to warehouse in 2 hours)
5. Include links like [Pay {institution} Delivery Fee](https://fake-{institution.lower().replace(' ', '-')}.com)
6. Ask for card / UPI details to process payment
Return ONLY a valid JSON array of strings.
""",
                ScammerType.FRIEND_CONTACT: """
You are posing as a CLOSE FRIEND in a money emergency.
Generate 5-7 urgent, emotional WhatsApp scam messages.
CRITICAL: Skip greetings — jump straight to the EMERGENCY.
Flow:
1. Emergency opener ("Bro I'm in BIG trouble")
2. Crisis story (accident, theft, arrest, stranded)
3. Specific rupee amount (₹20,000–₹1,00,000)
4. "You're the only one I can ask"
5. Payment link [Send Money Now](https://upi-fake.com)
6. Emotional escalation if doubted
Use casual language, urgency markers (ASAP, RIGHT NOW), and occasional typos.
Return ONLY a valid JSON array of strings.
""",
                ScammerType.GOVERNMENT_OFFICIAL: f"""
You are a convincing GOVERNMENT SCAMMER posing as an officer from {institution}.
IMPORTANT: Every message must reference {institution} — no other agency.
Generate 5-7 WhatsApp scam messages that:
1. Open with "Official Notice from {institution}"
2. Allege tax evasion, illegal transaction, or customs violation
3. Threaten arrest / asset seizure within 24 hours
4. Demand payment of a "penalty" to avoid legal action
5. Include links like [Pay {institution} Fine](https://fake-govt-portal.com)
6. Ask for Aadhaar / PAN / bank details for "verification"
Use formal bureaucratic language. Return ONLY a valid JSON array of strings.
""",
                ScammerType.TECH_SUPPORT: f"""
You are a convincing TECH SUPPORT SCAMMER posing as {institution} support.
IMPORTANT: Every message must claim to be from {institution} — no other company.
Generate 5-7 WhatsApp scam messages that:
1. Open with "Alert from {institution} Security"
2. Claim malware / ransomware detected on the device
3. Offer to fix remotely via a screen-share tool
4. Demand payment for "advanced {institution} security licence"
5. Include links like [Download {institution} Removal Tool](https://fake-support.com)
6. Request bank / card details to "process the licence"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.INVESTMENT_ADVISOR: f"""
You are a convincing INVESTMENT SCAMMER posing as an advisor from {institution}.
IMPORTANT: Every message must reference {institution} — no other firm.
Generate 5-7 WhatsApp scam messages that:
1. Open with "Exclusive offer from {institution}"
2. Promise 30–50% monthly returns on a "limited scheme"
3. Create FOMO (only 10 spots left, closing tonight)
4. Ask for initial investment transfer
5. Include links like [Join {institution} Scheme](https://invest-fake.com)
6. Provide fake portfolio screenshots or "proof of returns"
Return ONLY a valid JSON array of strings.
""",
                ScammerType.TELECOM_OPERATOR: f"""
You are a convincing TELECOM SCAMMER posing as a {institution} executive.
IMPORTANT: Every message must reference {institution} — no other operator.
Generate 5-7 WhatsApp scam messages that:
1. Open with "Important notice from {institution}"
2. Offer free 6-month plan upgrade or bill waiver
3. Ask the user to verify identity (share OTP)
4. Claim unauthorized usage detected on the account
5. Include links like [Claim {institution} Offer](https://fake-offer.com)
6. Ask for account PIN / SIM serial to "process upgrade"
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