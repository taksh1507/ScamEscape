from enum import Enum

class ScammerType(str, Enum):
    BANK_AGENT = "bank_agent"
    DELIVERY_COMPANY = "delivery_company"
    GOVERNMENT_OFFICIAL = "government_official"
    TECH_SUPPORT = "tech_support"
    INVESTMENT_ADVISOR = "investment_advisor"
    TELECOM_OPERATOR = "telecom_operator"
    RELATIVE_CONTACT = "relative_contact"
    FRIEND_CONTACT = "friend_contact"
