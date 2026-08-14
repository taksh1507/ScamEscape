# 📚 ScamEscape API Documentation

## Overview

ScamEscape backend is a **FastAPI application** running on **http://localhost:8000** (development).

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.scamescape.com` (your deployment domain)

### API Docs
Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

---

## 🎮 Game Management Endpoints

### 1. Create Room
**POST** `/api/game/create-room`

Create a new multiplayer game room.

**Request**:
```json
{
  "room_name": "TestRoom",
  "max_players": 4,
  "created_by": "UserName"
}
```

**Response** (201):
```json
{
  "room_code": "ABC123",
  "room_id": "room_uuid",
  "max_players": 4,
  "players": ["UserName"],
  "status": "waiting",
  "created_at": "2026-04-05T12:00:00Z"
}
```

---

### 2. Join Room
**POST** `/api/game/join-room`

Join an existing game room.

**Request**:
```json
{
  "room_code": "ABC123",
  "player_name": "NewPlayer"
}
```

**Response** (200):
```json
{
  "room_code": "ABC123",
  "players": ["UserName", "NewPlayer"],
  "status": "waiting"
}
```

---

### 3. Start Game
**POST** `/api/game/start-game`

Start the game in a room (only room creator).

**Request**:
```json
{
  "room_code": "ABC123",
  "difficulty": "medium"
}
```

**Response** (200):
```json
{
  "status": "started",
  "round": 1,
  "difficulty": "medium"
}
```

---

### 4. Submit Player Action
**POST** `/api/game/user-action`

Submit a player's action during gameplay.

**Request**:
```json
{
  "room_code": "ABC123",
  "player_id": "player_uuid",
  "action": "ASK_QUESTIONS",
  "phase": "AUTHORITY"
}
```

**Response** (200):
```json
{
  "status": "success",
  "next_message": "...",
  "phase": "URGENCY"
}
```

---

## 💬 Chat Endpoints

### 5. Generate Chat Scenario
**GET** `/api/chat/generate`

Generate a WhatsApp-style scam chat scenario.

**Query Parameters**:
- `emotion_type` (optional): `relative_emergency` | `cybersecurity` | default: `relative_emergency`

**Response** (200):
```json
{
  "status": "success",
  "scenario": {
    "created_at": "2026-04-05T12:00:00Z",
    "messages": [
      {
        "sender": "SCAMMER",
        "timestamp": "14:32",
        "content": "Hi! Your Amazon account has unusual activity..."
      },
      {
        "sender": "USER",
        "timestamp": "14:33",
        "content": "Oh no, what do I do?"
      }
    ],
    "payment_block": {
      "link": "https://verify-secure-amazon.com/urgent",
      "amount": "₹5,999",
      "qr": "[SCAN_QR_CODE]",
      "cta": "PAY NOW"
    }
  }
}
```

---

### 6. Generate Next Chat Message
**POST** `/api/chat/next-message`

Generate the next message in an ongoing chat conversation.

**Request**:
```json
{
  "messages": [
    {
      "sender": "SCAMMER",
      "timestamp": "14:32",
      "content": "Your account is compromised!"
    }
  ],
  "last_sender": "USER",
  "scam_type": "cybersecurity"
}
```

**Response** (200):
```json
{
  "sender": "SCAMMER",
  "timestamp": "14:34",
  "content": "Click this link immediately to fix it: https://verify-secure.com"
}
```

---

## 📊 Leaderboard Endpoints

### 7. Get Leaderboard
**GET** `/api/leaderboard`

Get leaderboard for a specific room.

**Query Parameters**:
- `room_code` (required): Room code
- `difficulty` (optional): Filter by difficulty

**Response** (200):
```json
{
  "room_code": "ABC123",
  "leaderboard": [
    {
      "rank": 1,
      "player_name": "TopPlayer",
      "score": 9850,
      "games_won": 5,
      "games_scammed": 1,
      "win_rate": 83.3
    }
  ]
}
```

---

## 🔍 Status Endpoints

### 8. Health Check
**GET** `/health`

Check if backend is running.

**Response** (200):
```json
{
  "status": "healthy"
}
```

---

### 9. Chat Status
**GET** `/api/chat/status`

Check if chat generation is available.

**Response** (200):
```json
{
  "status": "ok",
  "chat_generation_enabled": true,
  "error_message": null
}
```

---

## 🔐 Authentication & CORS

### CORS Policy
The backend allows requests from:
- `http://localhost:3000` (development)
- Configured via `FRONTEND_ORIGIN` environment variable

### WebSocket Connection
For real-time game events:

```javascript
const socket = new WebSocket('ws://localhost:8000/ws/room/{room_code}/{player_id}')
socket.onmessage = (event) => {
  console.log('Game event:', event.data)
}
```

---

## 📋 Data Models

### Room
```typescript
{
  room_code: string         // 6-char unique identifier
  room_id: string          // UUID
  room_name: string        // User-defined
  created_by: string       // Creator player ID
  max_players: number      // Max participants
  players: Player[]        // List of players
  status: string           // waiting | in_progress | completed
  difficulty: string       // easy | medium | hard
  current_round: number    // 1 or 2
  created_at: datetime     // ISO timestamp
  updated_at: datetime     // ISO timestamp
}
```

### Player
```typescript
{
  player_id: string         // UUID
  player_name: string       // Display name
  room_code: string         // Associated room
  score: number            // Current score
  games_won: number        // Times avoided scam
  games_scammed: number    // Times fell for scam
  win_rate: float          // Percentage
  status: string           // active | completed
  joined_at: datetime      // ISO timestamp
}
```

