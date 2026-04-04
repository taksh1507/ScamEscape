"""
WhatsApp Round 2 Constants and Types
"""

from enum import Enum
from typing import List, Dict, Any

# ─── Message Types ───────────────────────────────────────────────────────

class MessageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    LINK = "link"
    DOCUMENT = "document"
    VIDEO = "video"
    AUDIO = "audio"


# ─── Scammer Identity Types ───────────────────────────────────────────────────

class ScammerType(Enum):
    BANK_AGENT = "bank_agent"
    DELIVERY_COMPANY = "delivery_company"
    FRIEND_CONTACT = "friend_contact"
    RELATIVE_CONTACT = "relative_contact"  # 🔥 NEW: Family members impersonation
    GOVERNMENT_OFFICIAL = "government_official"
    TECH_SUPPORT = "tech_support"
    INVESTMENT_ADVISOR = "investment_advisor"
    TELECOM_OPERATOR = "telecom_operator"


# ─── Scam Progression Stages ───────────────────────────────────────────────────

class ScamStage(Enum):
    BUILD_TRUST = "build_trust"           # Stage 1: Establish credibility
    CREATE_PROBLEM = "create_problem"     # Stage 2: Introduce urgent problem
    PROVIDE_SOLUTION = "provide_solution" # Stage 3: Offer solution
    REQUEST_ACTION = "request_action"     # Stage 4: Request OTP/payment/details
    EXECUTE_SCAM = "execute_scam"         # Stage 5: Complete the scam


# ─── Player Behavior Types ───────────────────────────────────────────────────

class BehaviorProfile(Enum):
    FAST_CONFIDENT = "fast_confident"       # Fast replies, confident
    SLOW_CONFUSED = "slow_confused"         # Slow replies, confused
    SKEPTICAL_ASKER = "skeptical_asker"     # Asking questions frequently
    PANICKED = "panicked"                   # Showing signs of panic
    CAUTIOUS = "cautious"                   # Asking about verification


# ─── Warning/Red Flags ───────────────────────────────────────────────────

class RedFlag(Enum):
    UNKNOWN_NUMBER = "unknown_number"
    URGENT_TONE = "urgent_tone"
    ASKING_OTP = "asking_otp"
    ASKING_PASSWORD = "asking_password"
    REQUESTING_PAYMENT = "requesting_payment"
    SUSPICIOUS_LINK = "suspicious_link"
    UNVERIFIED_BADGE = "unverified_badge"
    GRAMMAR_ERRORS = "grammar_errors"
    THREATENING_LANGUAGE = "threatening_language"
    TIME_PRESSURE = "time_pressure"
    UNSOLICITED_CONTACT = "unsolicited_contact"
    UNUSUAL_REQUEST = "unusual_request"


RED_FLAG_DESCRIPTIONS = {
    RedFlag.UNKNOWN_NUMBER: "Message from an unknown/unverified number",
    RedFlag.URGENT_TONE: "Creating artificial urgency or panic",
    RedFlag.ASKING_OTP: "Requesting OTP or one-time code",
    RedFlag.ASKING_PASSWORD: "Asking for password or PIN",
    RedFlag.REQUESTING_PAYMENT: "Requesting payment or financial transaction",
    RedFlag.SUSPICIOUS_LINK: "Sending suspicious or shortened links",
    RedFlag.UNVERIFIED_BADGE: "Fake verification badge without real verification",
    RedFlag.GRAMMAR_ERRORS: "Poor grammar or spelling indicating scammer",
    RedFlag.THREATENING_LANGUAGE: "Threats of account closure or legal action",
    RedFlag.TIME_PRESSURE: "Countdown or time-based pressure tactics",
    RedFlag.UNSOLICITED_CONTACT: "Unsolicited contact from official-sounding entity",
    RedFlag.UNUSUAL_REQUEST: "Unusual requests inconsistent with known services",
}


# ─── Power-Ups ───────────────────────────────────────────────────────

class PowerUp(Enum):
    BLOCK_CALLER = "block_caller"           # Block the contact
    CHECK_AUTHENTICITY = "check_authenticity"  # Verify if real service
    DELAY_RESPONSE = "delay_response"       # Delay responding (resist time pressure)
    REPORT_SCAM = "report_scam"             # Report to authorities
    CALL_BANK = "call_bank"                 # Call the actual bank/service


POWER_UP_DESCRIPTIONS = {
    PowerUp.BLOCK_CALLER: "Block this sender permanently",
    PowerUp.CHECK_AUTHENTICITY: "Verify if this is a real service (60% success)",
    PowerUp.DELAY_RESPONSE: "Delay response by 2 minutes to think clearly",
    PowerUp.REPORT_SCAM: "Report to authorities and block automatically",
    PowerUp.CALL_BANK: "Call the official number to verify (sometimes reveals scam)",
}

POWER_UP_COSTS = {
    PowerUp.BLOCK_CALLER: 0,                # Always available
    PowerUp.CHECK_AUTHENTICITY: 50,         # Points cost
    PowerUp.DELAY_RESPONSE: 30,
    PowerUp.REPORT_SCAM: 0,
    PowerUp.CALL_BANK: 0,
}


# ─── Difficulty Adjustments ───────────────────────────────────────────────────

DIFFICULTY_MULTIPLIERS = {
    "easy": {
        "obvious_red_flags": 5,             # More obvious signs
        "scam_stages": 2,                   # Shorter progression
        "time_pressure_countdown": 300,     # 5 minutes
        "agent_pressure_interval": 45,      # Seconds between pressure messages
    },
    "medium": {
        "obvious_red_flags": 3,
        "scam_stages": 4,
        "time_pressure_countdown": 120,     # 2 minutes
        "agent_pressure_interval": 30,
    },
    "hard": {
        "obvious_red_flags": 1,
        "scam_stages": 5,
        "time_pressure_countdown": 60,      # 1 minute
        "agent_pressure_interval": 20,
        "subtle_manipulation": True,        # Use psychological tactics
    },
}
