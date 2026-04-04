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
from app.services.ai_scam_generator import AIScamGenerator
from app.constants.scammer_profiles import get_scammer_profile
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
    
    def _get_countdown_for_difficulty(self, difficulty: str) -> int:
        """Get countdown duration based on difficulty - INCREASED"""
        return {
            "easy": 900,      # 15 minutes (was 5)
            "medium": 600,    # 10 minutes (was 2)
            "hard": 300,      # 5 minutes (was 1)
        }.get(difficulty, 600)
    
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
        
        # Select scammer type
        self.game_state.scammer_type = (
            random.choice(scammer_types) if scammer_types 
            else random.choice(list(ScammerType))
        )
        
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
        """Generate the complete message sequence using AI-based dynamic scenarios"""
        
        profile = get_scammer_profile(self.game_state.scammer_type)
        if not profile:
            log.warning(f"Profile not found for {self.game_state.scammer_type}, using fallback")
            from app.constants.scammer_profiles import get_random_profile
            profile = get_random_profile()
        
        timestamp = time.time()
        
        # Try to generate AI-based messages first
        ai_messages = await AIScamGenerator.generate_scam_scenario(
            scammer_type=self.game_state.scammer_type,
            difficulty=self.difficulty,
            player_name=None
        )
        
        # If AI generation fails, fall back to predefined messages
        if not ai_messages:
            log.warning("AI message generation failed, using fallback messages")
            for stage in self.scam_flow.flow:
                ai_messages.extend(self.scam_flow.get_messages_for_stage(stage))
        
        # Create WhatsApp messages with AI content
        for i, message_text in enumerate(ai_messages):
            msg = WhatsAppMessage(
                message_id=f"{self.room_code}_msg_{i}",
                sender=profile.display_name,
                timestamp=timestamp + (i * random.uniform(2, 8)),  # Variable delays
                content=message_text,
                message_type=MessageType.TEXT,
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
        
        log.info(f"Generated {len(ai_messages)} dynamic AI scam messages for {self.game_state.scammer_type.value}")
    
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
        
        await broadcast_fn(self.room_code, {
            "event": "round2_start",
            "scammer": {
                "name": profile.display_name,
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
            
            await broadcast_fn(self.room_code, {
                "event": "new_message",
                "message": {
                    "id": message.message_id,
                    "sender": message.sender,
                    "content": message.content,
                    "type": message.message_type.value,
                    "timestamp": message.timestamp,
                    "has_pressure": message.is_pressure_message,
                },
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
        """Handle player's text response with AI-generated follow-up"""
        
        timestamp = timestamp or time.time()
        player_state = self.game_state.player_states.get(player_id)
        
        if not player_state:
            return {"error": "Player not in game"}
        
        # Record message and behavior
        player_state.messages_sent.append(message)
        self.behavior_detector.record_message(player_id, message, timestamp)
        
        # Get player's behavior profile
        behavior_profile = self.behavior_detector.get_behavior_profile(player_id)
        
        # Generate AI-powered adaptive follow-up from scammer
        ai_followup = await AIScamGenerator.generate_followup_message(
            scammer_type=self.game_state.scammer_type,
            context={
                "behavior_profile": behavior_profile.value if behavior_profile else "default",
                "last_player_message": message,
                "player_profile": f"Difficulty: {self.difficulty}",
                "scam_stage": self.scam_flow.get_current_stage().value if self.scam_flow else "initial"
            }
        )
        
        return {
            "status": "received",
            "ai_response": ai_followup,  # Send AI-generated response back
            "behavior_profile": behavior_profile.value if behavior_profile else None,
        }
    
    async def handle_player_action(
        self,
        player_id: str,
        action: str,  # "click_link", "share_otp", "ask_question", "ignore", "block", etc.
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle player action with AI-generated responses and game completion logic"""
        
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
        
        # Generate AI response for interactive actions
        ai_response = None
        if action in ["ask_question", "request_verification"]:
            question = context.get("question", "Can you verify this?")
            ai_response = await AIScamGenerator.generate_followup_message(
                scammer_type=self.game_state.scammer_type,
                context={
                    "behavior_profile": self.behavior_detector.get_behavior_profile(player_id).value if self.behavior_detector.get_behavior_profile(player_id) else "default",
                    "last_player_message": question,
                    "player_profile": f"Difficulty: {self.difficulty}",
                    "scam_stage": self.scam_flow.get_current_stage().value if self.scam_flow else "initial"
                }
            )
        
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
        
        # Check if player blocked or ignored (won the game)
        if action in ["block", "ignore"]:
            player_state.fell_for_scam = False
            player_state.scam_completion_percentage = 0.0
            player_state.game_completed = True
            player_state.completion_time = time.time()
            await self._end_round(player_id)
            
            # Get final score
            final_results = await self.finish_game()
            result = {
                "status": "game_ended",
                "action": action,
                "result": "successfully_blocked",
                "impact": impact,
                "scam_progress": player_state.scam_completion_percentage,
                "game_result": final_results.get(player_id).dict() if player_id in final_results else None
            }
            return result
        
        result = {
            "status": "processed",
            "action": action,
            "impact": impact,
            "scam_progress": player_state.scam_completion_percentage,
        }
        
        # Include AI response if available
        if ai_response:
            result["ai_response"] = ai_response
        
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
            "ignore": {
                "severity": "low",
                "progress_increase": -5,
                "message": "Good - you ignored the message"
            },
            "block": {
                "severity": "low",
                "progress_increase": -10,
                "message": "Excellent - you blocked the scammer"
            },
            "ask_question": {
                "severity": "low",
                "progress_increase": -5,
                "message": "Good - you're skeptical and asking questions"
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
        """Calculate final results for all players"""
        
        self.game_state.round_completed = True
        results: Dict[str, RoundResult] = {}
        
        for player_id, player_state in self.game_state.player_states.items():
            # Get behavior metrics
            behavior_summary = self.behavior_detector.generate_behavior_summary(player_id)
            warning_summary = self.warning_system.get_warning_summary(player_id)
            power_up_analytics = self.power_up_system.get_power_up_analytics(player_id)
            
            # Calculate final score
            final_score = self.psychological_scorer.calculate_final_score(player_id)
            
            # Determine key mistakes
            key_mistakes = warning_summary.get("key_missed_warnings", [])
            
            # Calculate learning score (0-100, higher is better)
            learning_score = 100 - player_state.scam_completion_percentage
            if power_up_analytics.get("success_rate", 0) > 0.5:
                learning_score += 15
            
            # Create final result
            result = RoundResult(
                player_id=player_id,
                room_code=self.room_code,
                scammer_type=self.game_state.scammer_type,
                difficulty=self.difficulty,
                duration_seconds=player_state.completion_time - self.game_state.stage_start_time 
                    if player_state.completion_time else 0,
                total_score=int(final_score["final_score"]),
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
            
            results[player_id] = result
        
        return results
