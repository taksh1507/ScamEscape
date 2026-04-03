from enum import Enum

class ScenarioType(str, Enum):
    CALL  = "call"
    SMS   = "sms"
    CHAT  = "chat"
    OTP   = "otp"
    EMAIL = "email"
    BANK  = "bank"

# 3-round order: Call → SMS/Chat → Final Trap
ROUND_TYPE_ORDER = [
    ScenarioType.CALL,
    ScenarioType.SMS,
    ScenarioType.BANK,
]
