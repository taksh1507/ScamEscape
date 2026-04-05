"""
ai_service.py

Generates dynamic scam scenarios and phase-specific call responses using Groq/LLaMA.
Each scenario includes: caller, script, question, options, and correct_answer.
All content is in ENGLISH, but with Indian company/organization context.
"""

import json
import random
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from app.constants.scenario_types import CallPhase
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Initialize Groq client (compatible with OpenAI API)
client = None
if settings.GROQ_API_KEY:
    try:
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL
        )
        log.info(f"✅ GROQ AI Client initialized successfully (API key length: {len(settings.GROQ_API_KEY)})")
    except Exception as e:
        log.error(f"❌ Failed to initialize GROQ client: {e}")
        client = None
else:
    log.warning("⚠️ GROQ_API_KEY not found. AI features disabled - using mock generator.")

# 🔥 REALISTIC FAMILY MEMBER NAMES & SCENARIOS FOR RELATIVE IMPERSONATION SCAMS
FAMILY_MEMBER_SCENARIOS = {
    "Mom": {
        "relationships": ["beta", "son", "daughter"],
        "emergencies": [
            "Your father met with a car accident",
            "Your sister had a medical emergency",
            "Your brother is in jail and needs bail money",
            "Your uncle is hospitalized and needs urgent surgery",
        ],
        "amounts": ["₹2,00,000", "₹1,50,000", "₹3,00,000"],
        "tone": "caring but urgent, uses terms of endearment",
    },
    "Dad": {
        "relationships": ["beta", "son", "daughter"],
        "emergencies": [
            "Your mother is hospitalized",
            "Your business had a loss and we need emergency help",
            "Your cousin got arrested and needs bail",
        ],
        "amounts": ["₹1,00,000", "₹2,50,000", "₹5,00,000"],
        "tone": "authoritative but desperate, gives instructions",
    },
    "Brother": {
        "relationships": ["brother", "sister"],
        "emergencies": [
            "I'm stuck abroad and my cards don't work",
            "I met an accident and need medical money immediately",
            "I'm trapped in a legal case and need bail urgently",
        ],
        "amounts": ["₹50,000", "₹75,000", "₹1,00,000"],
        "tone": "casual but stressed, uses informal language like 'bro', 'dude'",
    },
    "Sister": {
        "relationships": ["brother", "sister"],
        "emergencies": [
            "I'm out of the country and my boyfriend stole my wallet",
            "Medical emergency while traveling, need money now",
            "Laptop got stolen with all my documents, need money",
        ],
        "amounts": ["₹30,000", "₹60,000", "₹80,000"],
        "tone": "panicked and crying, emotionally manipulative",
    },
    "Uncle": {
        "relationships": ["nephew", "niece"],
        "emergencies": [
            "Family business has serious problem, need investment",
            "Got trapped in legal case, need bribe money urgently",
        ],
        "amounts": ["₹2,00,000", "₹3,00,000"],
        "tone": "formal but urgent, plays on family responsibility",
    },
    "Cousin": {
        "relationships": ["cousin"],
        "emergencies": [
            "Accident happened, need emergency money",
            "Got kidnapped by goons, they want ransom",
        ],
        "amounts": ["₹50,000", "₹1,00,000"],
        "tone": "panicked and desperate",
    },
}

# Common emergency scenarios to make them feel absolutely real
REALISTIC_EMERGENCIES = [
    {
        "situation": "Car accident",
        "injuries": "Serious head injury, internal bleeding",
        "hospital": "Apollo / Fortis / Max Hospital",
        "cost": "₹2-3 lakhs for ICU treatment",
    },
    {
        "situation": "Medical emergency abroad",
        "injuries": "Severe food poisoning / appendix rupture",
        "hospital": "Foreign hospital (Dubai / Singapore)",
        "cost": "₹3-5 lakhs for emergency treatment",
    },
    {
        "situation": "Legal/bail emergency",
        "injuries": "Arrested for traffic violation / fraud case",
        "hospital": "Police station / Court bail needed",
        "cost": "₹1-2 lakhs for bail amount",
    },
    {
        "situation": "Robbery/theft",
        "injuries": "Robbed at gunpoint, no cash or cards",
        "hospital": "Stranded in foreign country",
        "cost": "₹50,000 - ₹1 lakh for travel home",
    },
]


def get_random_family_member() -> str:
    """Get a random family member name for relative impersonation scam.
    🔥 CONSISTENCY: Persona is selected ONCE at game start and locked throughout.
    This function is only called once per Round 2 game."""
    return random.choice(list(FAMILY_MEMBER_SCENARIOS.keys()))

