from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from app.constants.scenario_types import CallPhase

@dataclass
class CallState:
    phase: CallPhase = CallPhase.AUTHORITY
    history: List[Dict[str, Any]] = field(default_factory=list)
    is_cautious: bool = False
    is_impulsive: bool = False

@dataclass
class GameState:
    room_code: str
    difficulty: str = "easy"                          # easy | medium | hard
    scenarios: List[Dict[str, Any]] = field(default_factory=list)
    current_round_index: int = 0
    round_active: bool = False
    round_actions: Dict[str, str] = field(default_factory=dict)
    round_action_times: Dict[str, float] = field(default_factory=dict)
    
    # 🔥 NEW: Separate tracking for different action types to avoid blocking
    submit_actions: Dict[str, str] = field(default_factory=dict)    # submit_action (call accept/decline)
    user_actions: Dict[str, str] = field(default_factory=dict)      # user_action (decision button clicks)
    
    # 🔥 NEW: Frontend-computed scores (submitted after call ends)
    frontend_scores: Dict[str, Dict[str, Any]] = field(default_factory=dict)  # player_id -> {points, grade, analysis, tip}
    
    # Adaptive Call Round State (for each player)
    call_states: Dict[str, CallState] = field(default_factory=dict) # player_id -> CallState
