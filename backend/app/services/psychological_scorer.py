"""
Psychological Scoring System for Round 2
Advanced scoring beyond simple right/wrong - measures behavioral, cognitive, and psychological factors
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import math


class RiskProfile(Enum):
    LOW_AWARENESS_HIGH_TRUST = "low_awareness_high_trust"
    LOW_AWARENESS_LOW_TRUST = "low_awareness_low_trust"
    HIGH_AWARENESS_HIGH_TRUST = "high_awareness_high_trust"
    HIGH_AWARENESS_LOW_TRUST = "high_awareness_low_trust"


@dataclass
class PsychologicalMetrics:
    """Tracks psychological and behavioral metrics"""
    panic_score: float = 0.0  # 0-100, higher = more panicked
    trust_score: float = 0.0  # 0-100, higher = more trusting
    awareness_score: float = 0.0  # 0-100, higher = more aware
    decision_quality: float = 0.0  # 0-100, based on decision-making
    reaction_time_appropriateness: float = 0.0  # How appropriate their response speed was
    skepticism_level: float = 0.0  # 0-100, how skeptical they are
    

class PsychologicalScorer:
    """Calculates psychological profile and behavioral scoring"""
    
    def __init__(self):
        self.player_metrics: Dict[str, PsychologicalMetrics] = {}
        self.decision_history: Dict[str, List[Dict[str, Any]]] = {}
    
    def calculate_panic_indicators(
        self,
        player_behavior: Dict[str, Any]
    ) -> float:
        """Calculate panic level based on behavioral indicators"""
        
        panic_indicators = 0.0
        total_weight = 0.0
        
        # Indicator 1: Message response patterns
        if "message_urgency_match" in player_behavior:
            # Higher exclamation marks in response = panic
            match_level = player_behavior.get("message_urgency_match", 0)
            panic_indicators += match_level * 20
            total_weight += 20
        
        # Indicator 2: Response time changes
        if "response_time_decrease" in player_behavior:
            decrease = player_behavior.get("response_time_decrease", 0)
            # Faster responses as pressure increases = panic
            panic_indicators += decrease * 15
            total_weight += 15
        
        # Indicator 3: Capitalization patterns
        if "caps_messages_count" in player_behavior:
            caps_count = player_behavior.get("caps_messages_count", 0)
            panic_indicators += min(caps_count * 10, 30)
            total_weight += 30
        
        # Indicator 4: Question patterns
        if "questions_per_message" in player_behavior:
            questions = player_behavior.get("questions_per_message", 0)
            # More questions = higher confusion/panic
            panic_indicators += min(questions * 8, 25)
            total_weight += 25
        
        # Indicator 5: Link clicks under pressure
        if "link_clicks_after_pressure" in player_behavior:
            clicks = player_behavior.get("link_clicks_after_pressure", 0)
            # Impulsive clicks under pressure = panic
            panic_indicators += clicks * 10
            total_weight += 10
        
        if total_weight == 0:
            return 0.0
        
        return min(100, (panic_indicators / total_weight) * 100)
    
    def calculate_trust_score(
        self,
        player_actions: List[str],
        scammer_claims: List[str]
    ) -> float:
        """Calculate how much player trusts the scammer"""
        
        trust_accumulation = 0.0
        
        # Actions that increase trust
        trust_actions = {
            "clicked_link": 25,
            "provided_info": 30,
            "shared_otp": 40,
            "confirmed_details": 20,
            "agreed_to_process": 15,
        }
        
        # Actions that decrease trust
        distrust_actions = {
            "asked_to_verify": -15,
            "searched_official_number": -20,
            "called_bank": -35,
            "hung_up": -50,
            "reported_scam": -60,
        }
        
        # Initial trust from scammer claims
        base_trust = 0.0
        if "verified_badge" in scammer_claims:
            base_trust += 10
        if "official_tone" in scammer_claims:
            base_trust += 8
        if "known_contact_impersonation" in scammer_claims:
            base_trust += 5
        
        # Apply trust/distrust from actions
        for action in player_actions:
            trust_accumulation += trust_actions.get(action, 0)
            trust_accumulation += distrust_actions.get(action, 0)
        
        # Clamp to 0-100
        final_trust = base_trust + trust_accumulation
        return max(0, min(100, final_trust))
    
    def calculate_awareness_score(
        self,
        warnings_detected: int,
        warnings_missed: int,
        red_flags_caught: int,
        red_flags_ignored: int
    ) -> float:
        """Calculate awareness of scam red flags"""
        
        if (warnings_detected + warnings_missed) == 0:
            return 0.0
        
        detected_rate = warnings_detected / (warnings_detected + warnings_missed)
        
        # Detection is weighted more than catching red flags
        awareness = (detected_rate * 70) + ((red_flags_caught / max(1, red_flags_caught + red_flags_ignored)) * 30)
        
        return min(100, awareness * 100)
    
    def calculate_decision_quality(
        self,
        decisions_made: List[Dict[str, Any]],
        optimal_decisions: List[str]
    ) -> float:
        """Calculate quality of decisions made"""
        
        if not decisions_made:
            return 0.0
        
        quality_score = 0.0
        
        for decision in decisions_made:
            action = decision.get("action")
            timing = decision.get("timing", "late")  # early, medium, late
            confidence = decision.get("confidence", 0.5)  # 0-1
            
            # Was this a good decision?
            is_good = action in optimal_decisions
            
            # Quality depends on being good and timing
            if is_good:
                # Earlier detection is better
                timing_multiplier = {
                    "early": 1.0,
                    "medium": 0.7,
                    "late": 0.4,
                }.get(timing, 0.5)
                
                quality_score += 100 * timing_multiplier * confidence
            else:
                # Bad decisions reduce quality
                quality_score -= 50 * confidence
        
        # Average across all decisions
        avg_quality = quality_score / len(decisions_made)
        return max(0, min(100, avg_quality))
    
    def calculate_reaction_time_score(
        self,
        response_times: List[float],
        pressure_timeline: List[float]
    ) -> float:
        """Calculate if response times were appropriate"""
        
        if not response_times:
            return 50.0  # Neutral if no responses
        
        avg_response_time = sum(response_times) / len(response_times)
        
        # Ideal: not too fast (impulsive), not too slow (prolonged confusion)
        # Sweet spot: 20-60 seconds
        
        if avg_response_time < 5:
            # Too fast = impulsive/panicked
            return max(0, 100 - (5 - avg_response_time) * 20)
        elif avg_response_time < 20:
            # Fast but reasonable
            return 85
        elif avg_response_time < 60:
            # Ideal range
            return 90
        elif avg_response_time < 120:
            # Slow but thoughtful
            return 70
        else:
            # Too slow = confused/overwhelmed
            return max(20, 100 - (avg_response_time - 120) / 10)
    
    def calculate_skepticism_level(
        self,
        verification_attempts: int,
        total_interactions: int,
        power_ups_used: List[str]
    ) -> float:
        """Calculate how skeptical player was"""
        
        skepticism = 0.0
        
        # Verification attempts show skepticism
        if total_interactions > 0:
            skepticism += (verification_attempts / total_interactions) * 50
        
        # Questions asked indicate skepticism
        # (This would come from behavior detector)
        
        # Power-ups used defensively
        defensive_power_ups = ["check_authenticity", "delay_response", "call_bank", "block_caller", "report_scam"]
        defensive_uses = sum(1 for p in power_ups_used if p in defensive_power_ups)
        skepticism += defensive_uses * 15
        
        return min(100, skepticism)
    
    def generate_risk_profile(
        self,
        awareness: float,
        trust: float
    ) -> RiskProfile:
        """Generate user's risk profile based on awareness and trust"""
        
        high_awareness = awareness > 50
        low_trust = trust < 50
        
        if high_awareness and low_trust:
            return RiskProfile.HIGH_AWARENESS_LOW_TRUST
        elif high_awareness and not low_trust:
            return RiskProfile.HIGH_AWARENESS_HIGH_TRUST
        elif not high_awareness and low_trust:
            return RiskProfile.LOW_AWARENESS_LOW_TRUST
        else:
            return RiskProfile.LOW_AWARENESS_HIGH_TRUST
    
    def calculate_final_score(self, player_id: str) -> Dict[str, Any]:
        """Calculate comprehensive final score combining all metrics"""
        
        metrics = self.player_metrics.get(player_id, PsychologicalMetrics())
        
        # Weighted final score (0-100)
        weighted_score = (
            metrics.awareness_score * 0.35 +      # Awareness is most important
            (100 - metrics.trust_score) * 0.25 +  # Being skeptical is good
            metrics.decision_quality * 0.20 +     # Quality of decisions
            (100 - metrics.panic_score) * 0.15 +  # Not panicking is good
            metrics.reaction_time_appropriateness * 0.05
        )
        
        return {
            "final_score": round(weighted_score, 1),
            "panic_score": round(metrics.panic_score, 1),
            "trust_score": round(metrics.trust_score, 1),
            "awareness_score": round(metrics.awareness_score, 1),
            "decision_quality": round(metrics.decision_quality, 1),
            "reaction_time_score": round(metrics.reaction_time_appropriateness, 1),
            "skepticism_level": round(metrics.skepticism_level, 1),
            "score_breakdown": {
                "awareness_contribution": round(metrics.awareness_score * 0.35, 1),
                "skepticism_contribution": round((100 - metrics.trust_score) * 0.25, 1),
                "decision_contribution": round(metrics.decision_quality * 0.20, 1),
                "composure_contribution": round((100 - metrics.panic_score) * 0.15, 1),
            }
        }
    
    def get_behavioral_insights(self, player_id: str) -> Dict[str, Any]:
        """Get insights about player's behavior"""
        
        if player_id not in self.player_metrics:
            return {}
        
        metrics = self.player_metrics[player_id]
        
        insights = {
            "risk_profile": self.generate_risk_profile(metrics.awareness_score, metrics.trust_score).value,
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
        }
        
        # Identify strengths
        if metrics.awareness_score > 70:
            insights["strengths"].append("High awareness of potential red flags")
        if metrics.skepticism_level > 70:
            insights["strengths"].append("Questions and verifies suspicious claims")
        if metrics.decision_quality > 75:
            insights["strengths"].append("Makes thoughtful, careful decisions")
        if metrics.panic_score < 30:
            insights["strengths"].append("Remains calm under pressure")
        
        # Identify weaknesses
        if metrics.trust_score > 70:
            insights["weaknesses"].append("Too trusting of official-looking contacts")
        if metrics.panic_score > 70:
            insights["weaknesses"].append("Tends to panic when under time pressure")
        if metrics.awareness_score < 40:
            insights["weaknesses"].append("Misses common scam red flags")
        if metrics.decision_quality < 50:
            insights["weaknesses"].append("Makes impulsive decisions")
        
        # Recommendations
        if metrics.trust_score > 70:
            insights["recommendations"].append("Always verify contacts independently before sharing sensitive info")
        if metrics.panic_score > 70:
            insights["recommendations"].append("Take time to think when pressure is applied - use power-ups to delay")
        if metrics.awareness_score < 40:
            insights["recommendations"].append("Learn to recognize common scam patterns and red flags")
        
        return insights
