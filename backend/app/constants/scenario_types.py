from enum import Enum

class ScenarioType(str, Enum):
    CALL  = "call"
    SMS   = "sms"
    CHAT  = "chat"
    OTP   = "otp"
    EMAIL = "email"
    BANK  = "bank"

class CallPhase(str, Enum):
    AUTHORITY = "authority"
    URGENCY   = "urgency"
    TRUST     = "trust"
    PRESSURE  = "pressure"
    SUCCESS   = "success" # User fell for it
    FAILURE   = "failure" # User blocked/hung up

# 3-round order: Call → SMS/Chat → Final Trap
ROUND_TYPE_ORDER = [
    ScenarioType.CALL,
    ScenarioType.SMS,
    ScenarioType.BANK,
]
