# Backend tests

```bash
cd backend
pip install -r ../requirements.txt   # includes pytest, pytest-asyncio, httpx
python -m pytest tests/ -v
```

## What's covered

- `test_scoring.py` — pure logic in `app/services/scoring.py` (grading, speed
  bonus, per-round scoring).
- `test_psychological_scorer.py` — pure calculation methods on
  `PsychologicalScorer` (panic/trust/awareness/decision-quality/reaction-time
  scores). Two real bugs were found and fixed while writing these tests:
  1. `calculate_awareness_score` scaled its result by 100 twice, so almost
     any nonzero detection rate saturated to 100 — partial awareness was
     indistinguishable from perfect awareness.
  2. `calculate_reaction_time_score`'s "too slow" branch restarted its decay
     from 100 instead of continuing from the "slow but thoughtful" band's 70,
     so a 200-second response could score *higher* than an ideal 30-second
     one.
- `test_room_api.py` — integration tests against the real FastAPI app
  (create/join room happy paths and the invalid-room-code error path). No
  MongoDB is required for these; room state lives in the in-memory store.

## No LLM key needed

`conftest.py` sets a dummy `GROQ_API_KEY` before the app is imported, since
the app now fails fast at startup without one (see `validate_configuration`
in `app/core/config.py`). Tests that need to assert on real AI output should
mock the Groq/OpenAI client rather than relying on this dummy key.

## What's not covered yet

- WebSocket message flows (`/rooms/ws/lobby/...`, `/game/ws/...`) — these
  need a running event loop and multiple concurrent client connections to
  test properly; see the WebSocket contract in `API_DOCS.md` for the message
  shapes if you want to add these.
- `ai_service.py` / `chat_generator.py` / `ai_scam_generator.py` — these call
  out to Groq and would need the client mocked to test deterministically.
- MongoDB-backed paths in `mongodb_service.py` — would need either a test
  MongoDB instance or `mongomock`.
