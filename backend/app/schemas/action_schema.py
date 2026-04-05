from pydantic import BaseModel

# Matches the DecisionKey type in CallSimulation.tsx
VALID_CALL_ACTIONS = {"share", "hang_up", "ask_questions", "call_back"}

class SubmitActionRequest(BaseModel):
    player_id: str
    room_code: str
    action: str   # one of the DecisionKey values

class ScoreConversationRequest(BaseModel):
    conversation: str
    scenario_type: str
    caller_name: str
