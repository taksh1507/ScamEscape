"""
scenario_manager.py

Generates 3 dynamic scenarios per game, tuned by difficulty.
Round order: CALL → SMS → BANK (final trap)

Difficulty affects:
  easy   — obvious scam, clear red flags, blunt language
  medium — more realistic, mixed signals, plausible caller
  hard   — highly convincing, subtle manipulation, no obvious tells
"""

import random
from typing import List, Dict, Any
from app.constants.scenario_types import ScenarioType, ROUND_TYPE_ORDER
from app.services.ai_service import generate_call_scenario

# ─── CALL Template System ───────────────────────────────────────────────────

class CallScenarioTemplate:
    def __init__(self, category: str, callers: List[str], intros: List[str], problems: List[str], pressures: List[str], actions: List[str], question: str, options: List[str], correct_answer: str):
        self.category = category
        self.callers = callers
        self.intros = intros
        self.problems = problems
        self.pressures = pressures
        self.actions = actions
        self.question = question
        self.options = options
        self.correct_answer = correct_answer

    def generate(self) -> Dict[str, Any]:
        caller = random.choice(self.callers)
        script = [
            random.choice(self.intros),
            random.choice(self.problems),
            random.choice(self.pressures),
            random.choice(self.actions)
        ]
        # Occasionally add an extra line for variety (5-6 lines)
        if random.random() > 0.5:
            script.insert(2, "This is a recorded line for security purposes.")
        if random.random() > 0.7:
            script.append("Please do not hang up while we process this.")

        return {
            "caller": caller,
            "script": script,
            "question": self.question,
            "options": self.options,
            "correct_action": self.correct_answer,
            "red_flags": [
                "Unsolicited call requesting sensitive action",
                "Creation of artificial urgency/panic",
                "Request for card details or OTP over phone"
            ]
        }

_TEMPLATES = [
    CallScenarioTemplate(
        category="Bank Fraud",
        callers=["HDFC Bank Fraud Dept", "ICICI Security Team", "SBI Alert Center", "Axis Bank Support"],
        intros=[
            "Hello, I am calling from your bank's fraud prevention department.",
            "Good day, this is the security team from your primary bank account.",
            "Greetings, this is an urgent call regarding your banking security."
        ],
        problems=[
            "We have detected a suspicious transaction of ₹45,000 on your account.",
            "An unauthorized login attempt was made from a device in a different city.",
            "Your account has been flagged for suspicious international activity."
        ],
        pressures=[
            "If you don't act now, we will have to freeze your account permanently.",
            "We must stop this transaction immediately to save your funds.",
            "Failure to verify will result in immediate suspension of net banking."
        ],
        actions=[
            "Please confirm your card number and the CVV to block the charge.",
            "I need you to verify the OTP sent to your registered mobile number.",
            "Kindly provide your customer ID and transaction password for verification."
        ],
        question="The caller claims to be from your bank and wants sensitive details to 'secure' your account. What is your response?",
        options=["Provide details", "Hang up immediately", "Ask for their ID", "Call back officially"],
        correct_answer="Hang up immediately"
    ),
    CallScenarioTemplate(
        category="KYC Scam",
        callers=["Airtel KYC Desk", "Paytm Verification Team", "JIO Security Office"],
        intros=[
            "Hello, this is the KYC verification department calling.",
            "This is an automated notice regarding your pending KYC update.",
            "I am calling to assist you with your mandatory document verification."
        ],
        problems=[
            "Your KYC documents have expired and your services will be stopped.",
            "We found a discrepancy in your submitted identity documents.",
            "Your account is pending verification and will be blocked in 2 hours."
        ],
        pressures=[
            "You will lose all access to your wallet and funds by evening.",
            "To avoid permanent disconnection, you must update this right now.",
            "This is your final warning before your number is blacklisted."
        ],
        actions=[
            "Please download the remote support app I am sending via SMS.",
            "Share your Aadhaar number and the 6-digit code you just received.",
            "I will send you a link to upload your documents immediately."
        ],
        question="A service provider is threatening to block your account unless you share an OTP or download an app. What do you do?",
        options=["Download app", "Disconnect", "Share Aadhaar", "Check official app"],
        correct_answer="Disconnect"
    ),
    CallScenarioTemplate(
        category="E-commerce/Refund",
        callers=["Amazon Customer Care", "Flipkart Support Team", "Myntra Refund Desk"],
        intros=[
            "Hello, I am calling from the customer support department.",
            "This is regarding a recent order you placed on our platform.",
            "I am calling to process a refund for your failed transaction."
        ],
        problems=[
            "Your recent payment was successful but the order cannot be fulfilled.",
            "We have initiated a refund of ₹2,500 but it is stuck in processing.",
            "There is a problem with the delivery address for your expensive gadget."
        ],
        pressures=[
            "We need to process the refund within 10 minutes or it will expire.",
            "To receive your cashback, you must complete the verification now.",
            "The courier is waiting and will return the item if not verified."
        ],
        actions=[
            "Please click the refund link I am sending to your phone.",
            "Scan the QR code I am sending to receive the money in your bank.",
            "Provide your UPI ID and accept the collect request in your app."
        ],
        question="A support agent wants you to scan a QR code or click a link to receive a 'refund'. How do you handle this?",
        options=["Click link", "Scan QR code", "Hang up", "Ask for order ID"],
        correct_answer="Hang up"
    )
]