### ChatScenario
```typescript
{
  created_at: datetime
  messages: ChatMessage[]
  payment_block: {
    link: string            // Fake payment URL
    amount: string          // Amount requested
    qr: string             // QR code descriptor
    cta: string            // Call-to-action text
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters",
  "status_code": 400
}
```

### 404 Not Found
```json
{
  "detail": "Room not found",
  "status_code": 404
}
```

### 429 Rate Limited
```json
{
  "detail": "Too many requests. Please wait.",
  "status_code": 429
}
```

### 503 Service Unavailable
```json
{
  "detail": "Chat generation unavailable: GROQ rate limit exceeded after 3 retries",
  "status_code": 503
}
```

---

## 🔄 Rate Limiting

- **Chat Generation**: 3 automatic retries with exponential backoff (2s, 4s, 8s)
- **GROQ API**: No official rate limit on free tier
- **API Requests**: 100 requests/minute per IP

---

## 📱 WebSocket Events

### Connection
```javascript
// Client connects
ws://localhost:8000/ws/room/{room_code}/{player_id}
```

### Events Received
```typescript
// Round started
{
  "event": "round_started",
  "round": 1,
  "difficulty": "medium"
}

// Player action processed
{
  "event": "call_update",
  "sender": "SCAMMER",
  "content": "Now you need to verify your account...",
  "phase": "URGENCY"
}

// Round ended
{
  "event": "round_result",
  "score": 450,
  "status": "success"
}

// Player left
{
  "event": "player_left",
  "player_id": "uuid",
  "player_name": "UserName"
}
```

---

## 🧪 Testing with cURL

### Create Room
```bash
curl -X POST http://localhost:8000/api/game/create-room \
  -H "Content-Type: application/json" \
  -d '{
    "room_name": "TestRoom",
    "max_players": 4,
    "created_by": "TestUser"
  }'
```

### Get Chat Scenario
```bash
curl -X GET "http://localhost:8000/api/chat/generate?emotion_type=relative_emergency"
```

### Check Health
```bash
curl -X GET http://localhost:8000/health/health
```

---

## 🔌 WebSocket Contract

The backend exposes three WebSocket endpoints. All messages are JSON. Each
message from the client has a `type` field; each message from the server
has an `event` field.

### `/rooms/ws/lobby/{room_code}/{player_id}` — Lobby socket

Used while players are waiting in a room before the game starts.

**Client → Server**

| `type` | Payload | Purpose |
|---|---|---|
| `ping` | `{}` | Keepalive; server replies with `pong` |
| `chat` | `{ "type": "chat", "message": "..." }` | Send a lobby chat message |
| `start_game` | `{}` | Room leader starts the game |

**Server → Client**

| `event` | Payload | Meaning |
|---|---|---|
| `pong` | `{}` | Reply to `ping` |
| `player_joined` | `{ player_id, nickname, ... }` | A new player joined the room |
| `player_left` | `{ player_id, nickname, ... }` | A player left the room |
| `chat` | `{ player_id, nickname, message }` | Broadcast lobby chat message |
| `game_starting` | `{}` | Leader triggered game start; clients should transition to the game socket |
| `error` | `{ message }` | Something went wrong (e.g. invalid room) |

### `/game/ws/{room_code}/{player_id}` — Game socket

Used during active gameplay (Round 1 call simulation and round lifecycle
events). Connect to this after `game_starting` is received on the lobby
socket.

**Client → Server**

| `type` | Payload | Purpose |
|---|---|---|
| `ping` | `{}` | Keepalive; server replies with `pong` |
| `submit_action` | `{ "type": "submit_action", "action": "hang_up" \| "call_back" \| "ask_questions" \| "share" \| ... }` | Submit the player's final action for the active round |
| `user_action` | `{ "type": "user_action", "action": { "option": "...", "risk_level": "low" \| "medium" \| "high" } }` | Submit an in-call choice during the adaptive call flow (used for phase-by-phase branching, distinct from the final `submit_action`) |

**Server → Client**

| `event` | Payload | Meaning |
|---|---|---|
| `pong` | `{}` | Reply to `ping` |
| `action_received` | `{ action }` | Acknowledges a submitted action (or `"already_submitted"` if duplicate) |
| `game_start` | `{}` | Game has begun |
| `start_round` | `{ round_number, ... }` | A new round has started |
| `timer_tick` | `{ seconds_remaining }` | Periodic countdown update during a round |
| `call_update` | `{ phase, script, ... }` | The simulated scam call has advanced to a new phase |
| `round_result` | `{ round_number, correct_action, red_flags, results: [...], ttl }` | Round finished; per-player scoring breakdown |
| `game_over` | `{ leaderboard: [...] }` | All rounds complete; final leaderboard |
| `error` | `{ message }` | Something went wrong (e.g. no active round, invalid room/player) |

**Notes for client implementers**

- Both sockets upper-case `room_code` server-side, so the client doesn't
  need to normalize casing before connecting.
- `submit_action` is idempotent per round — sending it twice returns
  `action_received` with `action: "already_submitted"` rather than an
  error, so clients don't need to guard against double-submits themselves.
- There is currently no reconnect/resume message — if the socket drops
  mid-round, the client should re-fetch room/game state via the REST
  endpoints (`GET /rooms/...`, `GET /game/leaderboard/{room_code}`) after
  reconnecting, rather than assuming the WebSocket will replay missed events.

---

## 📖 For More Information

- **Setup Guide**: See [SETUP.md](./SETUP.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md) (if available)
- **Code Examples**: Check `/frontend` for usage examples
