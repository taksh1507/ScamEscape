# 🛡️ ScamEscape - Learn to Spot Scams

**A game that teaches you how to recognize and escape real scams using AI.**

![Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.13%2B-blue?logo=python&style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js&style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi&style=flat-square)
![Groq API](https://img.shields.io/badge/Groq-LLaMA%203.3-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📋 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Quick Start Guide](#quick-start-guide)
- [Development Workflow](#development-workflow)
- [API Documentation](#api-documentation)
- [Game Flow & Mechanics](#game-flow--mechanics)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License & Contact](#license--contact)

---

## 📋 Overview

**ScamEscape** is an interactive, gamified fraud prevention training platform that teaches players to identify, analyze, and escape real-world scams through two comprehensive simulation rounds. Players face AI-powered scammers via phone calls (Round 1) and WhatsApp messages (Round 2), making critical decisions under pressure while learning psychological manipulation tactics.

### 🎯 Mission
Combat fraud through immersive, AI-driven education. Turning scam victims into scam detectives.

### 🚀 Key Innovation
- **AI-Powered Realism**: LLaMA 3.3 70B generates contextually-aware scam messages
- **Adaptive Difficulty**: Game intelligence learns from player behavior and scales accordingly
- **Dual-Round Gameplay**: Phone-based (synchronous) + Chat-based (turn-based) simulations
- **Real-Time Analytics**: Psychological profiling and behavior tracking while playing
- **No API Key Required for Users**: Only developers need Groq API; players enjoy free gameplay

## 📊 Project Scope

**ScamEscape** is a full-stack web application with:
- **30+ Services** handling game logic, AI integration, scoring, and analytics
- **Complex State Management** across multiplayer rooms and async WebSocket connections
- **Real-time Multiplayer** support for collaborative or competitive gameplay
- **Psychological Insights** through behavior detection and vulnerability scoring
- **Scalable Architecture** ready for deployment on cloud platforms

---

## ✨ Key Features

### 🎮 Round 1: Phone Call Simulation
- **🤖 AI-Generated Scam Calls** - Groq/LLaMA generates realistic voice-based scripts
- **📊 7 Scammer Archetypes**
  - Bank fraud specialists
  - Delivery & logistics scammers  
  - Government/Tax impersonators
  - Tech support fraudsters
  - Investment scheme operators
  - Telecom service manipulators
  - Friend/Family emergency exploiters
- **⏱️ Time Pressure Mechanics** - Countdown timer mirrors real scam urgency
- **⚠️ Red Flag System** - Contextual warnings for suspicious patterns
- **💪 Power-Up Helpers** - Strategic assistance to improve survival odds
- **🎯 Multi-Choice Decisions** - Ask Questions → Request Verification → Ignore/Block → Share

### 💬 Round 2: WhatsApp Chat Simulation
- **🤖 Two-Way AI Conversations** - Player messages trigger dynamic AI responses
- **🎯 Adaptive Strategy** - AI adjusts tactics based on player feedback
- **📱 Authentic UI** - Real WhatsApp messaging experience
- **🏆 Live Scoring** - Real-time score updates
- **📈 Action Analytics** - Track every decision and outcome
- **🧠 Behavior Adaptation** - AI learns and increases sophistication
- **📋 Report Scam** - Players can detect and report scams
- **✅ Game Finished Screen** - Completion achievements with redirect to home

### 🧠 Game Intelligence System
- **Behavioral Profiling** - Tracks decision patterns and vulnerability
- **Psychological Vulnerability Scoring** - FOMO, urgency resistance, empathy evaluation
- **Difficulty Scaling** - Easy/Medium/Hard/Adaptive modes
- **Learning Curve Adaptation** - AI becomes harder as player improves
- **Personalized Recommendations** - Educational guidance based on performance

---

## 🛠️ Technology Stack

### Backend Architecture
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.115.0 | High-performance async web framework |
| **Language** | Python | 3.13+ | Backend logic & AI integration |
| **Real-time** | WebSockets | Native | Live multiplayer & game events |
| **AI Provider** | Groq API | Latest | Ultra-fast LLaMA inference |
| **AI Model** | LLaMA 3.3 70B | 3.3 | Context-aware message generation |
| **Database** | SQLite | 3.x | Lightweight persistent storage |
| **Async Runtime** | asyncio | Native | Concurrent connection handling |
| **Validation** | Pydantic | v2 | Data schema validation |

### Frontend Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 16.2.2+ | React meta-framework with SSR |
| **Runtime** | React | 19.2.4+ | Component-based UI library |
| **Language** | TypeScript | 5.x+ | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 4.x+ | Utility-first CSS framework |
| **Animations** | Framer Motion | Latest | Smooth UI transitions |
| **Real-time** | WebSocket | ES6+ | Client-side event streaming |
| **State Management** | React Hooks | Native | useContext, useState, useEffect |
| **Icons** | Lucide React | 1.7.0+ | Modern SVG icon library |

### Infrastructure & Deployment
- **Containerization**: Docker (ready for deployment)
- **Cloud**: Vercel (Frontend), Railway/Render (Backend)
- **Environment**: OS-agnostic (Windows, macOS, Linux)
- **Package Managers**: pip (Python), npm/yarn (Node.js)

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.13 or higher
- **Node.js**: 18.x or higher  
- **npm**: 9.x or yarn 3.x
- **Groq API Key**: Free account at https://console.groq.com (1 minute setup)
- **Git**: For cloning the repository
- **4GB+ RAM**: For running both services concurrently

### Step 1: Clone Repository
```bash
git clone https://github.com/taksh1507/ScamEscape.git
cd ScamEscape
```

### Step 2: Setup Backend

#### Windows (PowerShell)
```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file (use Notepad or your editor)
# Add these lines:
# GROQ_API_KEY=sk-or-v1-YOUR_API_KEY_HERE
# GROQ_BASE_URL=https://api.groq.com/openai/v1

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### macOS/Linux (Bash)
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=sk-or-v1-YOUR_API_KEY_HERE" > .env
echo "GROQ_BASE_URL=https://api.groq.com/openai/v1" >> .env

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**✅ Backend running at**: http://localhost:8000  
**📚 API Docs at**: http://localhost:8000/docs

### Step 3: Setup Frontend

#### All Platforms
```bash
cd frontend

# Install Node dependencies
npm install
# OR: yarn install

# Start Next.js development server
npm run dev
# OR: yarn dev
```

**✅ Frontend running at**: http://localhost:3000

### Step 4: Access the Game
Open browser and navigate to: **http://localhost:3000**

## 📖 Development Workflow

### Project Structure
```
ScamEscape/
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── api/
│   │   │   ├── game.py              # Game state endpoints
│   │   │   ├── health.py            # Health check endpoint
│   │   │   ├── room.py              # Room management routes
│   │   │   └── round2.py            # Round 2 gameplay routes
│   │   ├── services/                # Business logic (30+ services)
│   │   │   ├── ai_scam_generator.py     # 🤖 Groq API wrapper for message generation
│   │   │   ├── ai_service.py            # Common AI utilities
│   │   │   ├── adaptive_call_manager.py # Manages call difficulty scaling
│   │   │   ├── behavior_detector.py     # Analyzes player behavior patterns
│   │   │   ├── game_engine.py           # Core game state machine
│   │   │   ├── power_up_system.py       # Power-up logic
│   │   │   ├── psychological_scorer.py  # Vulnerability assessment
│   │   │   ├── round2_game_manager.py   # WhatsApp round orchestration
│   │   │   ├── round_manager.py         # Multi-round coordination
│   │   │   ├── room_manager.py          # Room lifecycle management
│   │   │   ├── scenario_manager.py      # Scenario selection & generation
│   │   │   ├── scam_flow_manager.py     # Scam progression logic
│   │   │   ├── scoring.py               # Score calculations
│   │   │   ├── time_pressure.py         # Timer system
│   │   │   └── warning_system.py        # Red flag alerts
│   │   ├── models/                  # Pydantic models for type safety
│   │   │   ├── game_state.py        # Game state data model
│   │   │   ├── player.py            # Player data model
│   │   │   ├── room.py              # Room data model
│   │   │   └── round2_models.py     # Round 2 specific models
│   │   ├── schemas/                 # Request/Response schemas
│   │   │   ├── action_schema.py     # Player action validation
│   │   │   ├── game_schema.py       # Game message schemas
│   │   │   └── room_schema.py       # Room creation/join schemas
│   │   ├── core/                    # Core application setup
│   │   │   ├── config.py            # Environment configuration
│   │   │   ├── events.py            # Event definitions
│   │   │   └── websocket.py         # WebSocket setup
│   │   ├── models/                  # Database/persistence models
│   │   ├── state/                   # Application state stores
│   │   │   ├── game_store.py        # Game state persistence
│   │   │   ├── player_store.py      # Player data store
│   │   │   └── rooms_store.py       # Room registry
│   │   ├── constants/               # Game configuration
│   │   │   ├── game_constants.py    # Base game settings
│   │   │   ├── round2_templates.py  # Round 2 message templates
│   │   │   ├── scenario_types.py    # Scenario definitions
│   │   │   ├── scammer_profiles.py  # 7 scammer archetypes
│   │   │   └── whatsapp_types.py    # WhatsApp-specific config
│   │   └── utils/
│   │       ├── id_generator.py      # Unique ID generation
│   │       ├── logger.py            # Logging setup
│   │       └── timer.py             # Timer utilities
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables (git-ignored)
│   └── .gitignore
│
├── frontend/                         # Next.js application
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home/room lobby page
│   │   ├── globals.css              # Global styles
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts         # API route for chat
│   │   ├── play/
│   │   │   └── page.tsx             # Difficulty selection page
│   │   ├── chat/
│   │   │   └── page.tsx             # Unused legacy page
│   │   ├── simulation/
│   │   │   ├── call/
│   │   │   │   └── page.tsx         # Round 1 page wrapper
│   │   │   └── whatsapp/
│   │   │       └── page.tsx         # Round 2 page wrapper
│   │   ├── result/
│   │   │   └── page.tsx             # Results & analytics page
│   │   ├── leaderboard/
│   │   │   └── page.tsx             # Global leaderboard
│   │   ├── scanner/
│   │   │   └── page.tsx             # File scanner feature
│   │   └── learn/
│   │       └── page.tsx             # Educational modules
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # Top navigation bar
│   │   │   └── Footer.tsx           # Footer component
│   │   ├── sections/                # Page-level components
│   │   │   ├── Hero.tsx             # Landing hero section
│   │   │   ├── StartZone.tsx        # Room creation/joining
│   │   │   ├── DifficultySelect.tsx # Difficulty selection UI
│   │   │   ├── CallSimulation.tsx   # Round 1 call UI wrapper
│   │   │   ├── WhatsAppSimulation.tsx # Round 2 legacy component
│   │   │   ├── WhatsAppSimulation_Enhanced.tsx # Round 2 improved UI
│   │   │   ├── RoomGrid.tsx         # Display available rooms
│   │   │   ├── RoomCard.tsx         # Individual room card
│   │   │   ├── Leaderboard.tsx      # Rankings display
│   │   │   ├── Features.tsx         # Feature highlights
│   │   │   ├── ScannerUpload.tsx    # File upload scanner
│   │   │   └── TickerStrip.tsx      # Animated ticker
│   │   ├── ui/                      # Reusable UI components
│   │   │   ├── Button.tsx           # Button component
│   │   │   ├── Modal.tsx            # Modal dialog
│   │   │   ├── Toast.tsx            # Toast notification
│   │   │   ├── QuizCard.tsx         # Quiz card UI
│   │   │   ├── CursorEffect.tsx     # Custom cursor effect
│   │   │   └── RoundSelector.tsx    # Round selection UI
│   │
│   ├── hooks/                       # React custom hooks
│   │   ├── useGameSocket.ts         # Round 1 WebSocket state
│   │   ├── useRound2Socket.ts       # Round 2 WebSocket state
│   │   ├── useLobbySocket.ts        # Lobby state
│   │   ├── useRoom.ts               # Room management
│   │   ├── useToast.ts              # Toast notifications
│   │   ├── useCursor.ts             # Custom cursor tracking
│   │   ├── useReveal.ts             # Animation state
│   │   └── useCounter.ts            # Counter state
│   │
│   ├── lib/
│   │   ├── api.ts                   # API client utilities
│   │   ├── constants.ts             # Frontend constants
│   │   ├── rooms.ts                 # Room utilities
│   │   ├── types.ts                 # TypeScript type definitions
│   │   └── utils.ts                 # Helper functions
│   │
│   ├── package.json                 # Node.js dependencies
│   ├── package-lock.json            # Dependency lock file
│   ├── tsconfig.json                # TypeScript configuration
│   ├── next.config.ts               # Next.js configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── eslint.config.mjs            # ESLint rules
│   ├── postcss.config.mjs           # PostCSS configuration
│   └── public/                      # Static assets
│
├── .gitignore                       # Git ignore rules
├── requirements.txt                 # Root-level Python deps (if any)
├── tailwind.config.ts               # Root tailwind config
├── tsconfig.json                    # Root TypeScript config
├── ESLint.config.mjs                # Root ESLint config
└── README.md                        # This file
```

### Running Tests
```bash
# Backend tests (if available)
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

### Building for Production
```bash
# Build backend
cd backend
# (No build step needed for FastAPI - runs directly)

# Build frontend
cd frontend
npm run build
npm start  # Runs on port 3000 in production mode
```

## 🎮 Gameplay Guide

### Game Flow Diagram
```
START
  ↓
CREATE/JOIN ROOM → Enter Nickname → Get Room Code
  ↓
ROOM LOBBY → Wait for players (multiplayer) or start solo
  ↓
SELECT DIFFICULTY
  ├─ EASY (15 min)   → Obvious red flags
  ├─ MEDIUM (10 min) → Realistic elements
  └─ HARD (5 min)    → Professional scams
  ↓
ROUND 1: CALL SIMULATION
  ├─ Receive AI scammer call
  ├─ Make strategic decisions
  │  ├─ Ask Questions (builds evidence)
  │  ├─ Request Verification (increases skepticism)
  │  ├─ Block (instant win, 90+ points)
  │  ├─ Ignore (instant win, 85+ points)
  │  └─ Share Info (instant loss, 0 points)
  └─ Get Round 1 Score
  ↓
TRANSITION SCREEN → Click "NEXT ROUND ▶"
  ↓
ROUND 2: WHATSAPP SIMULATION
  ├─ Receive AI scammer message
  ├─ Send your response → AI responds dynamically
  ├─ Scammer employs new tactics based on your response
  ├─ Time runs out after set duration
  └─ Get Round 2 Score
  ↓
RESULTS SCREEN
  ├─ Game Status (Survived/Scammed)
  ├─ Total Score (0-100)
  ├─ Detailed Analytics
  │  ├─ Panic Level
  │  ├─ Response Time
  │  ├─ Questions Asked
  │  ├─ Red Flags Ignored
  │  └─ Behavior Profile
  ├─ Learning Recommendations
  └─ Save to Leaderboard
  ↓
END
```

### Decision Making Examples

**Round 1: Call from "Bank Agent"**
```
CALL: "Hi, we've detected suspicious activity on your account"

Your Options:
1. "Ask Questions" → "What kind of activity?" 
   ✅ Good - Buys time, shows skepticism

2. "Request Verification" → "Can you verify your employee ID?"
   ✅ Good - Legitimate way to verify

3. "Block" → HangUp
   ✅ Perfect - Immediate safety (90 points)

4. "Ignore" → Don't respond
   ✅ Good - Avoids engagement (85 points)

5. "Share Info" → Give card number
   ❌ Failed - AI scammer wins (0 points)
```

**Round 2: WhatsApp Message from Scammer**
```
SCAMMER: "Your Amazon package needs payment for customs. Click link to pay."

Your Response: "That seems suspicious. I haven't ordered anything."

AI ADAPTS: 
"I'm so sorry for confusion! You ordered iPhone 14. 
Here's the Amazon order number: AMZ-123456. 
Link: amazn-payment-link.com (typo intentional)"

Your Response: "I'll check with Amazon directly"

RESULT: ✅ You won! Refused to click link. (Score: 92)
```

## 🔌 API Reference

### Room Management Endpoints

#### Create Room
```bash
POST /rooms/create
Content-Type: application/json

{
  "nickname": "Player1"
}

Response:
{
  "room_code": "ABC123",
  "player_id": "uuid-string",
  "players": [{"id": "uuid", "nickname": "Player1"}],
  "status": "waiting",
  "created_at": "2026-04-04T10:00:00Z"
}
```

#### Join Room
```bash
POST /rooms/join
Content-Type: application/json

{
  "room_code": "ABC123",
  "nickname": "Player2"
}

Response:
{
  "room_code": "ABC123",
  "player_id": "uuid-string",
  "players": [
    {"id": "uuid1", "nickname": "Player1"},
    {"id": "uuid2", "nickname": "Player2"}
  ],
  "status": "waiting"
}
```

#### List Rooms
```bash
GET /rooms/list

Response: [
  {
    "room_code": "ABC123",
    "host": "Player1",
    "player_count": 2,
    "status": "waiting",
    "difficulty": null
  }
]
```

#### Start Game
```bash
POST /rooms/start
Content-Type: application/json

{
  "room_code": "ABC123",
  "difficulty": "Medium"  // Easy, Medium, Hard
}

Response:
{
  "room_code": "ABC123",
  "status": "in_progress",
  "difficulty": "Medium"
}
```

### Game WebSocket Endpoint

#### Connection
```
WS /game/ws/{room_code}/{player_id}

Connection Upgrade:
GET /game/ws/{room_code}/{player_id}
Upgrade: websocket
Connection: Upgrade
```

#### WebSocket Messages

**Incoming (From Server to Client)**
```json
{
  "event": "start_round",
  "data": {
    "type": "call",
    "content": "...scam script...",
    "scammer_type": "BankAgent",
    "difficulty": "Medium"
  }
}
```

**Outgoing (From Client to Server)**
```json
{
  "event": "player_action",
  "data": {
    "action": "ask_question",  // or: "request_verification", "block", "ignore", "share_info"
    "message": "Can you verify your identity?"
  }
}
```

### Round 2 WebSocket Endpoint

#### Initialize Round 2
```bash
POST /round2/initialize
Content-Type: application/json

{
  "room_code": "ABC123",
  "player_id": "uuid-string",
  "difficulty": "Medium"
}

Response:
{
  "session_id": "round2-uuid",
  "initial_message": "Hi! I'm calling about your recent order...",
  "scammer_type": "Delivery",
  "timestamp": "2026-04-04T10:05:00Z"
}
```

#### Round 2 Gameplay WebSocket
```
WS /round2/play/{room_code}

Client Message:
{
  "player_id": "uuid-string",
  "message": "That's suspicious, I'll check with Amazon directly",
  "timestamp": "2026-04-04T10:06:00Z"
}

Server Response:
{
  "event": "ai_response",
  "data": {
    "scammer_message": "No need! I can process it right now...",
    "confidence": 0.85,
    "tactics_used": ["urgency", "authority"],
    "timestamp": "2026-04-04T10:06:05Z"
  }
}
```

#### Finish Round 2
```bash
POST /round2/finish
Content-Type: application/json

{
  "room_code": "ABC123",
  "player_id": "uuid-string",
  "session_id": "round2-uuid"
}

Response:
{
  "outcome": "survived",  // or: "scammed"
  "score": 92,
  "analytics": {
    "messages_exchanged": 5,
    "time_taken": 120,
    "red_flags_caught": 3,
    "vulnerability_score": 0.35
  }
}
```

### Health & Status Endpoints

```bash
GET /health
# Returns: {"status": "healthy", "timestamp": "..."}

GET /docs
# Interactive API documentation (Swagger UI)

GET /redoc
# Alternative API documentation (ReDoc)
```

## 🏗️ System Architecture

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ React Components (TSX)                                │   │
│  │ - Room Lobby                                          │   │
│  │ - Round 1 Call Simulation UI                          │   │
│  │ - Round 2 WhatsApp UI                                 │   │
│  │ - Results Analytics                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕                                   │
│              ┌────────────────────────────┐                  │
│              │   WebSocket Connections    │                  │
│              │   (Real-time Updates)      │                  │
│              └────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ HTTP Routes (/rooms, /health)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           WebSocket Event Handlers                    │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ /game/ws/{room_code}/{player_id}               │   │   │
│  │ │ - Round 1 call simulation events                │   │   │
│  │ │ - Player action handling                        │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ /round2/play/{room_code}                       │   │   │
│  │ │ - WhatsApp message exchange                     │   │   │
│  │ │ - AI response generation                        │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Business Logic Services (30+)              │   │
│  │ - GameEngine (State Management)                       │   │
│  │ - AIScamGenerator (Groq API Integration)              │   │
│  │ - BehaviorDetector (Player Analysis)                  │   │
│  │ - ScenarioManager (Scenario Selection)                │   │
│  │ - ScoringService (Points Calculation)                 │   │
│  │ - RoomManager (Multiplayer Coordination)              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        LLaMA 3.3 API Integration (Groq)              │   │
│  │ - Dynamic message generation                          │   │
│  │ - Behavior adaptation                                 │   │
│  │ - Context awareness                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           SQLite Database                             │   │
│  │ - Room state persistence                              │   │
│  │ - Player scores & history                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Service Layer Breakdown

**Game Orchestration**
- `GameEngine.py` - Central state machine
- `RoomManager.py` - Room lifecycle
- `RoundManager.py` - Multi-round coordination

**AI Integration**
- `AIScamGenerator.py` - Groq/LLaMA wrapper (primary AI)
- `AIService.py` - Shared AI utilities
- `Round2GameManager.py` - AI conversation management

**Game Logic**
- `ScenarioManager.py` - Scenario selection
- `AdaptiveCallManager.py` - Difficulty scaling
- `ScamFlowManager.py` - Scam progression
- `TimePresure.py` - Timer management
- `PowerUpSystem.py` - Power-up mechanics
- `WarningSystem.py` - Red flag detection

**Analytics & Scoring**
- `BehaviorDetector.py` - Player behavior analysis
- `PsychologicalScorer.py` - Vulnerability profiling
- `Scoring.py` - Score calculations

## 🎯 Scammer Profiles & Tactics

### 7 Scammer Archetypes

#### 1. **BankAgent** 👨‍💼
- **Tactic**: Security threat, account lockout
- **Red Flags**: Urgency, OTP requests, personal verification
- **Example**: "Your account has been compromised. We need your card details to secure it immediately."
- **Counter**: Banks never ask for OTP or full card details over phone

#### 2. **DeliveryCompany** 📦
- **Tactic**: Package payment, tracking link scams
- **Red Flags**: Unexpected delivery fees, shortened URLs, time pressure
- **Example**: "Your package needs customs payment. Click here: tiny-url.com/payment"
- **Counter**: Check delivery status directly on official website

#### 3. **GovernmentOfficial** 🏛️
- **Tactic**: Tax, fine, legal threats
- **Red Flags**: Threats of arrest, legal action warnings, authority claims
- **Example**: "This is IRS. You owe $5000 in unpaid taxes. Immediate payment required."
- **Counter**: Real agencies send official letters, never call demanding immediate payment

#### 4. **TechSupport** 🖥️
- **Tactic**: Malware warning, remote access, support scams
- **Red Flags**: Unsolicited tech warnings, remote access requests, urgency
- **Example**: "Your Windows has detected 27 viruses. Allow me remote access to fix it."
- **Counter**: Legitimate Microsoft never calls about viruses

#### 5. **InvestmentAdvisor** 💰
- **Tactic**: Unrealistic returns, FOMO, quick money
- **Red Flags**: Too-good-to-be-true returns, urgency, pressure to invest now
- **Example**: "Invest $5000 now, get $20000 guaranteed in 30 days. Limited spots available!"
- **Counter**: Legitimate investments never guarantee returns

#### 6. **TelecomOperator** 📱
- **Tactic**: Bill discounts, plan offers, verification tricks
- **Red Flags**: Unexpected discounts, identity verification requests, account urgency
- **Example**: "You're eligible for a $50 discount. Verify your SSN to activate it."
- **Counter**: Telecom providers don't call for verification without prior contact

#### 7. **FriendImpersonator** 👥
- **Tactic**: Emotional manipulation, emergency requests
- **Red Flags**: Unusual communication style, financial requests, emotional language
- **Example**: "Hey it's me! I'm stuck in [Country]. Need $500 for hotel. Don't tell parents!"
- **Counter**: Call the person back using their known number to verify

### Advanced Tactics Used by AI

The AI scammers use psychological manipulation:
- **Urgency Creation** - Time limits, immediate action required
- **Authority Building** - Claims of official titles, verification codes
- **Social Engineering** - Trust building, rapport development
- **Misdirection** - Shifting focus to irrelevant details
- **Reciprocity** - "I've helped you before, now you help me"
- **Scarcity** - "Limited time", "Only spots left"

## 🏆 Scoring System & Analytics

### Score Breakdown

**Round 1: Call Simulation (0-100 points)**
```
Action                  Points    Reasoning
─────────────────────────────────────────────
Block                   100       Most effective defense
Ignore                  85-90     Successful deflection (requires time)
Request Verification    70-75     Good critical thinking
Ask Question            60-65     Shows skepticism
Share Info             0          Immediate loss
```

**Round 2: WhatsApp Simulation (0-100 points)**
```
Criteria                  Calculation
─────────────────────────────────────
Duration Survived         (Time Remaining / Total Time) × 50
Questions Asked           (Smart Questions / Total Messages) × 25
Link Refusal             Did not click link = 15 points
Final Action             Block = 10, Ignore = 5
```

### Total Score Formula
```
Total Score = (Round1_Score × 0.5) + (Round2_Score × 0.5)

Score Ranges:
- 0-39:   🔴 SCAMMED - Fell for the trick
- 40-69:  🟡 PARTIALLY SCAMMED - Mixed results
- 70-84:  🟢 SURVIVED - Good defensive decisions
- 85-100: 🟢 PERFECT - Expert-level prevention
```

### Detailed Analytics Provided

**Per-Game Metrics**
- ✅ Total Score (0-100)
- ✅ Game Status (Survived / Scammed)
- ✅ Time Taken (seconds)
- ✅ Messages Exchanged (count)
- ✅ Questions Asked (count)
- ✅ Red Flags Identified (count)

**Behavioral Analysis**
- **Suspicion Level** (0-100) - How skeptical the player was
- **Trust Level** (0-100) - How easily persuaded
- **Pressure Susceptibility** - Vulnerability to urgency tactics
- **Panic Indicator** - Stress response measurement
- **Response Speed** - Average decision-making time

**Psychological Profile**
- **Empathy Rating** - Susceptibility to emotional manipulation
- **Authority Bias** - Vulnerability to "official" claims
- **FOMO Rating** - Fear of missing out susceptibility
- **Social Engineering Resistance** - Overall manipulation resistance
- **Recommended Learning Areas** - Personalized improvement suggestions

**Leaderboard Integration**
- Global ranking by score
- Difficulty-based rankings (Easy/Medium/Hard)
- Accuracy percentage tracking
- Survival rate statistics
- Most common successful strategies

## 📚 Educational Outcomes

### Risk Awareness Framework
After playing ScamEscape, players understand:

#### 1. **Red Flag Recognition**
- ✅ Urgency and time pressure tactics
- ✅ Requests for personal/financial information
- ✅ Suspicious URLs and typosquatting
- ✅ Threats and legal language abuse
- ✅ Unusual communication from "known" contacts
- ✅ Too-good-to-be-true offers

#### 2. **Verification Techniques**
- ✅ Contact the organization directly (use known number)
- ✅ Ask for employee ID and department
- ✅ Verify through official website
- ✅ Never trust revealed information at face value
- ✅ Legitimate orgs don't ask for OTP/passwords
- ✅ Check sender details carefully

#### 3. **Psychological Manipulation Tactics**
- ✅ How FOMO (Fear of Missing Out) is exploited
- ✅ Authority bias and impersonation
- ✅ Emotional manipulation and urgency
- ✅ Social engineering techniques
- ✅ How scammers build false trust
- ✅ Priming and anchoring tactics

#### 4. **Personal Info Protection**
- ✅ What information is sensitive (SSN, OTP, PIN, card details)
- ✅ When legitimate organizations request info
- ✅ How to safely share information
- ✅ Password security principles
- ✅ Two-factor authentication benefits
- ✅ Secure communication methods

#### 5. **Response Decision Making**
- ✅ When to ask questions (shows skepticism)
- ✅ When to request verification (legitimate defense)
- ✅ When to block/ignore (safest option)
- ✅ Never to share sensitive information
- ✅ How to refuse politely but firmly
- ✅ Knowing when to seek help

### Real-World Application
Players can apply ScamEscape learning to:
- 📞 Phone calls from unknown numbers
- 📱 Suspicious text messages and WhatsApp messages
- 💻 Email scams and phishing
- 🌐 Social media impersonation
- 💰 Financial threats and payment requests
- 🏪 Online shopping and delivery scams

## ⚙️ Configuration Guide

### Environment Variables (.env)

**Backend Configuration** (Create `backend/.env`)
```bash
# --- Groq AI Configuration ---
GROQ_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx     # Get from console.groq.com
GROQ_BASE_URL=https://api.groq.com/openai/v1   # Don't change

# --- Application Settings ---
DEBUG=False                 # Set to True for development
ENVIRONMENT=production      # "development" or "production"
LOG_LEVEL=info             # "debug", "info", "warning", "error"

# --- Database ---
DATABASE_URL=sqlite:///./test.db  # SQLite path or PostgreSQL connection

# --- API Configuration ---
API_HOST=0.0.0.0          # Listen on all interfaces
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]

# --- Game Settings ---
DEFAULT_GAME_TIMEOUT=1800  # 30 minutes in seconds
ENABLE_MULTIPLAYER=True
MAX_PLAYERS_PER_ROOM=4
```

**Frontend Configuration** (Create `frontend/.env.local`)
```bash
# --- Backend API ---
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# --- Analytics (Optional) ---
NEXT_PUBLIC_ANALYTICS_ID=
NEXT_PUBLIC_ENVIRONMENT=development
```

### Game Constants (Customizable)

Edit `backend/app/constants/game_constants.py`:
```python
# Timer durations (in seconds)
EASY_DIFFICULTY_TIMEOUT = 900      # 15 minutes
MEDIUM_DIFFICULTY_TIMEOUT = 600    # 10 minutes
HARD_DIFFICULTY_TIMEOUT = 300      # 5 minutes

# Scoring parameters
BLOCK_POINTS = 100
IGNORE_POINTS = 85
REQUEST_VERIFICATION_POINTS = 70
ASK_QUESTION_POINTS = 60
SHARE_INFO_POINTS = 0

# Message templates and customization
RED_FLAGS = [...]  # Add/modify red flags
SCAMMER_PROFILES = {...}  # Customize scammer behavior
```

### Feature Flags

Enable/disable features in backend startup:
```python
# backend/app/core/config.py
FEATURES = {
    "multiplayer": True,
    "leaderboard": True,
    "psychological_scoring": True,
    "ai_adaptation": True,
    "power_ups": True,
}
```

## 🚀 Deployment Guide

### Local Development (Already Covered Above)

### Docker Deployment

**Build Docker Images**
```bash
# Backend Dockerfile
cd backend
docker build -t scamescape-backend .
docker run -p 8000:8000 --env-file .env scamescape-backend

# Frontend Dockerfile
cd frontend
docker build -t scamescape-frontend .
docker run -p 3000:3000 scamescape-frontend
```

**Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - DATABASE_URL=sqlite:///./test.db
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  # Optional: PostgreSQL for production
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Deploy with Docker Compose**
```bash
docker-compose up -d
```

### Cloud Deployment Options

#### Option 1: Vercel + Railway

**Frontend on Vercel**
```bash
cd frontend
vercel deploy
```

**Backend on Railway**
```bash
# Connect Railway to GitHub
# Railway automatically deploys on push
# Set environment variables in Railway dashboard
```

#### Option 2: Heroku (Legacy but Works)

**Backend Deployment**
```bash
cd backend
heroku create scamescape-backend
heroku config:set GROQ_API_KEY=sk-or-v1-...
git push heroku main
```

**Frontend Deployment**
```bash
cd frontend
vercel deploy  # or netlify deploy
```

#### Option 3: AWS EC2

**Setup Ubuntu Server**
```bash
# SSH into EC2 instance
sudo apt update && sudo apt upgrade -y
sudo apt install python3.13 nodejs npm git

# Clone repo
git clone https://github.com/taksh1507/ScamEscape.git
cd ScamEscape

# Setup backend
cd backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Configure .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Setup frontend
cd ../frontend
npm install
npm run build
npm start &
```

### Production Checklist

- [ ] Enable HTTPS (SSL certificate)
- [ ] Set `DEBUG=False` in backend
- [ ] Use production-grade database (PostgreSQL)
- [ ] Configure CORS for your domain
- [ ] Set up monitoring & logging
- [ ] Enable rate limiting
- [ ] Regular backups of game data
- [ ] Use environment secrets manager
- [ ] Monitor Groq API usage & costs

## 🧪 Testing & Validation

### Manual Testing Checklist

**Backend Health Check**
```bash
# Check backend is running
curl http://localhost:8000/health
# Expected: {"status": "healthy", "timestamp": "..."}

# View API documentation
# Visit: http://localhost:8000/docs
```

**Frontend Health Check**
```bash
# Check frontend is served
curl http://localhost:3000
# Expected: HTML response with page content
```

**Room Creation API Test**
```bash
curl -X POST http://localhost:8000/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"nickname": "TestPlayer"}'

# Expected response:
# {
#   "room_code": "ABC123",
#   "player_id": "...",
#   "players": [...],
#   "status": "waiting"
# }
```

**WebSocket Connection Test**
```bash
# Using wscat tool
npm install -g wscat
wscat -c "ws://localhost:8000/game/ws/ABC123/player_uuid"

# Once connected, send:
# {"event": "player_action", "data": {"action": "ask_question", "message": "Who are you?"}}
```

### Automated Tests (To Implement)

```bash
# Backend unit tests
cd backend
pytest tests/

# Backend integration tests
pytest tests/integration/

# Frontend component tests
cd frontend
npm test

# Frontend E2E tests
npm run test:e2e
```

### Performance Testing

```bash
# Load test with 100 concurrent players
ab -n 1000 -c 100 http://localhost:8000/rooms/list

# WebSocket load test
artillery quick --count 10 --num 100 ws://localhost:8000/game/ws/test/uuid
```
WebSocket Broadcast      PASS       Error handling for closed connections
Game Scoring             PASS       Block/Ignore = WIN, Share Info = LOSS
```

## 🐛 Troubleshooting Guide

### Backend Issues

**Issue: "Groq API Key Invalid"**
```bash
# Solution:
# 1. Check .env file has correct format
grep GROQ_API_KEY backend/.env

# 2. Verify key at https://console.groq.com
# 3. Key should start with: sk-or-v1-...

# 4. Restart backend service
python -m uvicorn app.main:app --reload
```

**Issue: "Port 8000 Already in Use"**
```bash
# On Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# On macOS/Linux
lsof -i :8000
kill -9 <PID>

# Or use different port
python -m uvicorn app.main:app --port 8001
```

**Issue: "ModuleNotFoundError: No module named 'app'"**
```bash
# Solution: Install dependencies
cd backend
pip install -r requirements.txt

# Verify virtual environment activation
which python  # Should show venv path
```

**Issue: "WebSocket Connection Refused"**
```bash
# Check backend is running:
curl http://localhost:8000/health

# Check CORS configuration in backend/app/core/config.py
# Verify frontend URL is in CORS_ORIGINS

# Restart both services
```

### Frontend Issues

**Issue: "Cannot GET /" (404 error)**
```bash
# Solution:
# 1. Check frontend is running
curl http://localhost:3000

# 2. Clear Next.js cache
cd frontend
rm -rf .next
npm run dev

# 3. Check port 3000 is available
lsof -i :3000
```

**Issue: "NEXT_PUBLIC_API_URL not defined"**
```bash
# Solution: Create frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
npm run dev
```

**Issue: "Module not found errors"**
```bash
# Solution:
cd frontend
npm install
npm run dev
```

### Installation Issues

**Issue: "Python 3.13 not found"**
```bash
# Check Python version
python --version

# Should be 3.13 or higher
# Download from: https://www.python.org/downloads/

# If 3.12 installed, use:
python -m venv venv  # Still works with 3.12+
```

**Issue: "npm install fails"**
```bash
# Solution:
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install

# 4. If still fails, update npm
npm install -g npm@latest
```

### Performance Issues

**Issue: "Game is slow/laggy"**
```bash
# Check backend CPU usage
# If high: AI is generating messages slowly
# Solution: Use easier difficulty (generates simpler messages faster)

# Check network latency:
# http://localhost:3000/health endpoint response time

# Solutions:
# - Reduce players in room
# - Use local backend (not deployed)
# - Check internet connection
```

**Issue: "Messages take too long to generate"**
```bash
# This is normal first game (AI model loading)
# Subsequent games load faster (cached)

# Check Groq API status:
# Visit: https://status.groq.com

# Verify API quota at:
# https://console.groq.com/keys
```

### API/WebSocket Issues

**Issue: "401 Unauthorized from API"**
```bash
# Solution: Check authentication
# Verify room_code and player_id are correct
# Rejoin room if needed
```

**Issue: "WebSocket connection keeps dropping"**
```bash
# Backend logs should show reason
# Common causes:
# - Network timeout
# - Server restart
# - Client disconnection

# Solution: Add reconnection logic
# (Already implemented in useGameSocket.ts hook)
```

### Data/State Issues

**Issue: "Game state not persisting"**
```bash
# Check database is accessible:
ls -la backend/test.db

# If missing, database will recreate on start
# Check backend logs for persistence errors

# For PostgreSQL, verify connection:
psql -U postgres -d scamescape -h localhost
```

**Issue: "Leaderboard scores incorrect"**
```bash
# Clear leaderboard and restart:
# Browser DevTools → Application → Local Storage
# Delete: fraudguard_leaderboard_data

# Refresh page and play fresh game
```

## 🤝 Contributing

### How to Contribute

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/ScamEscape.git
   cd ScamEscape
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # Example: feature/add-new-scammer-type
   ```

3. **Make Changes**
   ```bash
   # Edit files
   # Run tests
   # Commit regularly
   git add .
   git commit -m "Add: Brief description of change"
   ```

4. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and click "Create Pull Request"
   - Describe your changes clearly
   - Link any related issues

### Contribution Areas

**🎮 Game Features**
- New scammer profiles/tactics
- Additional power-ups
- New game modes
- Enhanced difficulty scaling

**🎨 UI/UX Improvements**
- Better animations
- Accessibility features
- Mobile responsiveness
- Dark mode support

**🤖 AI & NLP**
- Better message generation
- Context awareness improvements
- New manipulation tactics
- Dialogue flow enhancement

**📊 Analytics**
- Additional metrics
- Better reporting
- Leaderboard features
- Data visualization

**🐛 Bug Fixes**
- Performance optimization
- WebSocket stability
- Error handling
- Edge case coverage

**📖 Documentation**
- Better guides
- Tutorial improvements
- API documentation
- Code examples

### Coding Standards

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode enabled, proper types
- **Comments**: Clear, meaningful comments for complex logic
- **Testing**: Write tests for new features
- **Commits**: Descriptive commit messages

### Testing Before PR

```bash
# Backend
cd backend
pip install -r requirements.txt
pytest

# Frontend
cd frontend
npm install
npm test
npm run build
```

## 📋 Project Roadmap

### Phase 1: MVP (Current) ✅
- [x] Core game engine (Call Simulation)
- [x] AI-powered scammer (Groq/LLaMA)
- [x] Round 2 WhatsApp simulation
- [x] Scoring system
- [x] Basic analytics

### Phase 2: Enhanced Experience (Next)
- [ ] Mobile app (React Native)
- [ ] Multiplayer real-time gameplay
- [ ] Advanced psychological profiling
- [ ] Leaderboard improvements
- [ ] Offline mode support
- [ ] Export analytics as PDF

### Phase 3: Advanced Features (Planned)
- [ ] Video call simulation (Round 1.5)
- [ ] SMS/Email phishing simulation
- [ ] Social media impersonation scenarios
- [ ] Corporate fraud training module
- [ ] API for enterprise deployments
- [ ] Multi-language support

### Phase 4: Scale & Monetize (Future)
- [ ] Subscription tiers
- [ ] Corporate training packages
- [ ] Analytics dashboard for educators
- [ ] Certification program
- [ ] Community features
- [ ] Marketplace for scenarios

## 📞 Support & Community

### Getting Help

**Questions? Issues?**
- 📧 Email: support@scamescape.com
- 💬 Discussions: GitHub Discussions tab
- 🐛 Bugs: GitHub Issues
- 💡 Feature Requests: GitHub Issues (label: enhancement)

### Community Links
- 🌐 Website: [your-website.com]
- 🐦 Twitter: [@ScamEscape]
- 📰 Blog: [blog-link]
- 🎥 YouTube: [youtube-channel]

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

### MIT License Summary
- ✅ Free to use commercially
- ✅ Can modify and distribute
- ✅ Must include license and copyright notice
- ✅ Provided "as is" without warranty

## 🙋 Acknowledgments

- **Groq** for ultra-fast LLaMA inference
- **Next.js** team for the excellent React framework
- **FastAPI** community for building great web APIs
- **All contributors** who help improve ScamEscape

---

**Last Updated**: April 4, 2026  
**Version**: 2.0.0  
**Status**: Production Ready  
**AI Model**: Groq LLaMA 3.3 70B  
**Framework**: Next.js 16 + FastAPI 0.115

🚀 **Ready to train against scammers?**  
Visit: **http://localhost:3000** and start playing!

