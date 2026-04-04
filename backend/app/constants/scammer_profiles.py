"""
Scammer Identity Profiles for Round 2
Defines different scammer personas with their characteristics
"""

from typing import Dict, List, Any
from app.constants.whatsapp_types import ScammerType, ScamStage

class ScammerProfile:
    """Represents a scammer's identity and behavior pattern"""
    
    def __init__(
        self,
        name: str,
        scammer_type: ScammerType,
        display_name: str,
        profile_picture_url: str,
        has_verified_badge: bool,
        messaging_style: str,
        common_opening: str,
        common_problem: str,
        common_pressure: str,
        common_action_request: str,
        red_flags: List[str],
        typical_flow: Dict[ScamStage, List[str]],
        difficulty_variant: Dict[str, Dict[str, Any]],
    ):
        self.name = name
        self.scammer_type = scammer_type
        self.display_name = display_name
        self.profile_picture_url = profile_picture_url
        self.has_verified_badge = has_verified_badge
        self.messaging_style = messaging_style
        self.common_opening = common_opening
        self.common_problem = common_problem
        self.common_pressure = common_pressure
        self.common_action_request = common_action_request
        self.red_flags = red_flags
        self.typical_flow = typical_flow
        self.difficulty_variant = difficulty_variant


# ─── Scammer Profiles ───────────────────────────────────────────────────────