# 🔥 SCAMMER TYPES - 50+ DIVERSE TYPES FOR TRULY DYNAMIC CALLS
# Ensures players get completely different scenarios every playthrough
SCAMMER_TYPES = [
    # BANKING SCAMS (10)
    ("SBI Bank", "Account verification, fraudulent transaction alert"),
    ("HDFC Bank", "Credit card fraud, account locked notification"),
    ("ICICI Bank", "Suspicious login detected, verification required"),
    ("Axis Bank", "Account safety alert, unusual activity"),
    ("YES Bank", "Transaction verification, account security"),
    ("Kotak Mahindra Bank", "Identity verification required"),
    ("Bank of Baroda", "Account compromise alert"),
    ("PNB Bank", "Fraudulent transaction detected"),
    ("Canara Bank", "Security verification needed"),
    ("Union Bank of India", "Account anomaly detected"),
    
    # FINTECH/WALLET SCAMS (8)
    ("Paytm", "Wallet verification, payment blocked"),
    ("Google Pay", "UPI account compromise alert"),
    ("PhonePe", "Payment method verification needed"),
    ("Amazon Pay", "Linked credit card verification"),
    ("WhatsApp Pay", "Account security verification"),
    ("BHIM App", "Digital payment verification required"),
    ("Airtel Payments", "Account access verification"),
    ("Mobikwik", "Wallet balance alert verification"),
    
    # E-COMMERCE SCAMS (8)
    ("Flipkart", "Order verification, account security alert"),
    ("Amazon India", "Account compromise, order cancellation"),
    ("Myntra", "Payment method verification required"),
    ("Swiggy", "Suspicious order detected, verify account"),
    ("Zomato", "Payment profile verification needed"),
    ("OLX", "Account security alert"),
    ("Snapdeal", "Order verification required"),
    ("Nykaa", "Account breach notification"),
    
    # GOVERNMENT SCAMS (12)
    ("Income Tax Department", "IT notice, tax evasion detected"),
    ("Police Department", "Criminal complaint filed against you"),
    ("TDS Authority", "Tax deducted at source refund verification"),
    ("GST Department", "GST filing overdue, compliance notice"),
    ("Customs Department", "Import duty alert, clearance needed"),
    ("RTO/Traffic Police", "Vehicle registration penalty, license suspension"),
    ("Aadhaar Authority", "Identity verification required"),
    ("Election Commission", "Voter ID discrepancy found"),
    ("SEBI", "Stock market trading violation detected"),
    ("CBI", "Fraud investigation alert"),
    ("Ministry of Labour", "Employment record verification"),
    ("Municipal Corporation", "Property tax payment overdue"),
    
    # TELECOM/UTILITIES (8)
    ("Jio", "Outstanding bill, number deactivation alert"),
    ("Airtel", "Unpaid recharge, service suspension notice"),
    ("VI (Vodafone)", "Account balance verification"),
    ("BSNL", "Landline bill payment, service cut"),
    ("MTNL", "Billing verification required"),
    ("Electricity Department", "Outstanding bill, connection cut-off"),
    ("Water Authority", "Water supply suspension alert"),
    ("Gas Department", "Meter inspection, safety alert"),
    
    # TECH/CYBERSECURITY SCAMS (10)
    ("Microsoft Support", "Windows malware detected, system locked"),
    ("Apple Support", "iCloud account compromise alert"),
    ("Google Security", "Gmail account breach detected"),
    ("Facebook Security", "Account suspicious activity, verification"),
    ("Instagram", "Account compromised, password reset"),
    ("Netflix", "Payment method verification required"),
    ("PlayStation Network", "Account security alert"),
    ("Amazon Web Services", "Unauthorized access detected"),
    ("Zoom Security", "Account takeover attempt detected"),
    ("Norton Antivirus", "Virus threat detected, purchase protection"),
    
    # TRAVEL/BOOKING SCAMS (8)
    ("MakeMyTrip", "Flight booking verification"),
    ("Goibibo", "Hotel reservation verification needed"),
    ("Agoda", "Booking confirmation alert"),
    ("OYO", "Room booking verification"),
    ("Ixigo", "Flight ticket verification"),
    ("Cleartrip", "Travel booking confirmation"),
    ("Air India", "Flight ticket verification needed"),
    ("IRCTC", "Train ticket cancellation alert"),
    
    # INVESTMENT/CRYPTO SCAMS (8)
    ("Bitcoin Trading Group", "Investment opportunity, limited spots"),
    ("Stock Market Group", "Trading signal exclusive access"),
    ("Cryptocurrency Exchange", "Wallet verification required"),
    ("Forex Trading", "Account verification for trading"),
    ("Gold Investment", "Purchase verification alert"),
    ("Mutual Fund Platform", "KYC verification required"),
    ("Cryptocurrency ATM", "Account verification needed"),
    ("Investment Advisory", "Market tip exclusive access"),
    
    # JOB RECRUITMENT SCAMS (8)
    ("Google Recruitment", "Job interview follow-up, documentation"),
    ("Amazon Careers", "Background verification fee"),
    ("Microsoft Hiring", "Onboarding verification"),
    ("Goldman Sachs", "Employment verification needed"),
    ("McKinsey & Company", "Final interview status confirmation"),
    ("Accenture", "Document verification for hiring"),
    ("Infosys", "Joining verification alert"),
    ("TCS", "Background check verification"),
    
    # EDUCATION SCAMS (6)
    ("IIT/JEE Coaching", "Admission verification fee"),
    ("UPSC Coaching", "Course enrollment verification"),
    ("University Admission", "Document verification alert"),
    ("Online Course Platform", "Payment verification required"),
    ("Scholarship Committee", "Award verification required"),
    ("Exam Hall Ticket", "Verification alert"),
    
    # HEALTHCARE SCAMS (6)
    ("Apollo Hospital", "Medical record verification"),
    ("Max Healthcare", "Prescription verification alert"),
    ("Fortis Hospital", "Bill payment verification"),
    ("Johns Hopkins", "Medical report verification"),
    ("AIIMS", "Appointment confirmation alert"),
    ("Medanta Hospital", "Insurance verification needed"),
    
    # INSURANCE SCAMS (6)
    ("ICICI Prudential", "Policy verification needed"),
    ("LIC of India", "Insurance claim verification"),
    ("HDFC Life", "Policy document verification"),
    ("Bajaj Allianz", "Coverage verification alert"),
    ("Reliance Insurance", "Claim status verification"),
    ("SBI Life", "Premium payment verification"),
    
    # PROPERTY/REAL ESTATE SCAMS (6)
    ("Housing.com", "Property listing verification"),
    ("MagicBricks", "Property booking confirmation"),
    ("99acres", "Land deed verification"),
    ("Square Yards", "Real estate transaction alert"),
    ("Property Circle", "Listing verification needed"),
    ("Commonfloor", "Broker verification alert"),
    
    # UTILITY/SERVICE SCAMS (4)
    ("Electricity Dept SMS", "Bill pending, connection cut notice"),
    ("Water Supply", "Meter reading verification"),
    ("Broadband ISP", "Bill overdue, service suspension"),
    ("Cable TV Provider", "Recharge verification needed"),
]

