"""
Player Behavior Detection System
Analyzes player responses to determine behavior profile and adapt scammer tactics
"""

import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from app.constants.whatsapp_types import BehaviorProfile, RedFlag

@dataclass
class BehaviorMetrics:
    """Tracks player behavior metrics"""
    total_messages: int = 0
    total_response_time: float = 0.0  # Total seconds
    response_times: List[float] = field(default_factory=list)
    questions_asked: int = 0
    words_per_message: float = 0.0
    panic_indicators: int = 0  # Exclamation marks, ALL CAPS, etc.
    verification_attempts: int = 0  # Tries to verify sender
    accepts_links: int = 0
    rejects_offers: int = 0
    last_message_time: Optional[float] = None
    

class BehaviorDetector:
    """Detects and tracks player behavior patterns"""
    
    def __init__(self):
        self.metrics: Dict[str, BehaviorMetrics] = {}
        self.current_profile: Dict[str, BehaviorProfile] = {}
        self.profile_history: Dict[str, List[BehaviorProfile]] = {}
    
    def record_message(self, player_id: str, message: str, timestamp: float = None) -> None:
        """Record a player message and update metrics"""
        if player_id not in self.metrics:
            self.metrics[player_id] = BehaviorMetrics()
        
        timestamp = timestamp or time.time()
        metrics = self.metrics[player_id]
        
        # Update basic metrics
        metrics.total_messages += 1
        message_length = len(message.split())
        metrics.words_per_message = (
            (metrics.words_per_message * (metrics.total_messages - 1) + message_length) 
            / metrics.total_messages
        )
        
        # Calculate response time
        if metrics.last_message_time is not None:
            response_time = timestamp - metrics.last_message_time
            metrics.response_times.append(response_time)
            metrics.total_response_time += response_time
        
        metrics.last_message_time = timestamp
        
        # Detect panic indicators
        if "!!!" in message or "!" * 3 in message:
            metrics.panic_indicators += 1
        if message.isupper() and len(message) > 5:
            metrics.panic_indicators += 1
        
        # Count questions
        if "?" in message:
            metrics.questions_asked += 1
        
        # Detect verification attempts
        verification_keywords = [
            "verify", "check", "confirm", "official", "real", "legitimate",
            "authentic", "genuine", "real number", "call bank", "google"
        ]
        if any(keyword in message.lower() for keyword in verification_keywords):
            metrics.verification_attempts += 1
        
        # Update player profile
        self._update_profile(player_id)
    
    def record_action_taken(
        self, 
        player_id: str, 
        action_type: str,  # "click_link", "share_otp", "ignore", "block", etc.
        timestamp: float = None
    ) -> None:
        """Record when player takes an action"""
        if player_id not in self.metrics:
            self.metrics[player_id] = BehaviorMetrics()
        
        metrics = self.metrics[player_id]
        
        if action_type == "click_link":
            metrics.accepts_links += 1
        elif action_type in ["ignore", "block", "report"]:
            metrics.rejects_offers += 1
    
    def _update_profile(self, player_id: str) -> None:
        """Determine current behavior profile based on metrics"""
        metrics = self.metrics[player_id]
        
        avg_response_time = self._get_avg_response_time(player_id)
        
        # Profile determination logic
        profile = None
        
        # Fast & few questions = Fast & Confident
        if avg_response_time < 10 and metrics.questions_asked < 2:
            profile = BehaviorProfile.FAST_CONFIDENT
        
        # Slow & many questions = Slow & Confused
        elif avg_response_time > 30 and metrics.questions_asked > 3:
            profile = BehaviorProfile.SLOW_CONFUSED
        
        # Many questions = Skeptical Asker
        elif metrics.questions_asked > 4:
            profile = BehaviorProfile.SKEPTICAL_ASKER
        
        # High panic signs = Panicked
        elif metrics.panic_indicators > 3:
            profile = BehaviorProfile.PANICKED
        
        # Many verification attempts = Cautious
        elif metrics.verification_attempts > 2:
            profile = BehaviorProfile.CAUTIOUS
        
        # Default to fast confident if no clear pattern
        else:
            profile = BehaviorProfile.FAST_CONFIDENT
        
        if profile:
            self.current_profile[player_id] = profile
            
            # Track profile history
            if player_id not in self.profile_history:
                self.profile_history[player_id] = []
            
            # Only add if different from last
            if not self.profile_history[player_id] or \
               self.profile_history[player_id][-1] != profile:
                self.profile_history[player_id].append(profile)
    
    def _get_avg_response_time(self, player_id: str) -> float:
        """Get average response time in seconds"""
        metrics = self.metrics[player_id]
        if not metrics.response_times:
            return 20.0  # Default
        return sum(metrics.response_times) / len(metrics.response_times)
    
    def get_behavior_profile(self, player_id: str) -> Optional[BehaviorProfile]:
        """Get current behavior profile for a player"""
        return self.current_profile.get(player_id)
    
    def get_metrics(self, player_id: str) -> Optional[BehaviorMetrics]:
        """Get all metrics for a player"""
        return self.metrics.get(player_id)
    
    def generate_behavior_summary(self, player_id: str) -> Dict:
        """Generate a comprehensive behavior report"""
        metrics = self.metrics.get(player_id)
        profile = self.current_profile.get(player_id)
        
        if not metrics:
            return {}
        
        avg_response_time = self._get_avg_response_time(player_id)
        
        return {
            "profile": profile.value if profile else None,
            "total_messages": metrics.total_messages,
            "avg_response_time_seconds": round(avg_response_time, 2),
            "avg_words_per_message": round(metrics.words_per_message, 1),
            "questions_asked": metrics.questions_asked,
            "panic_indicators": metrics.panic_indicators,
            "verification_attempts": metrics.verification_attempts,
            "links_clicked": metrics.accepts_links,
            "offers_rejected": metrics.rejects_offers,
            "profile_history": [p.value for p in self.profile_history.get(player_id, [])],
        }
    
    def get_scammer_adaptation_strategy(self, player_id: str) -> Dict[str, str]:
        """Get how scammer should adapt based on player behavior"""
        profile = self.get_behavior_profile(player_id)
        
        strategies: Dict[BehaviorProfile, Dict[str, str]] = {
            BehaviorProfile.FAST_CONFIDENT: {
                "tone": "increase_pressure",
                "frequency": "high",
                "tactics": "authority_and_scarcity",
                "reason": "User is confident, needs stronger pressure"
            },
            BehaviorProfile.SLOW_CONFUSED: {
                "tone": "be_more_explanatory",
                "frequency": "medium",
                "tactics": "simplify_and_reassure",
                "reason": "User seems confused, break down clearly"
            },
            BehaviorProfile.SKEPTICAL_ASKER: {
                "tone": "provide_detailed_explanations",
                "frequency": "match_pace",
                "tactics": "address_concerns_with_fake_evidence",
                "reason": "User is skeptical, address doubts proactively"
            },
            BehaviorProfile.PANICKED: {
                "tone": "offer_solutions",
                "frequency": "high",
                "tactics": "calm_with_false_assurance",
                "reason": "User is panicked, false reassurance works"
            },
            BehaviorProfile.CAUTIOUS: {
                "tone": "provide_proof",
                "frequency": "medium",
                "tactics": "fake_verification_and_official_procedures",
                "reason": "User wants verification, provide fake proofs"
            },
        }
        
        return strategies.get(profile, strategies[BehaviorProfile.FAST_CONFIDENT])