SCAMMER_PROFILES: Dict[ScammerType, ScammerProfile] = {
    ScammerType.BANK_AGENT: ScammerProfile(
        name="hdfc_fraud_agent",
        scammer_type=ScammerType.BANK_AGENT,
        display_name="HDFC Bank Security",
        profile_picture_url="https://example.com/hdfc-logo.jpg",
        has_verified_badge=True,  # FAKE BADGE
        messaging_style="formal_urgent",
        common_opening="Hello! This is HDFC Bank Security Team. We detected unusual activity on your account.",
        common_problem="Someone tried to access your account from Delhi. A ₹50,000 transaction was blocked.",
        common_pressure="⚠️ Your account will be locked in 2 minutes if you don't verify.",
        common_action_request="Please share your 4-digit CVV and OTP to confirm you authorized this.",
        red_flags=[
            "Asking for CVV/OTP over WhatsApp",
            "Fake verified badge",
            "Creating artificial urgency",
            "Acting as bank but using WhatsApp",
        ],
        typical_flow={
            ScamStage.BUILD_TRUST: [
                "Hi! This is HDFC Bank Security. How are you today?",
                "We've detected some irregular activity on your account.",
            ],
            ScamStage.CREATE_PROBLEM: [
                "Someone from Mumbai tried unauthorized access.",
                "A transaction of ₹50,000 was blocked by our fraud detection.",
            ],
            ScamStage.PROVIDE_SOLUTION: [
                "Don't worry, we can help you secure your account.",
                "We just need to verify your identity quickly.",
            ],
            ScamStage.REQUEST_ACTION: [
                "Please share the 6-digit OTP sent to your phone.",
                "Also, confirm the 3-digit CVV from the back of your card.",
            ],
            ScamStage.EXECUTE_SCAM: [
                "Thank you for verifying! We're processing your security clearance.",
                "[Transfer money to scammer]",
            ],
        },
        difficulty_variant={
            "easy": {
                "obvious_signs": 3,
                "grammar_quality": "poor",
                "emoji_usage": "excessive",
                "verification_speed": 90,  # seconds before asking
            },
            "medium": {
                "obvious_signs": 2,
                "grammar_quality": "acceptable",
                "emoji_usage": "moderate",
                "verification_speed": 120,
            },
            "hard": {
                "obvious_signs": 0,
                "grammar_quality": "professional",
                "emoji_usage": "minimal",
                "verification_speed": 180,
                "psychological_tactics": ["authority", "scarcity", "urgency"],
            },
        },
    ),
    
    ScammerType.DELIVERY_COMPANY: ScammerProfile(
        name="flipkart_delivery_agent",
        scammer_type=ScammerType.DELIVERY_COMPANY,
        display_name="Flipkart Delivery",
        profile_picture_url="https://example.com/flipkart-logo.jpg",
        has_verified_badge=True,  # FAKE
        messaging_style="casual_supportive",
        common_opening="Hi! Your Flipkart parcel is ready but needs verification.",
        common_problem="We're unable to deliver due to address mismatch. You need to verify payment.",
        common_pressure="Your package will be returned today if verification isn't done.",
        common_action_request="Click here to verify and update payment: [malicious-link]",
        red_flags=[
            "Sending suspicious link",
            "Requesting reverification for already processed payment",
            "Link looks legitimate but unfamiliar domain",
            "Fake verified badge",
        ],
        typical_flow={
            ScamStage.BUILD_TRUST: [
                "Hi! 👋 Your Flipkart order #FL8234 is with us.",
                "Expected delivery tomorrow between 10-6 PM.",
            ],
            ScamStage.CREATE_PROBLEM: [
                "However, payment verification failed on our system 😟",
                "We need you to re-verify your details to complete the order.",
            ],
            ScamStage.PROVIDE_SOLUTION: [
                "It's a quick process - should take 2 minutes.",
                "Just click the verification link below.",
            ],
            ScamStage.REQUEST_ACTION: [
                "👉 Verify here: flipkart-payment-verify-now.com/order/FL8234",
                "You'll be asked to enter card details for security purposes.",
            ],
            ScamStage.EXECUTE_SCAM: [
                "Thank you for verifying! Your package is being shipped.",
                "[Steal card details and commit fraud]",
            ],
        },
        difficulty_variant={
            "easy": {
                "domain_similarity": 0.4,
                "response_time": 15,
                "message_consistency": "poor",
            },
            "medium": {
                "domain_similarity": 0.7,
                "response_time": 30,
                "message_consistency": "good",
            },
            "hard": {
                "domain_similarity": 0.95,  # Nearly identical to real domain
                "response_time": 5,
                "message_consistency": "excellent",
            },
        },
    ),
    
    ScammerType.FRIEND_CONTACT: ScammerProfile(
        name="impersonated_friend",
        scammer_type=ScammerType.FRIEND_CONTACT,
        display_name="Rahul",  # Impersonated friend
        profile_picture_url="https://example.com/random-friend-pic.jpg",
        has_verified_badge=False,
        messaging_style="casual_intimate",
        common_opening="Yo! Hey buddy, quick favor needed. Don't call, just reply here.",
        common_problem="I'm stuck abroad and my cards aren't working.",
        common_pressure="Bro, I really need this in the next 5 mins or I'll be in huge trouble.",
        common_action_request="Can you send me ₹10,000 urgently? I'll pay you back immediately.",
        red_flags=[
            "Asking not to call",
            "Requesting money via text",
            "Uncharacteristic for alleged friend",
            "Creating urgency",
            "Unknown number despite familiar name",
        ],
        typical_flow={
            ScamStage.BUILD_TRUST: [
                "Yo man! Long time 🙌",
                "Hope you're doing great! Need your help with something.",
            ],
            ScamStage.CREATE_PROBLEM: [
                "I'm in Bangkok right now for work conference.",
                "My credit cards got blocked due to foreign transaction.",
            ],
            ScamStage.PROVIDE_SOLUTION: [
                "I have enough cash but can't withdraw without cards.",
                "Was hoping you could help me with quick transfer?",
            ],
            ScamStage.REQUEST_ACTION: [
                "Can you push ₹10,000 to my account? I'll transfer back once I reach India.",
                "Send to this account: [fake account details]",
            ],
            ScamStage.EXECUTE_SCAM: [
                "Thanks man! You're a lifesaver 🙏",
                "[Money is stolen, no repayment]",
            ],
        },
        difficulty_variant={
            "easy": {
                "grammar": "inconsistent",
                "style_accuracy": 0.3,
                "contact_verification": False,
            },
            "medium": {
                "grammar": "natural",
                "style_accuracy": 0.6,
                "contact_verification": False,
            },
            "hard": {
                "grammar": "perfect_match_to_friend",
                "style_accuracy": 0.95,
                "contact_verification": False,
                "phishing_profile_pic": True,
            },
        },
    ),
    
    ScammerType.GOVERNMENT_OFFICIAL: ScammerProfile(
        name="income_tax_officer",
        scammer_type=ScammerType.GOVERNMENT_OFFICIAL,
        display_name="Income Tax Department",
        profile_picture_url="https://example.com/government-seal.jpg",
        has_verified_badge=True,  # FAKE
        messaging_style="authoritative_stern",
        common_opening="NOTICE: The Income Tax Department has initiated action on your account.",
        common_problem="Discrepancies found in your 2024 tax filing.",
        common_pressure="Failure to respond will result in account freeze and legal action.",
        common_action_request="Pay pending ₹75,000 immediately to avoid prosecution.",
        red_flags=[
            "Threatening legal action",
            "Using WhatsApp instead of official channels",
            "Demanding immediate payment",
            "Creating fear and panic",
            "Impersonating government",
        ],
        typical_flow={
            ScamStage.BUILD_TRUST: [
                "This is Income Tax Department (Official Notice)",
                "Ref: Your PAN - AAAPA1234ABC",
            ],
            ScamStage.CREATE_PROBLEM: [
                "Discrepancies detected in your ITR for FY 2023-24.",
                "Unauthorized transactions noticed on your accounts.",
            ],
            ScamStage.PROVIDE_SOLUTION: [
                "Immediate action required to avoid legal proceedings.",
                "You have 24 hours to respond.",
            ],
            ScamStage.REQUEST_ACTION: [
                "Pay pending tax amount: ₹75,000",
                "Transfer to: [government-impersonation-bank-account]",
            ],
            ScamStage.EXECUTE_SCAM: [
                "Payment received. Case will be closed in 48 hours.",
                "[Money stolen, can repeat with same victim]",
            ],
        },
        difficulty_variant={
            "easy": {
                "official_tone": 0.4,
                "legal_language": "broken",
                "authority_credibility": "low",
            },
            "medium": {
                "official_tone": 0.7,
                "legal_language": "adequate",
                "authority_credibility": "medium",
            },
            "hard": {
                "official_tone": 0.95,
                "legal_language": "expert",
                "authority_credibility": "very_high",
                "includes_pii": True,  # Includes real PAN/details
            },
        },
    ),
}


def get_scammer_profile(scammer_type: ScammerType) -> ScammerProfile:
    """Get a scammer profile by type"""
    return SCAMMER_PROFILES.get(scammer_type)


def get_random_profile() -> ScammerProfile:
    """Get a random scammer profile"""
    import random
    return random.choice(list(SCAMMER_PROFILES.values()))