SCENARIO_PROMPT_TEMPLATE = """
You are a creative scammer designing a realistic scam call scenario for a security training simulation in INDIA.
Generate a JSON object for a "{difficulty}" difficulty scam call. ALL CONTENT MUST BE IN ENGLISH ONLY.

🔥 CRITICAL - You MUST generate a "{scammer_type}" scam scenario ONLY (NOT any other type):
====================
{scammer_type}: {scammer_detail}
====================

⚠️ MANDATORY CHECK:
- The caller MUST be from {scammer_type} organization
- The script MUST ONLY discuss {scammer_type} related issues
- DO NOT mix this with any other scam type (e.g., no Bank content if generating Flipkart)
- DO NOT mention competing services or organizations
- If you catch yourself generating the wrong type, STOP and regenerate with ONLY {scammer_type}

🎲 UNIQUENESS REQUIREMENT (CRITICAL FOR REALISM):
You MUST create a COMPLETELY DIFFERENT scenario each time with UNIQUE details:
- Different names (don't use common names repeatedly)
- Different amounts (vary the currency values)
- Different timelines (vary the urgency deadlines - 10 min, 2 hours, by 6 PM, etc.)
- Different tactics (vary the pressure type - fraud threat, account freeze, points expiry, upgrade needed, etc.)
- Different specific details (company department, reference numbers, specific issues)
- Different emotional angles (fear of loss, excitement from opportunity, authority pressure)

YOUR TASK: Create a UNIQUE AND REALISTIC Indian scam scenario for this specific scammer type above.
- NEVER mix scammer types
- NEVER deviate from the assigned type
- Create ORIGINAL content (NOT generic or repeated patterns)
- Make this scenario DIFFERENT from standard scams

Rules:
1. Act as the scammer. Use ENGLISH throughout. Include Indian cultural context and organizations.
2. Use INDIAN names and organizations (SBI, HDFC, Flipkart, Jio, Income Tax, Police, specific company names)
3. The script must have 4-6 lines in ENGLISH:
   - Introduction (greeting, mention specific Indian organization)
   - Problem (suspicious activity, account/service issue, urgent action needed)
   - Urgency/Threat (specific deadline, consequences, what will happen)
   - Action Request (specific details they want - OTP, card, Aadhar, UPI, phone number)
4. Format: Use standard English with authentic Indian context
5. Difficulty scaling:
   - Easy: Obvious grammar mistakes, obvious threats, obvious red flags
   - Medium: Natural English, realistic scenarios, moderate pressure tactics
   - Hard: Fluent professional English, subtle manipulation, uses authority language
6. BE CREATIVE: Each generation must be DIFFERENT - vary the details, amounts, deadlines, stories
7. Output MUST be valid JSON with ENGLISH content

Example for SBI Bank scam:
"Script line 1: Hello, this is Vikram from SBI Bank fraud prevention team..."
"Script line 2: We detected unauthorized access to your SBI account from a different city..."
"Script line 3: Your SBI account will be frozen within 20 minutes if we don't verify immediately..."
"Script line 4: Please share your SBI card CVV and 6-digit OTP to reactivate your account..."

Example for HDFC Bank scam:
"Script line 1: Hi, this is Priya from HDFC Bank security department..."
"Script line 2: Your HDFC account shows suspicious transactions, possibly fraudulent..."
"Script line 3: We must verify your identity in the next 15 minutes or block your HDFC card..."
"Script line 4: Confirm your HDFC net banking password and registered mobile number..."

Example for ICICI Bank scam:
"Script line 1: Hello, Rajesh speaking from ICICI Bank customer care..."
"Script line 2: Your ICICI Bank account has unusual activity detected from abroad..."
"Script line 3: If not verified by 6 PM today, your ICICI account access will be permanently disabled..."
"Script line 4: Please provide your ICICI card details and the OTP sent to your registered number..."

Example for FLIPKART/AMAZON scam:
"Script line 1: Hi, this is Amit from Flipkart customer service..."
"Script line 2: We found fraudulent activity on your Flipkart account, multiple orders flagged..."
"Script line 3: Your Flipkart account will be suspended in 15 minutes if we don't verify your identity..."
"Script line 4: Please confirm your Flipkart registered email and account password to reactivate..."

Example for APOLLO/MAX HOSPITAL scam:
"Script line 1: Hello, this is Dr. Sharma from Apollo Hospital..."
"Script line 2: Your prescription verification shows discrepancies in your medical records..."
"Script line 3: You must update your hospital registration within 24 hours or lose access to services..."
"Script line 4: Share your Aadhar number and insurance details to complete the verification..."

Example for TELECOM scam:
"Script line 1: Hi, this is Rajesh calling from Jio customer care..."
"Script line 2: Your Jio account shows unpaid bills totaling ₹8,500..."
"Script line 3: We must collect this today or your Jio number will be permanently deactivated..."
"Script line 4: You can pay via phone credit or share your account details for direct debit..."

Example for INCOME TAX scam:
"Script line 1: Namaste, this is Officer Sharma from Income Tax Department..."
"Script line 2: Our records show you have a pending tax notice for the financial year 2023-24..."
"Script line 3: You must pay the fine of ₹45,000 within 24 hours or face legal action..."
"Script line 4: Share your bank account details or visit our fake portal to pay immediately..."

🔥 ABSOLUTE RULE - CHECK YOUR RESPONSE:
Before returning JSON, verify:
- Caller name matches the scammer type assigned above
- Script content ONLY discusses the assigned scammer type topic
- NO mixing of bank issues with Flipkart calls, or telecom with tax calls, etc.
- Script is UNIQUE with DIFFERENT details, amounts, tactics, and approaches
- You haven't used overly generic phrases that repeat every time
- If you generated the wrong type, DELETE that and start fresh with ONLY the correct type

JSON format:
{{
  "caller": "...(Indian organization + person name)...",
  "script": ["...(ENGLISH line 1)...", "...(ENGLISH line 2)...", "...(ENGLISH line 3)...", "...(ENGLISH line 4+)..."],
  "question": "...(ENGLISH - ask user what they would do)...",
  "options": ["...(ENGLISH option 1)...", "...(option 2)...", "...(option 3)...", "...(option 4)..."],
  "correct_answer": "...(ENGLISH - safest response)...",
  "tip": "...(ENGLISH - educational tip about this scam type)...",
  "red_flags": ["...(ENGLISH - red flag 1)...", "...(red flag 2)...", "...(red flag 3)..."]
}}
"""

RELATIVE_IMPERSONATION_PROMPT = """
🔥 FAMILY MEMBER IMPERSONATION - Most Emotionally Manipulative Scam

You are a scammer impersonating a family member in an urgent emergency, in a WHATSAPP CHAT.

🎯 CONTEXT:
- Persona: {persona_name} (e.g., "Mom", "Dad", "Brother", "Sister", "Uncle")
- Emergency: {emergency_situation}
- Amount needed: {emergency_amount}
- Your tone: {tone}
- Difficulty: {difficulty}

🔥 CRITICAL RULES:
1. ALWAYS use emotional manipulation (fear + love + urgency)
2. Act like EXACTLY like the family member - use their typical language
3. Play on emotions: "You're the only one who can help", "Don't tell anyone", "I trust you"
4. ONE message at a time (1-2 lines max) - like real WhatsApp desperate texting
5. Create immediate sense of panic and time pressure
6. DO NOT ask for verification - scammers won't ask family to verify
7. Apologize for not calling, make excuse for texting instead
8. Subtly ask them not to tell other family members "to avoid panic"

💬 EXAMPLE MESSAGES (DO NOT REPEAT):
❌ AVOID: "Beta, this is Mom. Your father had accident, need ₹2 lakhs."
✅ BETTER: "Oh god! Dad is hurt! I'm at hospital now 😭"
✅ BETTER: "Please don't tell anyone yet... the doctors need ₹2 lakhs by 10 PM"

📱 TONE BY DIFFICULTY:
- EASY: Very obvious manipulation, bad grammar, obviously fake family reference
- MEDIUM: Natural language, realistic scenario, emotional pressure
- HARD: Perfect family member dialogue, uses personal details, extremely convincing

RESPOND WITH ONE MESSAGE ONLY (like texting family in panic):
"""

