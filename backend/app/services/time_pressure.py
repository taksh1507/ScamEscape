"""
Time Pressure System for Round 2
Dynamically creates urgency and applies pressure based on game progression
"""

import time
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum


class PressureLevel(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class PressureMessage:
    """A pressure message to be sent to player"""
    message: str
    trigger_time: float  # When this should be sent
    pressure_level: PressureLevel
    is_countdown: bool = False
    countdown_text: str = ""  # "2 minutes left", etc.


class TimePressureSystem:
    """Manages time pressure and urgency dynamics"""
    
    def __init__(self, base_countdown_seconds: int = 120):
        self.base_countdown_seconds = base_countdown_seconds
        self.active_countdowns: Dict[str, float] = {}  # player_id -> deadline timestamp
        self.pressure_messages_sent: Dict[str, List[float]] = {}  # player_id -> list of send times
        self.pressure_callbacks: Dict[str, Callable] = {}
        self.player_pressure_history: Dict[str, List[Dict]] = {}
    
    def start_countdown(self, player_id: str, duration_seconds: int = None) -> float:
        """Start countdown timer for a player"""
        duration = duration_seconds or self.base_countdown_seconds
        deadline = time.time() + duration
        
        self.active_countdowns[player_id] = deadline
        self.pressure_messages_sent[player_id] = []
        self.player_pressure_history[player_id] = []
        
        return deadline
    
    def get_countdown_remaining(self, player_id: str) -> Optional[int]:
        """Get remaining countdown time in seconds"""
        if player_id not in self.active_countdowns:
            return None
        
        remaining = self.active_countdowns[player_id] - time.time()
        return max(0, int(remaining))
    
    def is_countdown_active(self, player_id: str) -> bool:
        """Check if countdown is still active"""
        if player_id not in self.active_countdowns:
            return False
        
        remaining = self.get_countdown_remaining(player_id)
        return remaining is not None and remaining > 0
    
    def stop_countdown(self, player_id: str) -> None:
        """Stop countdown for a player"""
        if player_id in self.active_countdowns:
            del self.active_countdowns[player_id]
    
    def get_next_pressure_message(self, player_id: str) -> Optional[PressureMessage]:
        """Get the next pressure message based on countdown progress"""
        remaining = self.get_countdown_remaining(player_id)
        if remaining is None or remaining <= 0:
            return None
        
        # Scale pressure messages based on time remaining
        pressure_messages = self._get_pressure_messages_for_stage(remaining)
        
        # Check if we should send next message
        if player_id not in self.pressure_messages_sent:
            self.pressure_messages_sent[player_id] = []
        
        for msg in pressure_messages:
            send_time = self.active_countdowns[player_id] - msg.trigger_time
            
            # If message hasn't been sent yet and it's time
            if send_time not in self.pressure_messages_sent[player_id]:
                self.pressure_messages_sent[player_id].append(send_time)
                return msg
        
        return None
    
    def _get_pressure_messages_for_stage(self, remaining_seconds: int) -> List[PressureMessage]:
        """Get appropriate pressure messages for current countdown stage"""
        messages: List[PressureMessage] = []
        
        # Build messages based on time remaining
        if remaining_seconds > 90:
            messages.append(PressureMessage(
                message="⏰ Please confirm your details ASAP",
                trigger_time=remaining_seconds,
                pressure_level=PressureLevel.LOW,
                countdown_text="Almost 2 minutes left"
            ))
        
        if remaining_seconds > 60:
            messages.append(PressureMessage(
                message="⚠️ Hurry! 2 minutes remaining to secure your account",
                trigger_time=60,
                pressure_level=PressureLevel.MEDIUM,
                countdown_text="2 minutes"
            ))
        
        if remaining_seconds > 30:
            messages.append(PressureMessage(
                message="🚨 URGENT: Only 1 minute left! Act now or your account will be frozen",
                trigger_time=60,
                pressure_level=PressureLevel.HIGH,
                countdown_text="1 minute left"
            ))
        
        if remaining_seconds > 15:
            messages.append(PressureMessage(
                message="CRITICAL: 30 seconds to confirm! Click now or permanent lock!",
                trigger_time=30,
                pressure_level=PressureLevel.CRITICAL,
                countdown_text="30 seconds"
            ))
        
        if remaining_seconds > 5:
            messages.append(PressureMessage(
                message="⏰ 10 SECONDS! NOW NOW NOW!!!",
                trigger_time=10,
                pressure_level=PressureLevel.CRITICAL,
                countdown_text="10 seconds",
                is_countdown=True
            ))
        
        return messages
    
    def get_pressure_level(self, player_id: str) -> PressureLevel:
        """Determine current pressure level for player"""
        remaining = self.get_countdown_remaining(player_id)
        
        if remaining is None:
            return PressureLevel.LOW
        elif remaining > 60:
            return PressureLevel.LOW
        elif remaining > 30:
            return PressureLevel.MEDIUM
        elif remaining > 10:
            return PressureLevel.HIGH
        else:
            return PressureLevel.CRITICAL
    
    def apply_adaptive_pressure(
        self,
        player_id: str,
        behavior_profile: str,
        stage_progression: float,  # 0-1, how far through scam
    ) -> None:
        """Adjust pressure based on player behavior and game stage"""
        
        # Get base interval between messages
        intervals = {
            "easy": 45,
            "medium": 30,
            "hard": 20,
        }
        
        # Reduce interval for confident/skeptical players
        if behavior_profile in ["fast_confident", "skeptical_asker"]:
            adjustment_factor = 0.7
        # Increase interval for confused/panicked players
        elif behavior_profile in ["slow_confused", "panicked"]:
            adjustment_factor = 1.3
        else:
            adjustment_factor = 1.0
        
        # Also increase pressure as scam progresses
        stage_pressure_multiplier = 0.5 + (stage_progression * 1.5)
        
        # Store historical pressure for analysis
        if player_id not in self.player_pressure_history:
            self.player_pressure_history[player_id] = []
        
        self.player_pressure_history[player_id].append({
            "timestamp": time.time(),
            "behavior_profile": behavior_profile,
            "stage_progression": stage_progression,
            "adjustment_factor": adjustment_factor,
            "stage_multiplier": stage_pressure_multiplier,
        })
    
    def generate_urgency_message(
        self,
        scenario_type: str,  # "bank", "delivery", "friend", "govt"
    ) -> str:
        """Generate a dynamic urgency message based on scenario"""
        
        urgency_templates = {
            "bank": [
                "🚨 ALERT: Your account will be LOCKED in {time}!",
                "⚠️ Immediate verification needed or card suspension!",
                "⏰ FINAL WARNING: {time} to prevent permanent block!",
                "🔒 Security override required IMMEDIATELY - {time} left!",
            ],
            "delivery": [
                "📦 Parcel will be returned if not verified in {time}",
                "⏰ Verification deadline: {time} remaining",
                "🚨 Package hold expires in {time}!",
                "ACTION REQUIRED: Confirm delivery details ({time} left)",
            ],
            "friend": [
                "Bro, seriously need this in {time}. Life emergency 🆘",
                "Mate, response ASAP please. Only {time} left ⏰",
                "Urgent dude! Need within {time}. Please confirm!",
                "{time} and my situation becomes critical 😞",
            ],
            "govt": [
                "⚠️ FINAL NOTICE: Response required within {time}",
                "🚨 Legal proceedings commence in {time}!",
                "Immediate compliance required - {time} deadline",
                "⏱️ Your grace period ends in {time}",
            ],
        }
        
        import random
        templates = urgency_templates.get(scenario_type, urgency_templates["bank"])
        return random.choice(templates)
    
    def record_player_delay_response(self, player_id: str) -> None:
        """Record when player uses power-up to delay response"""
        if player_id not in self.player_pressure_history:
            self.player_pressure_history[player_id] = []
        
        self.player_pressure_history[player_id].append({
            "timestamp": time.time(),
            "event": "delay_response_power_up_used",
            "remaining_at_use": self.get_countdown_remaining(player_id),
        })
    
    def get_pressure_analytics(self, player_id: str) -> Dict:
        """Get analytics on how pressure affected player"""
        if player_id not in self.player_pressure_history:
            return {}
        
        history = self.player_pressure_history[player_id]
        
        pressure_messages_sent = len(self.pressure_messages_sent.get(player_id, []))
        critical_pressure_events = len([
            h for h in history if h.get("event") == "critical_pressure_triggered"
        ])
        
        return {
            "total_pressure_events": len(history),
            "pressure_messages_sent": pressure_messages_sent,
            "critical_pressure_moments": critical_pressure_events,
            "player_resisted_pressure": len([
                h for h in history if h.get("event") == "delay_response_power_up_used"
            ]),
            "adaptive_adjustments_made": len([
                h for h in history if "adjustment_factor" in h
            ]),
        }
