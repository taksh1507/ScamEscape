"""
Round 2 (WhatsApp) Game Manager
Orchestrates the full Round 2 gameplay with all systems integrated
"""

import asyncio
import time
import random
from typing import Dict, List, Optional, Any, Callable

from app.models.round2_models import (
    Round2GameState, PlayerGameState, WhatsAppMessage, RoundResult
)
from app.constants.whatsapp_types import (
    ScammerType, ScamStage, MessageType, PowerUp, RedFlag
)
from app.services.behavior_detector import BehaviorDetector
from app.services.warning_system import WarningSystem
from app.services.time_pressure import TimePressureSystem
from app.services.scam_flow_manager import MultiStepScamFlow
from app.services.power_up_system import PowerUpSystem
from app.services.psychological_scorer import PsychologicalScorer
from app.constants.scammer_profiles import get_scammer_profile
from app.state.player_store import get_player
from app.utils.logger import get_logger

log = get_logger(__name__)


class Round2GameManager:
    """Manages complete Round 2 gameplay lifecycle"""
    
    def __init__(self, room_code: str, difficulty: str = "medium"):
        self.room_code = room_code
        self.difficulty = difficulty
        
        # Core game state
        self.game_state = Round2GameState(
            room_code=room_code,
            difficulty=difficulty
        )
        
        # Integrated systems
        self.behavior_detector = BehaviorDetector()
        self.warning_system = WarningSystem()
        self.time_pressure_system = TimePressureSystem(
            base_countdown_seconds=self._get_countdown_for_difficulty(difficulty)
        )
        self.power_up_system = PowerUpSystem()
        self.psychological_scorer = PsychologicalScorer()
        
        # Scam flow management
        self.scam_flow: Optional[MultiStepScamFlow] = None
        
        # Message queue for async delivery
        self.pending_messages: Dict[str, List[WhatsAppMessage]] = {}
        self.message_delivery_times: Dict[str, List[float]] = {}
        
        # 🔥 CRITICAL: Lock scammer type to prevent changes during game
        self._scammer_type_locked = False
        self._initial_scammer_type = None
        
        # 🔥 CRITICAL: Lock family member persona to prevent mid-game switching
        self._family_member_locked = None  # Stores selected persona (Mom, Dad, Brother, etc.)
        
        # 🔥 CRITICAL: Store institution and persona for all follow-up calls
        self._institution: Optional[str] = None
        self._persona_name: Optional[str] = None
    
    def _get_countdown_for_difficulty(self, difficulty: str) -> int:
        """Get countdown duration based on difficulty - INCREASED"""
        return {
            "easy": 900,      # 15 minutes (was 5)
            "medium": 600,    # 10 minutes (was 2)
            "hard": 300,      # 5 minutes (was 1)
        }.get(difficulty, 600)
    
    def _get_scammer_type(self) -> ScammerType:
        """🔥 CRITICAL: Get scammer type with lock enforcement"""
        if self._scammer_type_locked and self._initial_scammer_type:
            # Always return the locked type
            if self.game_state.scammer_type != self._initial_scammer_type:
                log.warning(f"⚠️ [SCAMMER_TYPE_MISMATCH] Detected attempt to change scammer type!")
                log.warning(f"   Expected: {self._initial_scammer_type.value}")
                log.warning(f"   Got: {self.game_state.scammer_type.value}")
                # Force back to locked type
                self.game_state.scammer_type = self._initial_scammer_type
                log.info(f"   🔒 Restored locked type: {self._initial_scammer_type.value}")
            return self._initial_scammer_type
        return self.game_state.scammer_type
    
    # ─── Game Initialization ─────────────────────────────────────────────────
    
    async def initialize_game(
        self,
        player_ids: List[str],
        scammer_types: Optional[List[ScammerType]] = None
    ) -> Dict[str, Any]:
        """Initialize Round 2 game for given players"""
        
        # Initialize player states
        for player_id in player_ids:
            self.game_state.player_states[player_id] = PlayerGameState(
                player_id=player_id
            )
            self.behavior_detector.record_message  # Initialize behavior tracking
            self.power_up_system.initialize_player(player_id)
        
        # Select scammer type - include RELATIVE_CONTACT for more realistic family impersonation
        if scammer_types:
            self.game_state.scammer_type = random.choice(scammer_types)
        else:
            # 🔥 Always include RELATIVE_CONTACT - it's the most emotionally manipulative
            available_types = list(ScammerType)
            # Slightly weight towards RELATIVE_CONTACT for training impact
            weighted_types = available_types + [ScammerType.RELATIVE_CONTACT, ScammerType.FRIEND_CONTACT]
            self.game_state.scammer_type = random.choice(weighted_types)
        
        # 🔥 CRITICAL: Lock scammer type immediately after selection
        self._initial_scammer_type = self.game_state.scammer_type
        self._scammer_type_locked = True
        log.info(f"🔒 [SCAMMER_TYPE_LOCKED] Type locked to: {self._initial_scammer_type.value}")
        
        # 🔥 CRITICAL: Lock family member persona for RELATIVE_CONTACT scams
        if self.game_state.scammer_type.value == "relative_contact":
            from app.services.ai_service import get_random_family_member
            self._family_member_locked = get_random_family_member()
            log.info(f"🔒 [FAMILY_MEMBER_LOCKED] Persona locked to: {self._family_member_locked}")
        
        # Initialize scam flow
        self.scam_flow = MultiStepScamFlow(
            scammer_type=self.game_state.scammer_type,
            difficulty=self.difficulty
        )
        
        # Generate message sequence
        await self._generate_message_sequence()
        
        log.info(f"Round 2 initialized - Scammer: {self.game_state.scammer_type.value}, "
                f"Difficulty: {self.difficulty}, Players: {len(player_ids)}")
        
        return {
            "scammer_type": self.game_state.scammer_type.value,
            "difficulty": self.difficulty,
            "scenario_id": self.game_state.scammer_type.value,
            "player_count": len(player_ids),
        }
    
    async def _generate_message_sequence(self) -> None:
        """Generate the complete message sequence using predefined templates"""
        
        from app.constants.round2_templates import get_template_for_scammer_type
        
        profile = get_scammer_profile(self.game_state.scammer_type)
        if not profile:
            log.warning(f"Profile not found for {self.game_state.scammer_type}, using fallback")
            from app.constants.scammer_profiles import get_random_profile
            profile = get_random_profile()
        
        timestamp = time.time()
        
        # 🔥 Get predefined template instead of generating with AI
        template = get_template_for_scammer_type(self.game_state.scammer_type)
        log.info(f"📋 [TEMPLATE SELECTED] Using template: {template.name}")
        
        # Store institution and persona from template
        self._institution = template.institution or profile.display_name
        self._persona_name = self._family_member_locked if self.game_state.scammer_type.value == "relative_contact" else None
        log.info(f"🔒 Institution='{self._institution}' Persona='{self._persona_name}'")
        
        # Create WhatsApp messages from template
        for i, message_text in enumerate(template.messages):
            # 🔥 Get response options from template (same for all messages in this template)
            response_options = template.response_options
            
            # 🔥 For RELATIVE_CONTACT, replace placeholder with locked persona
            if self.game_state.scammer_type.value == "relative_contact" and self._persona_name:
                message_text = message_text.replace("{persona_name}", self._persona_name)
                message_text = message_text.replace("{PERSONA_NAME}", self._persona_name.upper())
            
            msg = WhatsAppMessage(
                message_id=f"{self.room_code}_msg_{i}",
                sender=profile.display_name,
                timestamp=timestamp + (i * random.uniform(2, 8)),  # Variable delays
                content=message_text,
                message_type=MessageType.TEXT,
                response_options=response_options,  # 🔥 Use template options
            )
            
            self.game_state.message_sequence.append(msg)
            
            # Check for red flags in this message
            red_flags = self.warning_system.scan_message(
                player_id="admin",  # Scan during setup
                message=message_text,
                sender_info={
                    "is_known_contact": profile.scammer_type == ScammerType.FRIEND_CONTACT,
                    "is_verified": False,
                    "has_verified_badge": profile.has_verified_badge,
                    "is_actually_verified": False,
                }
            )
            msg.red_flags = [flag.flag for flag in red_flags]
        
        log.info(f"Generated {len(template.messages)} messages from template: {template.name}")
    
    # ─── Game Execution ──────────────────────────────────────────────────────
    
    async def start_round(self, broadcast_fn: Callable) -> None:
        """Start the Round 2 gameplay"""
        
        self.game_state.round_active = True
        self.game_state.stage_start_time = time.time()
        
        # Start countdown for first time pressure
        for player_id in self.game_state.player_states.keys():
            self.time_pressure_system.start_countdown(player_id)
        
        # Broadcast game start
        profile = get_scammer_profile(self.game_state.scammer_type)
        
        if not profile:
            log.error(f"Failed to get profile for scammer type: {self.game_state.scammer_type}")
            # Use default profile if not found
            from app.constants.scammer_profiles import get_random_profile
            profile = get_random_profile()
        
        # 🔥 For RELATIVE_CONTACT, use the locked family member persona
        display_name = profile.display_name
        if self.game_state.scammer_type.value == "relative_contact" and self._family_member_locked:
            display_name = self._family_member_locked
            log.info(f"✅ Using locked persona: {display_name}")
        
        await broadcast_fn(self.room_code, {
            "event": "round2_start",
            "scammer": {
                "name": display_name,
                "type": self.game_state.scammer_type.value,
                "has_verified_badge": profile.has_verified_badge,
                "profile_picture": profile.profile_picture_url,
            },
            "difficulty": self.difficulty,
            "message_count": len(self.game_state.message_sequence),
        })
        
        # Start message delivery loop
        asyncio.create_task(self._deliver_messages(broadcast_fn))
        asyncio.create_task(self._apply_time_pressure(broadcast_fn))
    
    async def _deliver_messages(self, broadcast_fn: Callable) -> None:
        """Deliver messages to players in sequence"""
        
        for i, message in enumerate(self.game_state.message_sequence):
            await asyncio.sleep(random.uniform(3, 8))  # Random delays between messages
            
            self.game_state.current_message_index = i
            
            # 🔥 Include response_options from template
            message_data = {
                "id": message.message_id,
                "sender": message.sender,
                "content": message.content,
                "type": message.message_type.value,
                "timestamp": message.timestamp,
                "has_pressure": message.is_pressure_message,
            }
            
            # Add response_options if they exist
            if message.response_options:
                message_data["response_options"] = message.response_options
            
            await broadcast_fn(self.room_code, {
                "event": "new_message",
                "message": message_data,
            })
    
    async def _apply_time_pressure(self, broadcast_fn: Callable) -> None:
        """Apply dynamic time pressure to players"""
        
        while self.game_state.round_active:
            await asyncio.sleep(5)  # Check every 5 seconds
            
            for player_id in self.game_state.player_states.keys():
                remaining = self.time_pressure_system.get_countdown_remaining(player_id)
                
                if remaining is None or remaining <= 0:
                    continue
                
                # Send pressure message
                pressure_msg = self.time_pressure_system.get_next_pressure_message(player_id)
                if pressure_msg:
                    await broadcast_fn(self.room_code, {
                        "event": "pressure_message",
                        "player_id": player_id,
                        "message": pressure_msg.message,
                        "countdown_text": pressure_msg.countdown_text,
                        "pressure_level": pressure_msg.pressure_level.name,
                    })
    
    # ─── Player Actions ──────────────────────────────────────────────────────
    
    async def handle_player_message(
        self,
        player_id: str,
        message: str,
        timestamp: float = None
    ) -> Dict[str, Any]:
        """Handle player's text response with template-based follow-up"""
        
        from app.constants.round2_templates import get_template_for_scammer_type
        
        timestamp = timestamp or time.time()
        player_state = self.game_state.player_states.get(player_id)
        
        if not player_state:
            return {"error": "Player not in game"}
        
        # Record message and behavior
        player_state.messages_sent.append(message)
        self.behavior_detector.record_message(player_id, message, timestamp)
        
        # Get player's behavior profile
        behavior_profile = self.behavior_detector.get_behavior_profile(player_id)
        
        # 🔥 Use template-based response only (no AI generation)
        template = get_template_for_scammer_type(self.game_state.scammer_type)
        
        # Use a generic pressure message from template messages or default response
        template_response = "I see you're trying to buy time. Stop being suspicious and just help me out! This is urgent!"
        
        return {
            "status": "received",
            "ai_response": template_response,  # Template-based response only
            "behavior_profile": behavior_profile.value if behavior_profile else None
        }
    
    async def handle_player_action(
        self,
        player_id: str,
        action: str,  # "click_link", "share_otp", "ask_question", "ignore", "block", etc.
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle player action with predefined scammer responses and game completion logic"""
        
        from app.constants.round2_templates import get_template_for_scammer_type
        
        player_state = self.game_state.player_states.get(player_id)
        if not player_state:
            return {"error": "Player not in game"}
        
        context = context or {}
        timestamp = time.time()
        
        # Record action
        player_state.actions_taken.append({
            "action": action,
            "timestamp": timestamp,
            "context": context,
        })
        self.behavior_detector.record_action_taken(player_id, action, timestamp)
        
        # Determine impact
        impact = self._evaluate_action_impact(player_id, action, context)
        
        # 🔥 Get predefined scammer response from template
        template = get_template_for_scammer_type(self.game_state.scammer_type)
        scammer_response = template.responses.get(action) if hasattr(template, 'responses') else None
        
        locked_scammer_type = self._get_scammer_type()  # 🔥 Use locked type
        
        # Check if player clicked a malicious link (fell for it)
        if action == "click_link":
            # 🔥 Log click_link action with full context
            log.info(f"🚨 [CLICK_LINK] Player {player_id} clicked malicious link!")
            log.info(f"   Game State: {self.game_state.scammer_type.value}")
            log.info(f"   Player Score Before: {player_state.score}")
            log.info(f"   Scam Completion: {player_state.scam_completion_percentage}%")
            
            player_state.fell_for_scam = True
            player_state.scam_completion_percentage = 100.0
            
            log.info(f"   Updated Scam Completion: {player_state.scam_completion_percentage}%")
            
            await self._end_round(player_id)
            log.info(f"   Round ended for player {player_id}")
            
            # Get final score
            final_results = await self.finish_game()
            
            log.info(f"   Final Results: {final_results}")
            
            result = {
                "status": "game_ended",
                "action": action,
                "result": "fell_for_scam",
                "impact": impact,
                "scam_progress": player_state.scam_completion_percentage,
                "game_result": final_results.get(player_id).dict() if player_id in final_results else None
            }
            
            log.info(f"✅ [CLICK_LINK SUCCESS] Game ended for player {player_id}")
            log.info(f"   Response: {result}")
            
            return result
        
        # Check if player blocked or reported (GOOD actions - continue game with scoring)
        if action in ["block", "report", "ignore"]:
            # Award points for safe action
            points_awarded = 15 if action == "block" else 20 if action == "report" else 10
            player_state.score += points_awarded
            
            # Add positive behavior tracking
            player_state.actions_taken.append({
                "action": action,
                "timestamp": timestamp,
                "points_awarded": points_awarded,
                "context": context,
            })
            
            # Generate helpful tip based on action and scammer type
            tips = {
                "block": [
                    "✅ Great! Blocking prevents further contact from this scammer.",
                    "💡 Tip: Always block contacts that seem suspicious before they gain your trust."
                ],
                "report": [
                    "✅ Excellent! Reporting helps protect others from the same scammer.",
                    "💡 Tip: Report to WhatsApp, Cyber Crime Cell, or your bank immediately when you suspect fraud."
                ],
                "ignore": [
                    "✅ Smart! Ignoring suspicious messages is the safest option.",
                    "💡 Tip: Don't engage with unknown contacts - ignore first, block next."
                ]
            }
            
            selected_tip = tips.get(action, ["Good action!", "Continue staying safe!"])
            
            # 🔥 Generate scammer response based on action
            response_messages = {
                "block": "Hmm, seems like you blocked me. No problem, there are plenty of other opportunities! 😊",
                "report": "Oh no! I'm being reported? This conversation will be deleted automatically, no worries! 🙈",
                "ignore": "Still interested in that investment opportunity? It's time-limited, friend! ⏰"
            }
            
            response_message = response_messages.get(action, scammer_response or "")
            
            # 🔥 Use predefined scammer response from template ONLY (no fallback)
            ai_followup = scammer_response or response_message  # Template response or generated message
            
            result = {
                "status": "action_recorded",
                "action": action,
                "points_awarded": points_awarded,
                "total_score": player_state.score,
                "tip": selected_tip[0],
                "suggestion": selected_tip[1],
                "scam_progress": player_state.scam_completion_percentage,
                "continue_game": True,
                "response_message": response_message,  # 🔥 Send response for display in chat
                "ai_response": ai_followup  # 🔥 Continue game with template response
            }
            return result

        # Check if action completes the scam (fell for it)
        if action in ["share_otp", "share_card_details", "confirm_payment"]:
            player_state.fell_for_scam = True
            player_state.scam_completion_percentage = 100.0
            await self._end_round(player_id)
            
            # Get final score
            final_results = await self.finish_game()
            result = {
                "status": "game_ended",
                "action": action,
                "result": "fell_for_scam",
                "impact": impact,
                "scam_progress": player_state.scam_completion_percentage,
                "game_result": final_results.get(player_id).dict() if player_id in final_results else None
            }
            return result
        
        # Handle additional safe actions that continue the game with scoring
        if action in ["verify", "call_bank", "ask_question"]:
            points_awarded = 12 if action == "verify" else 18 if action == "call_bank" else 8
            player_state.score += points_awarded
            
            player_state.actions_taken.append({
                "action": action,
                "timestamp": timestamp,
                "points_awarded": points_awarded,
                "context": context,
            })
            
            tips = {
                "verify": [
                    "✅ Good instinct checking authenticity!",
                    "💡 Only use official contact numbers from bank website, never from messages!"
                ],
                "call_bank": [
                    "✅ Excellent security move!",
                    "🏦 Tip: Banks NEVER ask for OTP or passwords over calls - red flag alert!"
                ],
                "ask_question": [
                    "✅ Smart! Asking questions to verify identity!",
                    "💡 Tip: Legitimate organizations can verify details without sensitive info."
                ]
            }
            
            selected_tip = tips.get(action, ["Good action!", "Stay safe!"])
            
            # 🔥 Generate scammer response based on action
            response_messages = {
                "verify": "Don't worry, everything is genuine! But you need to act fast, the offer expires in 2 hours...",
                "call_bank": "Smart move, but remember - the bank's fraud team knows about this and approved it! Call them back quickly! ⚡",
                "ask_question": "All legitimate! I'm an authorized partner. Let me send you the documents now... What's the best email?"
            }
            
            response_message = response_messages.get(action, scammer_response or "")
            
            # 🔥 Use predefined scammer response from template ONLY (no fallback)
            ai_followup = scammer_response or response_message
            
            result = {
                "status": "action_recorded",
                "action": action,
                "points_awarded": points_awarded,
                "total_score": player_state.score,
                "tip": selected_tip[0],
                "suggestion": selected_tip[1],
                "scam_progress": player_state.scam_completion_percentage,
                "continue_game": True,
                "response_message": response_message,  # 🔥 Send response for display in chat
                "ai_response": ai_followup  # Continue with template message
            }
            return result
        
        result = {
            "status": "processed",
            "action": action,
            "impact": impact,
            "scam_progress": player_state.scam_completion_percentage,
        }
        
        return result
    
    async def handle_power_up_use(
        self,
        player_id: str,
        power_up: str  # PowerUp value as string
    ) -> Dict[str, Any]:
        """Handle player using a power-up"""
        
        try:
            power_up_enum = PowerUp(power_up)
        except ValueError:
            return {"error": f"Invalid power-up: {power_up}"}
        
        player_state = self.game_state.player_states.get(player_id)
        if not player_state:
            return {"error": "Player not in game"}
        
        context = {
            "current_stage": self.scam_flow.get_current_stage().value,
            "scam_progress": self.scam_flow.get_scam_completion_percentage(),
            "time_remaining": self.time_pressure_system.get_countdown_remaining(player_id),
        }
        
        result = self.power_up_system.use_power_up(player_id, power_up_enum, context)
        
        # Handle special power-up effects
        if power_up == "delay_response":
            # Pause countdown for this player
            remaining = self.time_pressure_system.get_countdown_remaining(player_id)
            if remaining:
                self.time_pressure_system.stop_countdown(player_id)
                asyncio.create_task(
                    self._resume_countdown_after_delay(player_id, 120)  # 2 min delay
                )
        
        elif power_up == "block_caller":
            # End game immediately (blocked successfully)
            player_state.game_completed = True
            player_state.completion_time = time.time()
        
        elif power_up == "report_scam":
            # End game with good score
            player_state.game_completed = True
            player_state.completion_time = time.time()
        
        return {
            "status": result["result"],
            "message": result["message"],
            "effectiveness": result["effectiveness"],
        }
    
    async def _resume_countdown_after_delay(self, player_id: str, delay_seconds: int) -> None:
        """Resume countdown after delay power-up"""
        await asyncio.sleep(delay_seconds)
        remaining = self.time_pressure_system.get_countdown_remaining(player_id)
        if remaining is None:  # Was stopped
            new_deadline = time.time() + 60  # Resume with 1 minute
            self.time_pressure_system.active_countdowns[player_id] = new_deadline
    
    def _get_response_options_for_message(
        self,
        scammer_type: ScammerType,
        message_text: str
    ) -> List[Dict[str, str]]:
        """🔥 Generate user response options based on scammer type"""
        
        options_map = {
            ScammerType.TECH_SUPPORT: [
                {"label": "Click here to fix malware", "action": "click_link", "risk": "high"},
                {"label": "Call support number", "action": "call", "risk": "high"},
                {"label": "Skip and ignore", "action": "ignore", "risk": "low"},
            ],
            ScammerType.BANK_AGENT: [
                {"label": "Verify account now", "action": "click_link", "risk": "high"},
                {"label": "Share OTP", "action": "share_otp", "risk": "high"},
                {"label": "Call my bank", "action": "call_bank", "risk": "low"},
            ],
            ScammerType.RELATIVE_CONTACT: [
                {"label": "Send money immediately", "action": "confirm_payment", "risk": "high"},
                {"label": "Ask for proof", "action": "ask_question", "risk": "low"},
                {"label": "Block them", "action": "block", "risk": "low"},
            ],
            ScammerType.INVESTMENT_ADVISOR: [
                {"label": "Join investment scheme", "action": "click_link", "risk": "high"},
                {"label": "Send money for scheme", "action": "confirm_payment", "risk": "high"},
                {"label": "Ask more details", "action": "ask_question", "risk": "low"},
            ],
            ScammerType.GOVERNMENT_OFFICIAL: [
                {"label": "Pay fine online", "action": "click_link", "risk": "high"},
                {"label": "Share Aadhaar/PAN", "action": "share_card_details", "risk": "high"},
                {"label": "Report to authorities", "action": "report", "risk": "low"},
            ],
            ScammerType.DELIVERY_COMPANY: [
                {"label": "Pay delivery fee", "action": "click_link", "risk": "high"},
                {"label": "Share card details", "action": "share_card_details", "risk": "high"},
                {"label": "Contact company directly", "action": "call", "risk": "low"},
            ],
            ScammerType.TELECOM_OPERATOR: [
                {"label": "Claim offer now", "action": "click_link", "risk": "high"},
                {"label": "Share SIM/PIN", "action": "share_otp", "risk": "high"},
                {"label": "Verify with provider", "action": "call", "risk": "low"},
            ],
            ScammerType.FRIEND_CONTACT: [
                {"label": "Send money ASAP", "action": "confirm_payment", "risk": "high"},
                {"label": "Ask what happened", "action": "ask_question", "risk": "low"},
                {"label": "Block contact", "action": "block", "risk": "low"},
            ],
        }
        
        return options_map.get(scammer_type, options_map[ScammerType.BANK_AGENT])
    
    def _evaluate_action_impact(
        self,
        player_id: str,
        action: str,
        context: Dict
    ) -> Dict[str, Any]:
        """Evaluate the impact of a player action"""
        
        impacts = {
            "click_link": {
                "severity": "high",
                "progress_increase": 20,
                "message": "You clicked a suspicious link - your device may be compromised"
            },
            "share_otp": {
                "severity": "critical",
                "progress_increase": 50,
                "message": "Sharing OTP is extremely dangerous - scammer now has full access"
            },
            "share_card_details": {
                "severity": "critical",
                "progress_increase": 50,
                "message": "Card details shared - funds can be stolen"
            },
            "confirm_payment": {
                "severity": "critical",
                "progress_increase": 50,
                "message": "You sent money - you fell for the scam!"
            },
            "call": {
                "severity": "high",
                "progress_increase": 25,
                "message": "Remote access given - scammer can steal your data"
            },
            "ignore": {
                "severity": "low",
                "progress_increase": -5,
                "message": "Good - you ignored the message"
            },
            "block": {
                "severity": "low",
                "progress_increase": -10,
                "message": "Excellent - you blocked the scammer! +100 Points"
            },
            "report": {
                "severity": "low",
                "progress_increase": -10,
                "message": "Great job reporting the scam! +100 Points"
            },
            "ask_question": {
                "severity": "low",
                "progress_increase": -5,
                "message": "Good - you're skeptical and asking questions"
            },
            "call_bank": {
                "severity": "low",
                "progress_increase": -5,
                "message": "Smart - you contacted official channels"
            },
        }
        
        impact = impacts.get(action, {
            "severity": "unknown",
            "progress_increase": 0,
            "message": "Action recorded"
        })
        
        # Update scam progress
        player_state = self.game_state.player_states[player_id]
        player_state.scam_completion_percentage = max(
            0, 
            min(100, player_state.scam_completion_percentage + impact["progress_increase"])
        )
        
        return impact
    
    def _analyze_user_sentiment(self, message: str) -> str:
        """Analyze user message to detect sentiment and engagement level"""
        message_lower = message.lower()
        
        # Keywords for different sentiment types
        skepticism_keywords = ['fake', 'scam', 'suspicious', 'doubt', 'weird', 'strange', 'not sure', 'verify', 'proof', 'official', 'confirm']
        naive_keywords = ['ok', 'sure', 'yes', 'ready', 'lets', 'send', 'pay', 'transfer', 'click', 'download']
        questioning_keywords = ['who', 'why', 'how', 'what', 'can', 'might you']
        
        # Count keyword occurrences
        skepticism_count = sum(1 for keyword in skepticism_keywords if keyword in message_lower)
        naive_count = sum(1 for keyword in naive_keywords if keyword in message_lower)
        questioning_count = sum(1 for keyword in questioning_keywords if keyword in message_lower)
        
        # Determine sentiment based on keyword counts
        if skepticism_count > naive_count:
            return "skeptical"
        elif naive_count > skepticism_count:
            return "naive"
        elif questioning_count > 0:
            return "questioning"
        else:
            return "neutral"
    
    # ─── Game Completion ─────────────────────────────────────────────────────
    
    async def _end_round(self, player_id: str = None) -> None:
        """End the round for a player or all players"""
        
        if player_id:
            player_state = self.game_state.player_states.get(player_id)
            if player_state:
                player_state.game_completed = True
                player_state.completion_time = time.time()
        else:
            # End for all players
            self.game_state.round_active = False
            for player_state in self.game_state.player_states.values():
                player_state.game_completed = True
                player_state.completion_time = time.time()
    
    async def finish_game(self) -> Dict[str, RoundResult]:
        """Calculate final results for all players - includes Round 1 + Round 2 combined score"""
        
        self.game_state.round_completed = True
        results: Dict[str, RoundResult] = {}
        
        for player_id, player_state in self.game_state.player_states.items():
            # Get behavior metrics
            behavior_summary = self.behavior_detector.generate_behavior_summary(player_id)
            warning_summary = self.warning_system.get_warning_summary(player_id)
            power_up_analytics = self.power_up_system.get_power_up_analytics(player_id)
            
            # Calculate final score
            final_score = self.psychological_scorer.calculate_final_score(player_id)
            round2_score = int(final_score["final_score"])
            
            # 🔥 If player fell for scam, assign 0 points for Round 2
            if player_state.fell_for_scam:
                round2_score = 0
            
            # Get Round 1 score from player store
            player_data = get_player(player_id)
            round1_score = player_data.score if player_data else 0
            
            # 🔥 CRITICAL FIX: If scammed, total score = 0 (not round1 + 0)
            if player_state.fell_for_scam:
                total_combined_score = 0
            else:
                # Calculate total combined score: Round 1 points + Round 2 if not scammed
                total_combined_score = round1_score + round2_score
            
            # Determine key mistakes
            key_mistakes = warning_summary.get("key_missed_warnings", [])
            
            # Calculate learning score (0-100, higher is better)
            learning_score = 100 - player_state.scam_completion_percentage
            if power_up_analytics.get("success_rate", 0) > 0.5:
                learning_score += 15
            
            # Create final result with combined score
            result = RoundResult(
                player_id=player_id,
                room_code=self.room_code,
                scammer_type=self.game_state.scammer_type,
                difficulty=self.difficulty,
                duration_seconds=player_state.completion_time - self.game_state.stage_start_time 
                    if player_state.completion_time else 0,
                total_score=total_combined_score,  # Combined Round 1 + Round 2 score
                mistakes_made=len(player_state.actions_taken),
                correct_decisions=len([a for a in player_state.actions_taken 
                                      if a["action"] in ["ignore", "block", "ask_question"]]),
                behavior_profile=behavior_summary.get("profile", "unknown"),
                avg_response_time=behavior_summary.get("avg_response_time_seconds", 0),
                questions_asked=behavior_summary.get("questions_asked", 0),
                panic_level=int(final_score["panic_score"]),
                total_warnings=warning_summary.get("total_warnings_detected", 0),
                warnings_ignored=warning_summary.get("total_warnings_ignored", 0),
                critical_mistakes=warning_summary.get("critical_violations", 0),
                fell_for_scam=player_state.fell_for_scam,
                scam_completion_percentage=player_state.scam_completion_percentage,
                key_mistakes=key_mistakes,
                improvement_areas=self.psychological_scorer.get_behavioral_insights(
                    player_id
                ).get("weaknesses", []),
                learning_score=learning_score,
            )
            
            # Add round1_score to result dict for frontend
            result_dict = result.dict()
            result_dict["round1_score"] = round1_score
            result_dict["round2_score"] = round2_score
            result_dict["won"] = not player_state.fell_for_scam
            result_dict["tip"] = "Never click suspicious links or share personal information. Verify by calling official numbers!" if player_state.fell_for_scam else "Great job! You successfully avoided the scam!"
            
            results[player_id] = result_dict
        
        return results
