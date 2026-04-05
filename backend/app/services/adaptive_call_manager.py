"""
Adaptive Scammer Engine for Round 1 (Call Simulation)
Handles difficulty-aware phase transitions and response selection.
"""

import random
from typing import Dict, List, Any, Optional
from app.constants.scenario_types import CallPhase
from app.models.game_state import CallState
from app.utils.logger import get_logger

log = get_logger(__name__)

class AdaptiveCallManager:
    """Manages the adaptive flow of a scam call based on difficulty and user actions."""

    # Phase Transition Logic (DIFFICULTY-AWARE)
    @staticmethod
    def get_next_phase(current_phase: CallPhase, difficulty: str, user_action: str) -> CallPhase:
        """Determines the next phase based on difficulty and user action."""
        
        # Terminal actions (Success = Scammer Won, Failure = Scammer Failed/User Won)
        if user_action == "share":
            return CallPhase.SUCCESS # Scammer succeeded
        if user_action in ["hang_up", "block"]:
            return CallPhase.FAILURE # Scammer failed (User won)

        if difficulty == "easy":
            # SHORTER: Authority -> Urgency (ask for payment) [skips Pressure for shorter conversation]
            if current_phase == CallPhase.AUTHORITY:
                return CallPhase.URGENCY
            elif current_phase == CallPhase.URGENCY:
                return CallPhase.URGENCY # Stay in urgency, asking for details
            
        elif difficulty == "medium":
            # SHORTER: Authority -> Urgency (fewer exchanges)
            if user_action == "ask_verification":
                return CallPhase.TRUST
            elif user_action in ["resist", "doubt"]:
                return CallPhase.URGENCY
            elif current_phase == CallPhase.AUTHORITY:
                return CallPhase.URGENCY
            elif current_phase == CallPhase.TRUST:
                return CallPhase.URGENCY
            elif current_phase == CallPhase.URGENCY:
                return CallPhase.URGENCY  # Stay in urgency asking for payment
            
        elif difficulty == "hard":
            # SHORTER: Still adaptive but faster progression
            if user_action == "resist":
                # If resisting, try to build trust or move to urgency
                return random.choice([CallPhase.TRUST, CallPhase.URGENCY])
            elif user_action == "engage":
                # If engaging, move to urgency
                return CallPhase.URGENCY
            elif user_action == "ask_verification":
                # Hard scammers handle verification by building trust
                return CallPhase.TRUST
            
            # Default progression for hard - skip pressure, go straight to urgency
            if current_phase == CallPhase.AUTHORITY:
                return random.choice([CallPhase.URGENCY, CallPhase.TRUST])
            elif current_phase == CallPhase.TRUST:
                return CallPhase.URGENCY
            elif current_phase == CallPhase.URGENCY:
                return CallPhase.URGENCY  # Stay in urgency asking for payment
                
        return current_phase

    @staticmethod
    def update_user_profile(call_state: CallState, user_action: str):
        """Updates user behavioral profile based on their actions."""
        if user_action in ["ask_verification", "resist", "doubt"]:
            call_state.is_cautious = True
            call_state.is_impulsive = False
        elif user_action in ["share", "agree", "follow_instructions"]:
            call_state.is_impulsive = True
            call_state.is_cautious = False

    @staticmethod
    def get_action_type(user_message: str) -> str:
        """Heuristically determines the type of user action from their message/choice."""
        msg = user_message.lower()
        
        # Explicit terminal actions from UI buttons
        if any(word in msg for word in ["hang up", "hangup", "block", "decline", "disconnect", "leave"]):
            return "hang_up"

        # Content-based heuristic
        if any(word in msg for word in ["share", "give", "send", "otp", "password", "cvv", "card", "confirm", "transaction", "transfer", "complete"]):
            return "share"
        if any(word in msg for word in ["why", "who", "id", "verify", "proof", "badge", "official", "credentials"]):
            return "ask_verification"
        if any(word in msg for word in ["no", "stop", "don't", "wait", "not sure", "fake", "scam", "resist", "refuse"]):
            return "resist"
        if any(word in msg for word in ["okay", "yes", "sure", "tell me", "how", "process", "agree", "proceed"]):
            return "engage"
        
        return "neutral"
