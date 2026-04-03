"""
WhatsApp Round 2 Models and Data Structures
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.constants.whatsapp_types import (
    MessageType, ScammerType, ScamStage, PowerUp, RedFlag
)


@dataclass
class WhatsAppMessage:
    """Represents a single WhatsApp message"""
    message_id: str
    sender: str  # Scammer name
    timestamp: float
    content: str
    message_type: MessageType = MessageType.TEXT
    media_url: Optional[str] = None
    contains_link: bool = False
    link_url: Optional[str] = None
    fake_media_type: Optional[str] = None  # "payment_screenshot", "tracking", "alert", etc.
    red_flags: List[RedFlag] = field(default_factory=list)
    is_pressure_message: bool = False
    

@dataclass
class PlayerGameState:
    """Tracks individual player state in Round 2"""
    player_id: str
    current_stage: ScamStage = ScamStage.BUILD_TRUST
    messages_received: List[WhatsAppMessage] = field(default_factory=list)
    messages_sent: List[str] = field(default_factory=list)
    actions_taken: List[Dict[str, Any]] = field(default_factory=list)  # clicks, shares, etc.
    
    # Scoring
    score: int = 0
    mistakes: int = 0
    correct_decisions: int = 0
    
    # Power-ups
    power_ups_available: Dict[PowerUp, int] = field(default_factory=dict)
    power_ups_used: List[PowerUp] = field(default_factory=list)
    
    # Time pressure
    time_pressure_active: bool = False
    countdown_seconds: int = 0
    
    # Status
    fell_for_scam: bool = False
    scam_completion_percentage: float = 0.0
    game_completed: bool = False
    completion_time: Optional[float] = None


@dataclass
class Round2GameState:
    """Main game state for Round 2 (WhatsApp)"""
    room_code: str
    difficulty: str = "medium"  # easy | medium | hard
    
    # Game setup
    scammer_type: ScammerType = ScammerType.BANK_AGENT
    scenario: Dict[str, Any] = field(default_factory=dict)
    
    # Game flow
    current_stage: ScamStage = ScamStage.BUILD_TRUST
    stage_start_time: Optional[float] = None
    time_pressure_deadline: Optional[float] = None
    
    # Players
    player_states: Dict[str, PlayerGameState] = field(default_factory=dict)
    
    # Game status
    round_active: bool = False
    round_completed: bool = False
    
    # Messages
    message_sequence: List[WhatsAppMessage] = field(default_factory=list)
    current_message_index: int = 0
    
    # Settings
    adaptive_difficulty_enabled: bool = True
    behavioral_adaptation_enabled: bool = True
    multiplayer_mode: bool = False


@dataclass
class RoundResult:
    """Results for a completed round"""
    player_id: str
    room_code: str
    scammer_type: ScammerType
    difficulty: str
    
    # Game metrics
    duration_seconds: float
    total_score: int
    mistakes_made: int
    correct_decisions: int
    
    # Behavioral analysis
    behavior_profile: str
    avg_response_time: float
    questions_asked: int
    panic_level: int
    
    # Warning analysis
    total_warnings: int
    warnings_ignored: int
    critical_mistakes: int
    
    # Final verdict
    fell_for_scam: bool
    scam_completion_percentage: float
    
    # Training insights
    key_mistakes: List[str]
    improvement_areas: List[str]
    learning_score: float  # 0-100, higher is better (caught scam earlier, ignored better)


class Round2Scenario:
    """Represents a complete Round 2 scenario"""
    
    def __init__(
        self,
        scammer_type: ScammerType,
        difficulty: str,
        scenario_id: str = None
    ):
        self.scammer_type = scammer_type
        self.difficulty = difficulty
        self.scenario_id = scenario_id or f"{scammer_type.value}_{difficulty}_{datetime.now().timestamp()}"
        
        # To be populated by scenario manager
        self.intro_messages: List[WhatsAppMessage] = []
        self.problem_messages: List[WhatsAppMessage] = []
        self.pressure_messages: List[WhatsAppMessage] = []
        self.action_request_messages: List[WhatsAppMessage] = []
        
        self.fake_media_items: List[Dict[str, Any]] = []
        self.expected_actions: List[str] = []
        self.correct_responses: List[str] = []
        
    def get_full_message_sequence(self) -> List[WhatsAppMessage]:
        """Get the complete message sequence for this scenario"""
        return (
            self.intro_messages +
            self.problem_messages +
            self.pressure_messages +
            self.action_request_messages
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert scenario to dictionary for API responses"""
        return {
            "scenario_id": self.scenario_id,
            "scammer_type": self.scammer_type.value,
            "difficulty": self.difficulty,
            "message_count": len(self.get_full_message_sequence()),
            "fake_media_count": len(self.fake_media_items),
        }
