"""
Multi-Step Scam Flow Manager for Round 2
Orchestrates progression through scam stages with dynamic content
"""

from typing import Dict, List, Optional, Any
from app.constants.whatsapp_types import ScamStage, ScammerType, DIFFICULTY_MULTIPLIERS
from app.constants.scammer_profiles import get_scammer_profile
import random


class MultiStepScamFlow:
    """Manages progression through scam stages"""
    
    # Standard 5-stage flow
    STANDARD_FLOW = [
        ScamStage.BUILD_TRUST,
        ScamStage.CREATE_PROBLEM,
        ScamStage.PROVIDE_SOLUTION,
        ScamStage.REQUEST_ACTION,
        ScamStage.EXECUTE_SCAM,
    ]
    
    # Simplified 2-stage flow (easy difficulty)
    EASY_FLOW = [
        ScamStage.BUILD_TRUST,
        ScamStage.REQUEST_ACTION,
    ]
    
    # Medium flow (3 stages)
    MEDIUM_FLOW = [
        ScamStage.BUILD_TRUST,
        ScamStage.CREATE_PROBLEM,
        ScamStage.REQUEST_ACTION,
    ]
    
    def __init__(self, scammer_type: ScammerType, difficulty: str = "medium"):
        self.scammer_type = scammer_type
        self.difficulty = difficulty
        self.profile = get_scammer_profile(scammer_type)
        
        # Determine flow based on difficulty
        self.flow = self._get_flow_for_difficulty(difficulty)
        self.current_stage_index = 0
        self.stage_messages: Dict[ScamStage, List[str]] = {}
        
        # Load messages from scammer profile
        if self.profile:
            self.stage_messages = self.profile.typical_flow
    
    def _get_flow_for_difficulty(self, difficulty: str) -> List[ScamStage]:
        """Get appropriate scam flow for difficulty level"""
        if difficulty == "easy":
            return self.EASY_FLOW
        elif difficulty == "medium":
            return self.MEDIUM_FLOW
        else:
            return self.STANDARD_FLOW
    
    def get_current_stage(self) -> ScamStage:
        """Get current scam stage"""
        if self.current_stage_index < len(self.flow):
            return self.flow[self.current_stage_index]
        return ScamStage.EXECUTE_SCAM
    
    def advance_stage(self) -> Optional[ScamStage]:
        """Advance to next stage in scam flow"""
        self.current_stage_index += 1
        return self.get_current_stage() if self.current_stage_index < len(self.flow) else None
    
    def get_stage_progress(self) -> Dict[str, Any]:
        """Get current progress through scam flow"""
        total_stages = len(self.flow)
        current = self.current_stage_index + 1  # 1-indexed for display
        
        return {
            "current_stage": self.get_current_stage().value,
            "stage_number": current,
            "total_stages": total_stages,
            "progress_percent": (current / total_stages) * 100,
            "stages_remaining": max(0, total_stages - current),
        }
    
    def get_messages_for_stage(self, stage: ScamStage = None) -> List[str]:
        """Get predefined messages for a stage"""
        stage = stage or self.get_current_stage()
        
        if self.profile and stage in self.profile.typical_flow:
            messages = self.profile.typical_flow[stage]
            
            # Vary messages based on difficulty
            if self.difficulty == "easy":
                # Show more obvious messages
                return messages[:2]
            elif self.difficulty == "medium":
                return messages[:3]
            else:
                # Show all messages with added sophistication
                return self._add_sophistication(messages)
        
        return []
    
    def _add_sophistication(self, messages: List[str]) -> List[str]:
        """Add sophistication to messages for hard difficulty"""
        sophistication_tweaks = {
            "remove_urgency_words": True,
            "improve_grammar": True,
            "use_formal_tone": True,
            "add_technical_details": True,
        }
        
        # In a real implementation, would use AI to enhance messages
        return messages
    
    def should_inject_fake_media(self) -> bool:
        """Determine if fake media should be injected at this stage"""
        stage = self.get_current_stage()
        
        # Fake media during problem/solution stages
        if stage in [ScamStage.CREATE_PROBLEM, ScamStage.PROVIDE_SOLUTION, ScamStage.REQUEST_ACTION]:
            return True
        return False
    
    def get_fake_media_for_stage(self, stage: ScamStage = None) -> Optional[Dict[str, Any]]:
        """Get fake media appropriate for current stage"""
        stage = stage or self.get_current_stage()
        
        fake_media_templates = {
            ScammerType.BANK_AGENT: {
                ScamStage.CREATE_PROBLEM: {
                    "type": "screenshot",
                    "description": "Fake account alert screenshot",
                    "content": "Account Activity Alert: Unauthorized transaction detected ₹50,000",
                },
                ScamStage.PROVIDE_SOLUTION: {
                    "type": "verification_screen",
                    "description": "Fake verification interface screenshot",
                    "content": "Bank Security Verification - Enter OTP",
                },
                ScamStage.REQUEST_ACTION: {
                    "type": "countdown_timer",
                    "description": "Fake countdown timer",
                    "content": "2:34 - Account will be locked",
                },
            },
            ScammerType.DELIVERY_COMPANY: {
                ScamStage.CREATE_PROBLEM: {
                    "type": "delivery_receipt",
                    "description": "Fake delivery tracking image",
                    "content": "Order delayed, verification required",
                },
                ScamStage.REQUEST_ACTION: {
                    "type": "payment_form",
                    "description": "Fake payment verification form",
                    "content": "Payment Verification Required",
                },
            },
            ScammerType.GOVERNMENT_OFFICIAL: {
                ScamStage.CREATE_PROBLEM: {
                    "type": "official_document",
                    "description": "Fake income tax notice",
                    "content": "Income Tax Department - Official Notice",
                },
                ScamStage.REQUEST_ACTION: {
                    "type": "payment_instruction",
                    "description": "Fake payment instruction with bank details",
                    "content": "Payment Instructions: HDFC Bank Account XXXX7890",
                },
            },
        }
        
        scammer_media = fake_media_templates.get(self.scammer_type, {})
        return scammer_media.get(stage)
    
    def generate_followup_message(self, player_response: str) -> Optional[str]:
        """Generate adaptive follow-up based on player's last message"""
        
        # Detect if player is asking questions (skeptical)
        if "?" in player_response or any(word in player_response.lower() 
                                         for word in ["why", "how", "verify", "confirm"]):
            return self._generate_reassurance_message()
        
        # Detect if player seems to be declining
        if any(word in player_response.lower() 
               for word in ["no", "don't", "won't", "can't", "suspicious", "scam"]):
            return self._generate_pressure_intensification()
        
        # Player seems to be complying
        return self._generate_next_step_message()
    
    def _generate_reassurance_message(self) -> str:
        """Generate message to reassure skeptical player"""
        reassurance_templates = {
            ScammerType.BANK_AGENT: [
                "This is a standard security procedure. Many customers go through this daily.",
                "Your information is completely safe - we're encrypting everything.",
                "Bank security protocols are just to protect your account from real threats.",
            ],
            ScammerType.DELIVERY_COMPANY: [
                "This verification process is required by our payment processor.",
                "You've already purchased from us before - this is just standard re-verification.",
                "The verification helps prevent fraud on your account.",
            ],
            ScammerType.GOVERNMENT_OFFICIAL: [
                "This is a formal but simple process - thousands do this every day.",
                "The government website has full details about this procedure.",
                "Early compliance shows good faith and usually results in closure.",
            ],
        }
        
        messages = reassurance_templates.get(self.scammer_type, [])
        return random.choice(messages) if messages else "Don't worry, this is completely safe."
    
    def _generate_pressure_intensification(self) -> str:
        """Generate message to pressure resistant player"""
        pressure_templates = {
            ScammerType.BANK_AGENT: [
                "⚠️ This is your FINAL warning - your account locks in 2 minutes",
                "We can't help if you don't cooperate. This is standard procedure.",
                "Other customers verified immediately. Please don't delay further.",
            ],
            ScammerType.DELIVERY_COMPANY: [
                "⏰ Verification must be done TODAY or package returns to sender",
                "Our system will auto-cancel in 30 minutes without verification",
                "This is your last chance - closure happens automatically after deadline",
            ],
            ScammerType.GOVERNMENT_OFFICIAL: [
                "⚡ CRITICAL: Non-compliance will result in legal action",
                "Your next refusal triggers automatic proceedings",
                "Time is running out. Cooperation shows you're taking this seriously.",
            ],
        }
        
        messages = pressure_templates.get(self.scammer_type, [])
        return random.choice(messages) if messages else "This is urgent. Please respond now."
    
    def _generate_next_step_message(self) -> str:
        """Generate message to guide compliant player to next step"""
        next_step_templates = {
            ScammerType.BANK_AGENT: [
                "Perfect. Now please share the 6-digit OTP sent to your registered mobile.",
                "Great! Next, confirm the CVV (3 digits) from the back of your card.",
                "Thank you. One more verification step - your card's expiry date please.",
            ],
            ScammerType.DELIVERY_COMPANY: [
                "Excellent! Please click the link to complete payment verification.",
                "Thanks! One final step - enter your card details for confirmed delivery.",
                "Perfect! Now verify your address and payment method before delivery.",
            ],
            ScammerType.FRIEND_CONTACT: [
                "Thanks man! Can you share your account/UPI right away?",
                "Appreciate it bro! Just need 5 minutes for the transfer.",
                "You're amazing! Let me know once you've sent it 🙏",
            ],
        }
        
        messages = next_step_templates.get(self.scammer_type, [])
        return random.choice(messages) if messages else "Thank you for confirming. Let's proceed."
    
    def get_scam_completion_percentage(self) -> float:
        """Calculate how far the scam has progressed (0-100)"""
        total_stages = len(self.flow)
        completed_stages = self.current_stage_index
        
        # If player has fallen for scam
        if self.current_stage_index >= total_stages:
            return 100.0
        
        return (completed_stages / total_stages) * 100
    
    def is_scam_complete(self) -> bool:
        """Check if scam has reached completion"""
        return self.current_stage_index >= len(self.flow)
    
    def get_flow_summary(self) -> Dict[str, Any]:
        """Get summary of scam flow"""
        return {
            "scammer_type": self.scammer_type.value,
            "difficulty": self.difficulty,
            "total_stages": len(self.flow),
            "stages": [stage.value for stage in self.flow],
            "current_stage": self.get_current_stage().value,
            "progress": self.get_stage_progress(),
        }