# ─── SMS variants by difficulty ───────────────────────────────────────────────

_SMS_EASY: List[Dict[str, Any]] = [
    {
        "sender": "HDFC-BANK",
        "message": "ALERT: Your account is SUSPENDED. Click http://hdfc-secure-login.xyz to reactivate NOW or lose access permanently.",
        "question": "You received an SMS with a suspicious link claiming your account is suspended. What is your action?",
        "options": ["Click link", "Ignore & Delete", "Forward to bank", "Call bank"],
        "red_flags": [
            "Unofficial domain — not hdfc.com",
            "ALL CAPS urgency language",
            "Threat of permanent loss"
        ],
        "correct_action": "Ignore & Delete",
    },
]

_SMS_MEDIUM: List[Dict[str, Any]] = [
    {
        "sender": "SBI-ALERTS",
        "message": "Dear Customer, your SBI NetBanking has been temporarily locked due to 3 failed login attempts. Verify identity: http://sbi-netbanking-verify.in/unlock",
        "question": "A convincing SMS about a locked account provides an 'unlock' link. What should you do?",
        "options": ["Click to unlock", "Ignore", "Visit site manually", "Call helpline"],
        "red_flags": [
            "Domain is 'sbi-netbanking-verify.in' — not sbi.co.in",
            "Banks never send unlock links via SMS"
        ],
        "correct_action": "Visit site manually",
    },
]

_SMS_HARD: List[Dict[str, Any]] = [
    {
        "sender": "VM-ICICI",
        "message": "ICICI Bank: A new device has been registered for your account. If this wasn't you, secure your account immediately: https://icici-secure.in/device-verify?token=8f2k9",
        "question": "An SMS alerts you to a new device login with a 'secure' link. How do you respond?",
        "options": ["Click to secure", "Ignore", "Check app directly", "Call helpline"],
        "red_flags": [
            "Domain 'icici-secure.in' is not icici.com",
            "Token in URL is a phishing technique"
        ],
        "correct_action": "Check app directly",
    },
]

# ─── BANK (final trap) variants by difficulty ─────────────────────────────────

_BANK_EASY: List[Dict[str, Any]] = [
    {
        "alert_source": "SBI ALERT",
        "message": "URGENT: Your SBI account will be BLOCKED in 2 hours due to KYC non-compliance. Update KYC NOW: http://sbi-kyc-update.net/verify",
        "question": "A bank alert demands immediate KYC update via a link. What is the safest path?",
        "options": ["Update via link", "Ignore", "Visit branch", "Call bank"],
        "red_flags": [
            "Extreme urgency (2 hours)",
            "KYC links in SMS are always fake"
        ],
        "correct_action": "Ignore",
    },
]

