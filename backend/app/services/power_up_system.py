"""
Power-Up System for Round 2
Allows players to use strategic tools to defend against scams
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from app.constants.whatsapp_types import PowerUp, POWER_UP_DESCRIPTIONS, POWER_UP_COSTS


class PowerUpResult(Enum):
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"
    NO_EFFECT = "no_effect"


class PowerUpSystem:
    """Manages player power-ups and strategic tools"""
    
    def __init__(self):
        self.player_power_ups: Dict[str, Dict[PowerUp, int]] = {}
        self.power_up_usage: Dict[str, List[Dict[str, Any]]] = {}
        self.power_up_cooldowns: Dict[str, Dict[PowerUp, float]] = {}
    
    def initialize_player(self, player_id: str, starting_points: int = 100) -> None:
        """Initialize power-ups for a player"""
        # All players start with these power-ups available
        self.player_power_ups[player_id] = {
            PowerUp.BLOCK_CALLER: 1,        # Unlimited use (cost 0)
            PowerUp.CHECK_AUTHENTICITY: 1,  # Hidden success chance (60%)
            PowerUp.DELAY_RESPONSE: 2,      # Limited uses
            PowerUp.REPORT_SCAM: 1,         # Report and auto-block
            PowerUp.CALL_BANK: 1,           # Call verification (risky)
        }
        
        self.power_up_usage[player_id] = []
        self.power_up_cooldowns[player_id] = {}
    
    def get_available_power_ups(self, player_id: str) -> Dict[PowerUp, int]:
        """Get available power-ups for player"""
        if player_id not in self.player_power_ups:
            self.initialize_player(player_id)
        
        return self.player_power_ups[player_id].copy()
    
    def use_power_up(
        self,
        player_id: str,
        power_up: PowerUp,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Use a power-up and return result"""
        
        result = {
            "power_up": power_up.value,
            "timestamp": None,
            "result": PowerUpResult.NO_EFFECT.value,
            "message": "",
            "effectiveness": 0.0,  # 0-1, how effective it was
            "consequences": [],
        }
        
        if player_id not in self.player_power_ups:
            result["result"] = PowerUpResult.FAILED.value
            result["message"] = "Error: Power-up system not initialized"
            return result
        
        available = self.player_power_ups[player_id].get(power_up, 0)
        
        if available <= 0:
            result["message"] = f"No {power_up.value} remaining"
            return result
        
        # Execute power-up effect
        if power_up == PowerUp.BLOCK_CALLER:
            result = self._execute_block_caller(player_id, context)
        elif power_up == PowerUp.CHECK_AUTHENTICITY:
            result = self._execute_check_authenticity(player_id, context)
        elif power_up == PowerUp.DELAY_RESPONSE:
            result = self._execute_delay_response(player_id, context)
        elif power_up == PowerUp.REPORT_SCAM:
            result = self._execute_report_scam(player_id, context)
        elif power_up == PowerUp.CALL_BANK:
            result = self._execute_call_bank(player_id, context)
        
        # Deduct usage
        self.player_power_ups[player_id][power_up] -= 1
        
        # Record usage
        self.power_up_usage[player_id].append({
            "power_up": power_up.value,
            "result": result["result"],
            "timestamp": result["timestamp"],
        })
        
        return result
    
    def _execute_block_caller(
        self, 
        player_id: str, 
        context: Dict = None
    ) -> Dict[str, Any]:
        """Block caller power-up"""
        import random
        import time
        
        # Blocking is always successful
        return {
            "power_up": PowerUp.BLOCK_CALLER.value,
            "timestamp": time.time(),
            "result": PowerUpResult.SUCCESS.value,
            "message": "✅ Scammer blocked successfully. No more messages from this contact.",
            "effectiveness": 1.0,
            "consequences": [
                "Game ends immediately",
                "Counted as early detection (good)",
            ],
        }
    
    def _execute_check_authenticity(
        self, 
        player_id: str, 
        context: Dict = None
    ) -> Dict[str, Any]:
        """Check authenticity power-up (60% success rate)"""
        import random
        import time
        
        # 60% success in detecting this is a scam
        success_chance = 0.60
        is_successful = random.random() < success_chance
        
        if is_successful:
            return {
                "power_up": PowerUp.CHECK_AUTHENTICITY.value,
                "timestamp": time.time(),
                "result": PowerUpResult.SUCCESS.value,
                "message": "🔍 WARNING: This contact is NOT verified. Check shows it's impersonating a service.",
                "effectiveness": 1.0,
                "consequences": [
                    "Now aware this is a scam",
                    "Choice to proceed or block",
                ],
            }
        else:
            return {
                "power_up": PowerUp.CHECK_AUTHENTICITY.value,
                "timestamp": time.time(),
                "result": PowerUpResult.FAILED.value,
                "message": "🔍 Verification check inconclusive. Service appears legitimate but could not fully verify.",
                "effectiveness": 0.0,
                "consequences": [
                    "Still uncertain about authenticity",
                    "May continue or be cautious",
                ],
            }
    
    def _execute_delay_response(
        self, 
        player_id: str, 
        context: Dict = None
    ) -> Dict[str, Any]:
        """Delay response power-up"""
        import time
        
        # Delays the countdown by 2 minutes, allowing player to think
        return {
            "power_up": PowerUp.DELAY_RESPONSE.value,
            "timestamp": time.time(),
            "result": PowerUpResult.SUCCESS.value,
            "message": "⏳ You've gained 2 extra minutes to think. Countdown paused for 120 seconds.",
            "effectiveness": 0.8,  # Somewhat effective against time pressure
            "consequences": [
                "Time pressure temporarily relieved",
                "Good strategic use against urgency tactics",
            ],
        }
    
    def _execute_report_scam(
        self, 
        player_id: str, 
        context: Dict = None
    ) -> Dict[str, Any]:
        """Report scam power-up"""
        import time
        
        return {
            "power_up": PowerUp.REPORT_SCAM.value,
            "timestamp": time.time(),
            "result": PowerUpResult.SUCCESS.value,
            "message": "🚨 Scam reported to authorities. Contact automatically blocked.",
            "effectiveness": 1.0,
            "consequences": [
                "Game ends",
                "Excellent score for early detection and action",
                "Logged as proper scam response",
            ],
        }
    
    def _execute_call_bank(
        self, 
        player_id: str, 
        context: Dict = None
    ) -> Dict[str, Any]:
        """Call bank verification power-up (risky)"""
        import random
        import time
        
        # Calling the actual bank number might reveal it's a scam
        # But sometimes the scammer has prepared cover stories
        success_chance = 0.75  # 75% reveals scam, 25% might not
        
        if random.random() < success_chance:
            return {
                "power_up": PowerUp.CALL_BANK.value,
                "timestamp": time.time(),
                "result": PowerUpResult.SUCCESS.value,
                "message": "☎️ Bank confirmed: They have NO record of this verification request or suspicious transaction.",
                "effectiveness": 1.0,
                "consequences": [
                    "Scam definitely revealed",
                    "Excellent defensive move",
                ],
            }
        else:
            return {
                "power_up": PowerUp.CALL_BANK.value,
                "timestamp": time.time(),
                "result": PowerUpResult.PARTIAL_SUCCESS.value,
                "message": "☎️ Bank line was busy/unclear but agent confirmed 'verification needed.'",
                "effectiveness": 0.3,  # Inconclusive
                "consequences": [
                    "Didn't fully resolve the situation",
                    "May still proceed with caution",
                ],
            }
    
    def get_power_up_analytics(self, player_id: str) -> Dict[str, Any]:
        """Get analytics on power-up usage"""
        if player_id not in self.power_up_usage:
            return {}
        
        usage = self.power_up_usage[player_id]
        
        total_used = len(usage)
        successful = len([u for u in usage if u["result"] == PowerUpResult.SUCCESS.value])
        failed = len([u for u in usage if u["result"] == PowerUpResult.FAILED.value])
        
        by_type = {}
        for pu in PowerUp:
            count = len([u for u in usage if u["power_up"] == pu.value])
            if count > 0:
                by_type[pu.value] = count
        
        return {
            "total_power_ups_used": total_used,
            "successful_uses": successful,
            "failed_uses": failed,
            "success_rate": (successful / total_used * 100) if total_used > 0 else 0,
            "by_type": by_type,
            "effectiveness_score": (successful / total_used) if total_used > 0 else 0,
        }