PHASE_RESPONSE_PROMPT = """
⚙️ STRICT SINGLE-MESSAGE CHAT MODE WITH DYNAMIC & UNIQUE OPTIONS

You are a scammer in a REAL-TIME WHATSAPP CHAT simulation.

🔥 CRITICAL RULES (ENFORCE STRICTLY):
1. Return ONLY ONE short message (1-2 lines max)
2. NO multiple paragraphs or scenarios
3. NO listing different stories
4. Keep persona CONSISTENT - same name, same situation
5. Write like WhatsApp - natural typing style
6. Natural urgency but realistic tone
7. NEVER restart the conversation
8. NEVER repeat previous messages
9. 🎲 UNIQUENESS: Each response must be COMPLETELY DIFFERENT from previous ones
10. 🎲 NO TEMPLATES: Vary your pressure tactics, arguments, and approach
11. 🎲 BE CREATIVE: Use different reasons, timelines, and emotional appeals

📱 CHAT BEHAVIOR:
- Feel like real messaging, not formal letter
- Slight pressure but believable
- Use real WhatsApp language patterns
- Short and punchy
- 🎲 IMPORTANT: Vary your tone and approach - don't use the same pressure tactic twice

🎯 SCENARIO LOCK (NEVER CHANGE):
You are: {persona_name}
Situation: {scenario_locked}
Type: {scam_type}
Stage: {stage}

This is your ONLY scenario. Do NOT switch between different stories.
Use SPECIFIC details from this scenario to make responses unique.

👤 CONTEXT (for consistency):
- Player behavior: {behavior_profile}
- What they said: {last_player_message}
- Difficulty: {difficulty}
- Your tone: {tone}
- History: {history}

🎲 UNIQUENESS REQUIREMENTS:
- Don't repeat the same pressure angle (if you said "limited time", try "verification needed" next)
- Don't use the same numbers/amounts twice
- Don't repeat the same question twice
- Vary emotional appeals: urgency vs official requirement vs threat vs help/assistance
- Use scenario-specific details (actual organization names, specific amounts, real procedures)

🎮 DYNAMIC RESPONSE OPTIONS:
Generate 3-4 realistic VARIED player response options for this moment.
Each option represents a different strategy the player might use.
Options should be:
- CONTEXTUAL to your current message
- VARIED (not all high-risk or all safe)
- APPROPRIATE to difficulty level
- REALISTIC (not absurd or obvious)

📝 RESPOND WITH VALID JSON:
{{
  "message": "YOUR ONE SHORT MESSAGE HERE IN ENGLISH (max 2 lines, like WhatsApp) - MAKE IT UNIQUE AND SCENARIO-SPECIFIC",
  "typing_delay_ms": 1000,
  "suggested_actions": [
    {{"option": "First player response option (varied from others)", "risk_level": "high|medium|low", "tag": "dangerous|risky|cautious|safe", "explanation": "Why this is risky/safe", "better_action": "What they should do instead"}},
    {{"option": "Second player response option (different approach)", "risk_level": "high|medium|low", "tag": "dangerous|risky|cautious|safe", "explanation": "Why this is risky/safe", "better_action": "What they should do instead"}},
    {{"option": "Third player response option (third strategy)", "risk_level": "high|medium|low", "tag": "dangerous|risky|cautious|safe", "explanation": "Why this is risky/safe", "better_action": "What they should do instead"}},
    {{"option": "Hang up and report", "risk_level": "low", "tag": "safe", "explanation": "Disconnecting is the safest action.", "better_action": "Always the best choice"}}
  ]
}}

⚠️ DIFFICULTY MODIFIERS:
- EASY: Obvious risky options (share OTP, give passwords) vs safe options (call bank, hang up)
- MEDIUM: Mix of tempting but dangerous vs safe options
- HARD: All options seem reasonable but some are subtle traps

⚠️ EXAMPLE OUTPUT (vary from this each time):
{{
  "message": "Your account will be blocked in 10 minutes if not verified",
  "typing_delay_ms": 1500,
  "suggested_actions": [
    {{"option": "Share my OTP to verify", "risk_level": "high", "tag": "dangerous", "explanation": "Scammers use OTP to steal your account", "better_action": "Never share OTP with anyone"}},
    {{"option": "Call my bank directly", "risk_level": "low", "tag": "safe", "explanation": "Official verification through bank is secure", "better_action": "Always verify independently"}},
    {{"option": "Ask for employee ID", "risk_level": "medium", "tag": "cautious", "explanation": "Scammers can fake IDs easily", "better_action": "Call official bank number instead"}},
    {{"option": "Hang up and report", "risk_level": "low", "tag": "safe", "explanation": "Disconnecting prevents further manipulation", "better_action": "Report to your bank"}}
  ]
}}

🎲 NEXT RESPONSE MUST BE COMPLETELY DIFFERENT FROM ABOVE - CHANGE YOUR APPROACH!

RESPOND NOW WITH MESSAGE AND DYNAMIC OPTIONS:
"""