_BANK_MEDIUM: List[Dict[str, Any]] = [
    {
        "alert_source": "AXIS BANK",
        "message": "Your Axis Bank account shows suspicious outgoing transfer of ₹45,000. If not done by you, block immediately: https://axisbank-secure.co/block?ref=TXN8821",
        "question": "You see a suspicious transaction alert with a link to 'block' it. What do you do?",
        "options": ["Click to block", "Ignore", "Check app", "Call helpline"],
        "red_flags": [
            "Unofficial domain '.co'",
            "Real banks don't block via SMS links"
        ],
        "correct_action": "Check app",
    },
]

_BANK_HARD: List[Dict[str, Any]] = [
    {
        "alert_source": "KOTAK MAHINDRA BANK",
        "message": "Kotak Bank Security: We've detected login from IP 185.220.101.47 (Russia) to your account. Your session has been secured. Review activity: https://kotak.com.account-review.in/session?id=K9X2",
        "question": "A highly specific alert shows a login from Russia. How do you verify this safely?",
        "options": ["Review activity link", "Ignore", "Check login history", "Call bank"],
        "red_flags": [
            "Subdomain phishing: 'kotak.com.account-review.in'",
            "Specific IP/Location is used to create panic"
        ],
        "correct_action": "Check login history",
    },
]

# ─── Pool mapping: type + difficulty → variants ───────────────────────────────

_POOLS: Dict[ScenarioType, Dict[str, List[Dict[str, Any]]]] = {
    ScenarioType.CALL: {"easy": [], "medium": [], "hard": []}, # Handled by templates
    ScenarioType.SMS:  {"easy": _SMS_EASY,  "medium": _SMS_MEDIUM,  "hard": _SMS_HARD},
    ScenarioType.BANK: {"easy": _BANK_EASY, "medium": _BANK_MEDIUM, "hard": _BANK_HARD},
}

# ─── Public API ───────────────────────────────────────────────────────────────

async def generate_scenarios(difficulty: str = "easy") -> List[Dict[str, Any]]:
    """
    Returns 3 scenario dicts in ROUND_TYPE_ORDER, tuned to difficulty.
    Each dict: type, round_number, correct_action, red_flags, payload.
    """
    diff = difficulty if difficulty in ("easy", "medium", "hard") else "easy"
    scenarios = []
    
    for idx, scenario_type in enumerate(ROUND_TYPE_ORDER):
        if scenario_type == ScenarioType.CALL:
            # Use AI generation for call simulation
            variant = await generate_call_scenario(diff)
            if not variant:
                # Fallback to templates if AI fails completely
                template = random.choice(_TEMPLATES)
                variant = template.generate()
        else:
            pool = _POOLS[scenario_type][diff]
            variant = random.choice(pool)
        
        # Build payload
        payload = {k: v for k, v in variant.items()
                  if k not in ("correct_action", "red_flags")}
        
        scenarios.append({
            "type": scenario_type.value,
            "round_number": idx + 1,
            "difficulty": diff,
            "correct_action": variant.get("correct_action", variant.get("correct_answer")),
            "red_flags": variant.get("red_flags", []),
            "payload": payload,
        })
    return scenarios


def get_scenario_for_round(scenarios: List[Dict[str, Any]], round_number: int) -> Dict[str, Any]:
    """
    Returns the public scenario dict for a 1-based round_number.
    correct_action is stripped (anti-cheat).
    """
    s = scenarios[round_number - 1]
    return {
        "type":         s["type"],
        "round_number": s["round_number"],
        "difficulty":   s["difficulty"],
        "red_flags":    s["red_flags"],
        "payload":      s["payload"],
    }