def _validate_scenario_matches_type(scenario_data: Dict[str, Any], expected_type: str) -> bool:
    """
    🔥 STRICT TYPE VALIDATION - Ensure generated scenario matches the selected scammer type.
    Prevents AI from generating the wrong scammer type by mistake.
    
    Returns: True if scenario matches expected type, False otherwise
    """
    try:
        caller = scenario_data.get("caller", "").lower()
        script = " ".join([str(s).lower() for s in scenario_data.get("script", [])])
        question = scenario_data.get("question", "").lower()
        full_content = f"{caller} {script} {question}"
        
        expected_type_lower = expected_type.lower()
        
        # Extract key keywords for each type
        type_keywords = {
            "sbi bank": ["sbi", "state bank"],
            "hdfc bank": ["hdfc"],
            "icici bank": ["icici"],
            "flipkart": ["flipkart", "amazon"],
            "income tax": ["income tax", "tax", "government"],
            "tech support": ["microsoft", "windows", "antivirus", "malware", "virus", "device", "computer"],
            "telecom": ["jio", "bsnl", "bill", "deactivat"],
            "paytm": ["paytm", "wallet", "payment"],
            "housing": ["housing", "property", "land"],
            "apollo": ["apollo", "hospital", "medical", "doctor", "prescription"],
            "electricity": ["electricity", "bill", "disconnect", "bses"],
        }
        
        # 🔥 STRICT REJECTION RULES - Incompatible types must never mix
        incompatible_pairs = [
            ("apollo", ["bank", "sbi", "hdfc", "icici", "flipkart", "paytm", "housing", "telecom", "electricity"]),  # Hospital stands alone
            ("housing", ["bank", "sbi", "hdfc", "icici", "hospital", "medical", "apollo", "paytm", "telecom", "electricity"]),  # Property stands alone
            ("telecom", ["bank", "sbi", "hdfc", "icici", "hospital", "apollo", "property", "housing", "wallet", "paytm"]),  # Telecom stands alone
            ("paytm", ["bank", "sbi", "hdfc", "icici", "hospital", "apollo", "property", "housing", "telecom", "electricity"]),  # Fintech stands alone
            ("flipkart", ["bank", "sbi", "hdfc", "icici", "hospital", "apollo", "paytm", "telecom", "electricity"]),  # Shopping stands alone
            ("sbi bank", ["icici", "hdfc", "flipkart", "paytm", "hospital", "apollo", "housing", "property", "telecom"]),  # SBI stands alone
            ("hdfc bank", ["sbi", "icici", "flipkart", "paytm", "hospital", "apollo", "housing", "property", "telecom"]),  # HDFC stands alone
            ("icici bank", ["sbi", "hdfc", "flipkart", "paytm", "hospital", "apollo", "housing", "property", "telecom"]),  # ICICI stands alone
            ("income tax", ["bank", "sbi", "hdfc", "icici", "flipkart", "paytm", "hospital", "apollo", "housing", "property", "telecom", "electricity", "account", "card", "otp"]),  # Income Tax stands alone, NO bank/financial keywords
            ("tech support", ["bank", "sbi", "hdfc", "icici", "hospital", "apollo", "housing", "telecom", "government", "tax", "account"]),  # Tech Support stands alone
        ]
        
        # Check for incompatible content
        expected_base = expected_type_lower.split()[0]  # "sbi bank" -> "sbi"
        
        for forbidden_type, forbidden_keywords in incompatible_pairs:
            if forbidden_type in expected_type_lower:
                for keyword in forbidden_keywords:
                    if keyword in full_content:
                        log.error(f"🚨 REJECTION: Expected '{expected_type}' but found '{keyword}' in content. Caller: {caller[:40]}")
                        return False
        
        # Find matching keywords in content
        expected_keywords = type_keywords.get(expected_type_lower, [expected_type_lower])
        content_has_type_keyword = any(keyword in full_content for keyword in expected_keywords)
        
        # If content doesn't have ANY expected keywords, it's definitely wrong
        if not content_has_type_keyword:
            log.error(f"🚨 REJECTION: Expected '{expected_type}' but found NO matching keywords. Caller: {caller[:40]}")
            return False
        
        # Check for conflicting type keywords (cross-type contamination)
        all_types = list(type_keywords.keys())
        conflicting_matches = []
        for other_type in all_types:
            if other_type != expected_type_lower:
                other_keywords = type_keywords[other_type]
                other_match = any(keyword in full_content for keyword in other_keywords)
                
                if other_match:
                    conflicting_matches.append(other_type)
        
        # Allow some mixing for related types (e.g., Banks can mention each other)
        # But prevent major category mismatches
        major_categories = {
            "bank": ["sbi", "hdfc", "icici"],
            "hospital": ["apollo"],
            "shopping": ["flipkart"],
            "government": ["income tax"],
            "utility": ["telecom", "electricity"],
            "fintech": ["paytm", "housing"]
        }
        
        expected_category = None
        for category, types in major_categories.items():
            if any(t in expected_type_lower for t in types):
                expected_category = category
                break
        
        # If we found conflicting matches from a different major category, reject
        for conflict_type in conflicting_matches:
            conflict_category = None
            for category, types in major_categories.items():
                if conflict_type in types:
                    conflict_category = category
                    break
            
            # Reject if from completely different category
            if conflict_category and expected_category and conflict_category != expected_category:
                log.error(f"🚨 REJECTION: '{expected_type}' ({expected_category}) mixed with '{conflict_type}' ({conflict_category})")
                return False
        
        log.info(f"✅ Scenario validation PASSED for {expected_type}: caller='{caller[:50]}...'")
        return True
        
    except Exception as e:
        log.error(f"Validation error: {e}")
        return False

async def generate_call_scenario(difficulty: str = "medium") -> Optional[Dict[str, Any]]:
    """
    Returns an AI-generated call scenario with FORCED VARIETY by randomly selecting scammer type.
    Prevents repetition of same scammer type (like LIC) across games.
    """
    if not client:
        log.debug("AI service disabled — using fallback mock generator")
        return _get_mock_scenario(difficulty)

    try:
        # 🔥 RANDOMLY SELECT SCAMMER TYPE TO ENSURE VARIETY
        selected_scammer_type, scammer_detail = random.choice(SCAMMER_TYPES)
        log.info(f"🎲 SCENARIO SELECTION - Type: {selected_scammer_type}")
        log.info(f"📋 Details: {scammer_detail}")
        log.info(f"📦 Total types available: {len(SCAMMER_TYPES)}")
        
        # Build prompt with SPECIFIC scammer type
        prompt = SCENARIO_PROMPT_TEMPLATE.format(
            difficulty=difficulty,
            scammer_type=selected_scammer_type,
            scammer_detail=scammer_detail
        )
        
        # Add uniqueness seed to prevent AI from using cached responses
        import time
        variation_seed = int(time.time() * 1000) % 10000
        prompt += f"\n\nGeneration ID: {variation_seed} — Create a COMPLETELY FRESH scenario for {selected_scammer_type}. Use DIFFERENT details, names, amounts, situations from previous scenarios."
        
        log.info(f"🎲 Generating {selected_scammer_type} scenario for difficulty: {difficulty} (seed={variation_seed})")
        
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": f"""You are a professional scam simulation generator for Indian security training. 

🔥 CRITICAL RULE: You MUST generate ONLY {selected_scammer_type} scams. NO OTHER TYPE.

If the assignment says "{selected_scammer_type}", then:
- Caller MUST be from {selected_scammer_type}
- Script MUST ONLY discuss {selected_scammer_type} issues
- Question MUST ask about {selected_scammer_type} verification
- NEVER include content from other scam types

Generate realistic, creative, unique scenarios in ENGLISH. If you generate the wrong type, the scenario will be rejected and you failed the task."""
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.95
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty content")
            
        scenario_data = json.loads(content)
        
        # 🔥 STRICT TYPE VALIDATION - Prevent scammer type mismatches
        is_valid = _validate_scenario_matches_type(scenario_data, selected_scammer_type)
        
        if is_valid:
            log.info(f"✅ Generated {selected_scammer_type} scenario successfully")
            return scenario_data
        else:
            log.warning(f"⚠️ AI generated wrong scammer type, expected {selected_scammer_type}, using fallback")
            return _get_mock_scenario(difficulty, selected_scammer_type)  # Pass expected type!
        
    except Exception as e:
        log.error(f"Error generating AI scenario: {e}")
        # 🔥 CRITICAL FIX: Always return the correct expected_type mock, even on exception
        log.warning(f"⚠️ Exception occurred during AI generation, falling back to {selected_scammer_type} mock")
        return _get_mock_scenario(difficulty, selected_scammer_type)

async def generate_phase_response(
    phase: CallPhase,
    difficulty: str,
    profile: str,
    last_action: str = "none",
    history: Optional[List[str]] = None,
    scammer_type: Optional[str] = None,  # NEW: Full scenario context for richer responses
    scenario_details: Optional[Dict[str, Any]] = None  # NEW: Actual scenario (caller, script, etc.)
) -> Dict[str, Any]:
    """
    Generates a dynamic response for a specific phase of the scam call.
    CRITICAL: Extracts ONLY the first message to enforce chat-like behavior.
    Uses full scenario context for richer, more realistic responses.
    ✅ GUARANTEED UNIQUE: High temperature, uniqueness seed, anti-repetition parameters
    """
    # 🔥 DEBUG: Log client status
    log.info(f"🎯 generate_phase_response called - Client available: {client is not None}")
    
    if not client:
        log.warning(f"⚠️ No AI client - using mock response for phase {phase.value}")
        return _get_mock_phase_response(phase, difficulty)

    try:
        log.info(f"📡 Calling GROQ API for phase: {phase.value}, difficulty: {difficulty}")
        
        history_text = "\n".join(history[-3:]) if history else "None"
        
        # 🔥 NEW: Include scenario context for better AI understanding
        scenario_context = ""
        if scenario_details:
            scenario_context = f"""
SCENARIO CONTEXT (for consistency):
- Full Caller Script: {' '.join(scenario_details.get('script', []))}
- Scenario Type: {scammer_type}
"""
        
        # Add uniqueness seed to force completely different responses
        import time
        uniqueness_seed = int(time.time() * 1000) % 100000
        
        prompt = PHASE_RESPONSE_PROMPT.format(
            phase=phase.value,
            difficulty=difficulty,
            profile=profile,
            last_action=last_action,
            history=history_text,
            persona_name=profile,
            scenario_locked=scenario_context,
            scam_type=scammer_type or "unknown",
            stage=phase.value,
            behavior_profile="reactive",  # User just made an action
            last_player_message=last_action,
            tone="manipulative"
        )
        
        # Add uniqueness instruction
        prompt += f"\n\n🔥 UNIQUENESS CHECKPOINT #{uniqueness_seed}:\nGenerate a COMPLETELY DIFFERENT response from any previous generation. Use novel arguments, different pressure tactics, unexpected details. Make this response UNIQUE and REALISTIC."

        log.info(f"🔥 Uniqueness seed: {uniqueness_seed} - forcing novel response generation")
        
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "🔥 CRITICAL: You are a professional scammer in a training simulation. Respond ONLY in ENGLISH with ONE SHORT MESSAGE at a time, like WhatsApp chat. Use realistic Indian scam tactics. Be convincing but natural. NEVER output multiple scenarios or paragraphs. NEVER repeat previous responses - ALWAYS be creatively unique. Each response MUST use different pressure tactics, arguments, and emotional angles. Vary your approach constantly. Use novel details, unexpected phrases, different tactical approaches. DO NOT use template language. Make each message feel naturally different from others."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.98,  # 🔥 MAXIMUM variation for unique responses
            top_p=0.99,         # 🔥 Allow maximum diversity
            frequency_penalty=1.0,  # 🔥 Heavily penalize repetition
            presence_penalty=0.6     # 🔥 Encourage new content
        )
        
        log.info(f"✅ GROQ API response received successfully")
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty content")
            
        scenario_data = json.loads(content)
        
        # 🔥 CRITICAL FIX: Extract ONLY the first message if multiple are present
        message = scenario_data.get("message", "").strip()
        if message:
            # Take only the first line/sentence
            first_message = message.split('\n')[0]
            scenario_data["message"] = first_message
            log.info(f"💬 Generated message: {first_message[:60]}...")
        
        # Set default typing delay if not provided
        if "typing_delay_ms" not in scenario_data:
            scenario_data["typing_delay_ms"] = 1000
        
        # 🔥 IMPROVED: Only use mock fallback if AI truly fails
        if "suggested_actions" not in scenario_data or not scenario_data["suggested_actions"]:
            log.warning(f"⚠️ AI didn't generate suggested_actions, trying regeneration...")
            # Try once more with explicit instruction
            try:
                retry_prompt = f"You MUST generate suggested_actions JSON array with 3-4 player options. Each option MUST have: option (text), risk_level (high/medium/low), tag (dangerous/risky/cautious/safe), explanation, better_action. Return valid JSON."
                retry_response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {"role": "system", "content": "Generate suggested_actions as valid JSON array."},
                            {"role": "user", "content": retry_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.8
                    ),
                    timeout=5.0
                )
                retry_data = json.loads(retry_response.choices[0].message.content)
                if "suggested_actions" in retry_data:
                    scenario_data["suggested_actions"] = retry_data["suggested_actions"]
                    log.info(f"✅ Retry succeeded - got suggested_actions from AI")
                else:
                    log.info(f"⚠️ Retry didn't have suggested_actions, using mock")
                    mock_response = _get_mock_phase_response(phase, difficulty)
                    scenario_data["suggested_actions"] = mock_response.get("suggested_actions", [])
            except:
                log.info(f"⚠️ Fallback to mock options after retry failed")
                mock_response = _get_mock_phase_response(phase, difficulty)
                scenario_data["suggested_actions"] = mock_response.get("suggested_actions", [])
        
        log.info(f"✅ Dynamic response generated successfully from GROQ")
        return scenario_data
    except Exception as e:
        log.error(f"❌ Error generating phase response from GROQ: {e}", exc_info=True)
        log.warning(f"⚠️ Falling back to mock response for phase {phase.value}")
        return _get_mock_phase_response(phase, difficulty)

def _get_mock_phase_response(phase: CallPhase, difficulty: str) -> Dict[str, Any]:
    """Fallback mock for phase responses with risk-rated options."""
    responses = {
        CallPhase.AUTHORITY: {
            "easy": "This is bank support, your account has issue.",
            "medium": "This is ICICI Bank fraud department calling regarding your account.",
            "hard": "Good evening, I'm calling from ICICI Bank's fraud monitoring team regarding a flagged transaction."
        },
        CallPhase.URGENCY: {
            "easy": "Your account will be blocked now.",
            "medium": "Your account may be blocked within 10 minutes if not verified.",
            "hard": "We need immediate confirmation, otherwise the system will automatically restrict your account."
        }
    }
    
    msg = responses.get(phase, responses[CallPhase.AUTHORITY]).get(difficulty, "Hello?")
    
    # Mock risk-rated options based on difficulty
    if difficulty == "easy":
        suggested = [
            {"option": "Yes, I will share my OTP", "risk_level": "high", "tag": "dangerous", "explanation": "Directly sharing OTP is extremely risky.", "better_action": "Hang up immediately."},
            {"option": "I will call my bank directly", "risk_level": "low", "tag": "safe", "explanation": "Independent verification is the safest path.", "better_action": "None."},
            {"option": "Ignore the warning", "risk_level": "medium", "tag": "risky", "explanation": "Ignoring might not solve the issue if it were real.", "better_action": "Call official support."}
        ]
    elif difficulty == "medium":
        suggested = [
            {"option": "Can you confirm the transaction details?", "risk_level": "medium", "tag": "cautious", "explanation": "Engaging helps the scammer manipulate you.", "better_action": "Use the official app to check."},
            {"option": "I will verify through official app", "risk_level": "low", "tag": "safe", "explanation": "Official apps are secure channels.", "better_action": "None."},
            {"option": "Tell me what verification is needed", "risk_level": "high", "tag": "risky", "explanation": "Following their process leads to data loss.", "better_action": "Disconnect."}
        ]
    else: # hard
        suggested = [
            {"option": "Confirm the last 4 digits of my account", "risk_level": "medium", "tag": "cautious", "explanation": "Scammers often have some public info to gain trust.", "better_action": "Call using the number on your card."},
            {"option": "I will call the bank using official number", "risk_level": "low", "tag": "safe", "explanation": "Always use known official contacts.", "better_action": "None."},
            {"option": "Proceed with verification if needed", "risk_level": "high", "tag": "dangerous", "explanation": "Blindly proceeding is the goal of social engineering.", "better_action": "Stop and verify independently."}
        ]

    return {
        "message": msg,
        "suggested_actions": suggested
    }

def _get_mock_scenario(difficulty: str, expected_type: Optional[str] = None) -> Dict[str, Any]:
    """Fallback mock generator with Indian context and English - ALL 11 SCAMMER TYPES.
    If expected_type is provided, returns the matching type scenario; otherwise returns random."""
    
    # 🔥 ALL SCAMMER TYPES - Matching SCAMMER_TYPES list exactly
    scams = [
        {
            "caller": "SBI Bank Fraud Department",
            "script": [
                "Hello, my name is Raj and I'm calling from SBI Bank's fraud monitoring department",
                "We detected a suspicious transaction of 32,000 rupees in your SBI account",
                "If you didn't authorize this, your SBI account could be permanently blocked",
                "We need immediate verification or we will have to file a report",
                "Please share the last 4 digits of your SBI card and your OTP so we can verify"
            ],
            "question": "The caller is asking for your SBI card details. What do you do?",
            "options": [
                "Share the details - quick verification",
                "Hang up the call - this is a scam",
                "Ask for employee ID for verification",
                "Call SBI directly using number on card"
            ],
            "correct_answer": "Hang up the call - this is a scam",
            "tip": "Real banks like SBI never ask for card details or OTP over the phone",
            "red_flags": ["Call from unknown number", "Pressure to act immediately", "Requesting card details over phone"]
        },
        {
            "caller": "HDFC Bank Credit Card Team",
            "script": [
                "Good morning, this is Vikram from HDFC Bank credit card department.",
                "Your credit card ending in 4521 has been flagged for unusual spending.",
                "We detected 3 international transactions totaling ₹92,000 in the last hour.",
                "Your HDFC card will be blocked in 20 minutes unless you verify immediately.",
                "Please confirm your card CVV, expiry date, and your mother's maiden name."
            ],
            "question": "HDFC is asking for your card CVV and personal details. What do you do?",
            "options": [
                "Provide all details for card security",
                "Hang up and call bank's official number",
                "Verify through HDFC mobile app",
                "Visit HDFC branch in person"
            ],
            "correct_answer": "Hang up and call bank's official number",
            "tip": "Banks like HDFC never ask for CVV over the phone. Always call the number on your card.",
            "red_flags": ["Requesting CVV", "Unexpected security call", "Threatening card block"]
        },
        {
            "caller": "ICICI Bank Security Team",
            "script": [
                "Hello, this is Priya from ICICI Bank fraud prevention.",
                "Your ICICI account shows unauthorized access from overseas.",
                "We need to verify your identity immediately to prevent account freezing.",
                "Your ICICI account will be locked in 15 minutes if not verified.",
                "Please provide your ICICI login password and the 6-digit OTP we just sent."
            ],
            "question": "ICICI Bank is asking for your login password and OTP. What do you do?",
            "options": [
                "Share password and OTP for verification",
                "Hang up and login to ICICI directly",
                "Call ICICI's official customer service number",
                "Visit ICICI ATM to verify"
            ],
            "correct_answer": "Hang up and login to ICICI directly",
            "tip": "ICICI Bank will never ask for your login password or OTP over phone.",
            "red_flags": ["Requesting login credentials", "Threatening account freezing", "Unsolicited verification call"]
        },
        {
            "caller": "Flipkart Customer Service",
            "script": [
                "Hello, I'm calling from Flipkart regarding your recent order.",
                "Your payment has failed and we have a refund of ₹2,500 pending.",
                "But first you need to open a secure verification link.",
                "Enter your bank details and OTP in that link to claim your refund.",
                "If you don't complete this now, the refund will be cancelled automatically."
            ],
            "question": "Flipkart is asking you to open a link to claim refund. What do you do?",
            "options": [
                "Open the link and enter your bank details",
                "Hang up the call",
                "Check directly in the Flipkart app",
                "Ask them to verify your order ID first"
            ],
            "correct_answer": "Check directly in the Flipkart app",
            "tip": "Flipkart never asks for bank login details over the phone.",
            "red_flags": ["Sending suspicious links", "Asking for bank credentials", "Creating urgency with refund threats"]
        },
        {
            "caller": "Income Tax Department",
            "script": [
                "This is an official notice from the Government Income Tax Department.",
                "You have committed tax fraud of ₹50,000 in your 2023-24 return.",
                "If you don't settle this within 1 hour, we will file a case against you.",
                "You must immediately transfer funds via Google Pay or Paytm.",
                "Call this number back to confirm your payment or face legal consequences."
            ],
            "question": "The Income Tax Department is demanding immediate payment. What do you do?",
            "options": [
                "Send money immediately via Google Pay",
                "Hang up - this is a scam",
                "Verify directly with the Income Tax Department official website",
                "Contact your chartered accountant"
            ],
            "correct_answer": "Verify directly with the Income Tax Department official website",
            "tip": "Government agencies never demand immediate payment over the phone.",
            "red_flags": ["Government authority claiming fraud", "Pressure for immediate payment", "Using unofficial payment methods"]
        },
        {
            "caller": "Tech Support Services",
            "script": [
                "Hi, this is calling from Microsoft Windows Support Center.",
                "Your computer has detected 17 viruses and malware infections.",
                "Your system will crash in 2 minutes if you don't take immediate action.",
                "We need you to open a special support link to clean your computer remotely.",
                "First, download and install our security tool using the link I'm sending to your email."
            ],
            "question": "Tech Support is asking you to download a security tool. What do you do?",
            "options": [
                "Download and install the security tool immediately",
                "Hang up - this is a scam",
                "Check for updates in official Windows settings",
                "Restart your computer to clear the issue"
            ],
            "correct_answer": "Hang up - this is a scam",
            "tip": "Microsoft never calls unsolicited about malware. Official updates come through Settings app.",
            "red_flags": ["Unsolicited tech support call", "Creating urgency about infections", "Asking to download unknown files"]
        },
        {
            "caller": "Jio Customer Care",
            "script": [
                "Hi, this is Priya from Jio customer care.",
                "As per our records, you have unpaid bills totaling ₹4,250.",
                "If payment is not made within 2 hours, your Jio number will be permanently deactivated.",
                "We need to collect payment right now.",
                "Please share your 6-digit OTP and account PIN so we can auto-debit from your account."
            ],
            "question": "A telecom provider is asking for your OTP to collect payment. What do you do?",
            "options": [
                "Share OTP for quick debit",
                "Hang up - check bill in official app",
                "Ask for customer reference number",
                "Pay via official Jio payment gateway"
            ],
            "correct_answer": "Hang up - check bill in official app",
            "tip": "Jio support will never ask for OTP over phone. Check your bill in the official app.",
            "red_flags": ["Requesting OTP over phone", "Threat of immediate deactivation", "Unsolicited call about unpaid bills"]
        },
        {
            "caller": "Paytm Wallet Support",
            "script": [
                "Hi, this is Rajesh from Paytm security.",
                "We detected suspicious activity on your Paytm wallet account.",
                "₹8,000 was transferred to an unknown account 10 minutes ago.",
                "To recover this and secure your wallet, we need you to verify immediately.",
                "Please share your Paytm PIN, registered mobile OTP, and Voter ID/Aadhar number."
            ],
            "question": "Paytm is asking for your PIN and personal ID. What do you do?",
            "options": [
                "Share all details for wallet recovery",
                "Hang up and check Paytm app directly",
                "Ask for transaction reference number",
                "Visit nearest Paytm center in person"
            ],
            "correct_answer": "Hang up and check Paytm app directly",
            "tip": "Paytm support will never ask for PIN or ID documents over phone.",
            "red_flags": ["Requesting Paytm PIN", "Asking for ID documents", "Creating urgency about fund loss"]
        },
        {
            "caller": "Housing.com Property Verification",
            "script": [
                "Hello, this is calling from Housing.com property verification team.",
                "Your property listing has received an interested buyer from abroad.",
                "To complete the transaction, we need your property documents verified immediately.",
                "Please share your land registration certificate, bank account number, and Aadhar details.",
                "The buyer is ready to transfer ₹50 lakhs but needs verification within 24 hours."
            ],
            "question": "Housing.com is asking for your property documents and bank details. What do you do?",
            "options": [
                "Share all documents for quick deal completion",
                "Hang up and verify through Housing.com website",
                "Ask for official transaction reference number",
                "Request in-person verification at their office"
            ],
            "correct_answer": "Hang up and verify through Housing.com website",
            "tip": "Housing.com will never ask for property documents or bank details over unsolicited calls.",
            "red_flags": ["Unsolicited property verification call", "Requesting bank account details", "Creating urgency about buyer"]
        },
        {
            "caller": "Apollo Hospital Medical Department",
            "script": [
                "Hello, this is Dr. Sharma from Apollo Hospital.",
                "Your recent prescription verification shows discrepancies in your medical records.",
                "We need to complete your hospital registration immediately.",
                "Your medical insurance may be cancelled if not updated within 24 hours.",
                "Please provide your Aadhar number, insurance policy ID, and bank account for payment."
            ],
            "question": "Apollo Hospital is asking for your Aadhar and bank details. What do you do?",
            "options": [
                "Share all details for hospital registration",
                "Hang up and call Apollo Hospital directly",
                "Visit Apollo Hospital in person",
                "Ask for official hospital reference number"
            ],
            "correct_answer": "Hang up and call Apollo Hospital directly",
            "tip": "Hospitals never ask for Aadhar or full bank details over unsolicited calls.",
            "red_flags": ["Unsolicited hospital call", "Requesting Aadhar number", "Threatening insurance cancellation"]
        },
        {
            "caller": "Electricity Department Billing",
            "script": [
                "Namaste, this is calling from BSES Electricity Department.",
                "Your electricity bill is overdue by ₹15,420 for the last 3 months.",
                "Your connection will be disconnected within 24 hours without payment.",
                "To avoid disconnection, you must pay immediately.",
                "Please provide your consumer number and bank account number for direct debit."
            ],
            "question": "Electricity department is asking for bank account number. What do you do?",
            "options": [
                "Share bank details for bill payment",
                "Hang up and check bill online",
                "Visit electricity office in person",
                "Call official helpline number"
            ],
            "correct_answer": "Hang up and check bill online",
            "tip": "Utilities never collect payment by asking for full bank details over phone.",
            "red_flags": ["Requesting bank account number", "Threat of disconnection", "Asking for immediate payment"]
        }
    ]
    
    # 🔥 If expected_type is provided, return the matching scenario by caller name
    if expected_type:
        expected_type_lower = expected_type.lower()
        for scenario in scams:
            caller_lower = scenario["caller"].lower()
            # Match type by caller name
            if (("sbi bank" in expected_type_lower and "sbi" in caller_lower) or
                ("hdfc bank" in expected_type_lower and "hdfc" in caller_lower) or
                ("icici bank" in expected_type_lower and "icici" in caller_lower) or
                ("flipkart" in expected_type_lower and "flipkart" in caller_lower) or
                ("income tax" in expected_type_lower and "income tax" in caller_lower) or
                ("tech support" in expected_type_lower and ("microsoft" in caller_lower or "windows" in caller_lower)) or
                ("telecom" in expected_type_lower and ("jio" in caller_lower or "bsnl" in caller_lower)) or
                ("paytm" in expected_type_lower and "paytm" in caller_lower) or
                ("housing" in expected_type_lower and "housing" in caller_lower) or
                ("apollo" in expected_type_lower and ("apollo" in caller_lower or "hospital" in caller_lower)) or
                ("electricity" in expected_type_lower and ("electricity" in caller_lower or "bses" in caller_lower))):
                log.info(f"✅ Returning correct mock for {expected_type}: {scenario['caller']}")
                return scenario
        log.warning(f"⚠️ Could not find mock for {expected_type}, returning random")
    
    return random.choice(scams)
