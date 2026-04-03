# ScamEscape - Fraud Prevention Training Game

## Overview

**ScamEscape** is an interactive fraud prevention training game that teaches players to identify and avoid real scams through two comprehensive simulation rounds. Players face realistic scammers through phone calls (Round 1) and WhatsApp messages (Round 2), making decisions to block, ignore, or unfortunately fall for the scam.

The game uses **AI-powered (Groq/LLaMA)** dynamic scam scenarios that adapt based on player behavior, difficulty level, and scammer type, providing an engaging and educational anti-fraud training experience.

## Key Features

### Round 1: Call Simulation
- 🤖 **AI-Generated Scam Calls** - Realistic voice-based scam scenarios
- 📊 **7 Scammer Types** - Bank agents, delivery companies, government officials, tech support, investment advisors, telecom operators, friend impersonators
- ⏱️ **Time Pressure System** - Urgency mechanics that mimic real scams
- ⚠️ **Red Flag Detection** - Learn to identify warning signs
- 💪 **Power-Ups** - Strategic helpers to survive the scam attempt

### Round 2: WhatsApp Simulation  
- 💬 **Two-Way AI Conversations** - Player sends message → AI responds dynamically
- 🎯 **Adaptive Behavior** - AI adjusts strategy based on player actions
- 📱 **WhatsApp UI** - Authentic messaging interface
- 🏆 **Dynamic Scoring** - Real-time score calculation
- 📈 **Analytics Dashboard** - Detailed performance metrics

### Game Intelligence
- **Behavioral Analysis** - Tracks player suspicious/trusting patterns
- **Psychological Scoring** - Measures vulnerability to social engineering
- **Learning Adaptation** - Difficulty scales with player performance
- **Multi-Difficulty Modes** - Easy, Medium, Hard with varying message realism

## Tech Stack

### Backend
- **Framework**: FastAPI 0.115.0 (Python)
- **Real-time**: WebSockets for live gameplay
- **AI**: Groq API with LLaMA 3.3 70B model
- **Database**: SQLite (lightweight training data)
- **Async**: Python asyncio for concurrent operations

### Frontend
- **Framework**: Next.js 16.2.2 (React 19.2.4)
- **UI**: Tailwind CSS 4, TypeScript 5.x
- **Real-time**: WebSocket client for game events
- **State Management**: React Hooks

### AI Integration
- **Provider**: Groq API (High-speed inference)
- **Model**: LLaMA 3.3 70B Versatile
- **Features**: Dynamic message generation, behavior adaptation, context awareness

## Installation

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm or yarn
- Groq API key (free tier available at https://console.groq.com)

### Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create Python environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create .env file with:
# GROQ_API_KEY=your_api_key_here
# GROQ_BASE_URL=https://api.groq.com/openai/v1

# Start backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Start Both Servers

From root directory:
```bash
# Terminal 1: Backend (http://localhost:8000)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend (http://localhost:3000)
cd frontend
npm run dev
```

**Access the game: http://localhost:3000**

## Game Flow

1. **Create/Join Room**
   - Enter nickname and create a new game room
   - OR join existing room with room code

2. **Select Difficulty**
   - **Easy**: Obviously suspicious messages with clear red flags (15 minutes)
   - **Medium**: Mix of realistic and suspicious elements (10 minutes)
   - **Hard**: Highly realistic, difficult to detect as scam (5 minutes)

3. **Round 1: Call Simulation**
   - Receive call from AI scammer
   - Adaptive messages based on scammer type and difficulty
   - React to pressure, questions, and requests
   - **Goal**: Ignore or block the scammer

4. **Transition to Round 2**
   - Click "NEXT ROUND ▶" button
   - System initializes WhatsApp simulation

5. **Round 2: WhatsApp Simulation**
   - Receive messages from scammer on WhatsApp-style UI
   - Send your own messages → AI responds dynamically in real-time
   - Available actions: Ask questions, request verification, block, ignore
   - **Goal**: Block/Ignore to win with 85+ score

6. **Final Score Screen**
   - View game result with complete analytics
   - **Survived**: Successfully blocked/ignored the scam
   - **Scammed**: Fell for it by sharing sensitive information
   - Detailed learning metrics and recommendations

## API Endpoints

### Room Management
```
POST   /rooms/create              - Create new game room
POST   /rooms/join                - Join existing room
GET    /rooms/list                - List all available rooms  
POST   /rooms/start               - Start game in room
```

### Game WebSocket
```
WS     /game/ws/{room_code}/{player_id}  - Live game updates
```

### Round 2 Specific
```
POST   /round2/initialize         - Initialize Round 2 with AI
WS     /round2/play/{room_code}   - Round 2 gameplay websocket
POST   /round2/finish             - End Round 2 and get results
```

## Architecture

```
ScamEscape/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── room.py             # Room management routes
│   │   │   ├── game.py             # Game state endpoints
│   │   │   └── round2.py           # Round 2 gameplay
│   │   ├── services/               # Business logic layer
│   │   │   ├── ai_scam_generator.py   # AI message generation
│   │   │   ├── round2_game_manager.py # Round 2 orchestration
│   │   │   ├── behavior_detector.py   # Player behavior analysis
│   │   │   ├── game_engine.py         # Core game state
│   │   │   └── [8 more specialized services]
│   │   ├── models/                 # Pydantic data models
│   │   ├── schemas/                # Request/response schemas
│   │   ├── core/                   # Configuration & events
│   │   └── constants/              # Game constants
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # API keys (git ignored)
│   └── main.py                     # FastAPI app entry
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Home/room selection
│   │   ├── simulation/
│   │   │   ├── call/               # Round 1 page
│   │   │   └── whatsapp/           # Round 2 page
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── sections/
│   │   │   ├── CallSimulation.tsx   # Round 1 UI component
│   │   │   └── WhatsAppSimulation.tsx # Round 2 UI with AI chat
│   │   ├── ui/                     # Reusable UI components
│   │   └── hooks/
│   │       └── useRound2Socket.ts  # WebSocket hook
│   ├── package.json                # Node dependencies
│   └── next.config.js              # Next.js configuration
│
└── README.md                       # This documentation
```

## Gameplay Mechanics

### Scammer Types & Tactics
1. **Bank Agent** - Account security threats, OTP requests, urgent verification
2. **Delivery Company** - Package payment issues, fake tracking links, fee collection
3. **Friend in Distress** - Emotional manipulation, emergency requests, trust exploitation
4. **Government Official** - Legal threats, tax/fine collection, authority abuse
5. **Tech Support** - Malware warnings, remote access requests, support scams
6. **Investment Advisor** - Unrealistic returns, FOMO tactics, quick money promises
7. **Telecom Operator** - Bill discounts, identity verification tricks, plan offers

### Player Actions Available
- **Ask Question** - Request more info to verify legitimacy
- **Request Verification** - Ask for proof of identity
- **Ignore** - Don't engage with the scammer (WIN - 85+ score)
- **Block** - Block the contact (WIN - 85+ score)
- **Share Sensitive Info** - Fall for scam (LOSE - 0 score)

### Power-Ups System
- 🤝 **Talk to Friend** - Get advice from trusted contact
- 🔔 **Real-Time Alert** - Automatic red flag detection
- ⏸️ **Delay Response** - Pause countdown for thinking time
- 🚫 **Block Caller** - Immediate success

## Performance Metrics

### Tracked Statistics
- **Panic Level** (0-100) - How stressed the player became
- **Response Time** - Speed of decision-making
- **Questions Asked** - Critical thinking attempts
- **Warnings Ignored** - Missed red flags
- **Behavior Profile** - Suspicious vs. Trusting tendency
- **Final Score** (0-100) - Overall performance rating

### Score Calculation
- **Survived (85-100)**: Successfully blocked/ignored scam
- **Partially Scammed (40-84)**: Mixed results with some safe actions
- **Scammed (0-39)**: Fell for it by sharing sensitive data

## Learning Outcomes

After completing ScamEscape, players learn to:
- ✅ Identify common scam tactics and red flags
- ✅ Resist psychological pressure and artificial urgency
- ✅ Verify legitimacy of callers and contacts
- ✅ Protect sensitive information (OTP, card details, passwords)
- ✅ Make quick, confident safety decisions
- ✅ Understand social engineering and manipulation techniques

## Configuration

### Environment Variables (.env)
```
# Groq AI Configuration
GROQ_API_KEY=sk-or-v1-...your_key_here...
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Database
DATABASE_URL=sqlite:///./test.db

# Application
DEBUG=False
ENVIRONMENT=production
```

### Game Settings (in code)
- **TOTAL_ROUNDS**: 1 (Call Simulation)
- **Round 2**: Runs independently via separate endpoints
- **Game Duration**: 30 minutes total after Round 1
- **Countdown Timers**: Easy 900s (15min), Medium 600s (10min), Hard 300s (5min)

## Quick Start

### 1. Get Groq API Key
- Visit https://console.groq.com
- Sign up for free account
- Generate API key from dashboard
- Copy key to backend `.env` file

### 2. Install & Run
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev
```

### 3. Play Game
- Open http://localhost:3000
- Create room with nickname
- Select Easy/Medium/Hard difficulty
- Play Round 1, then NEXT ROUND for Round 2
- Make strategic decisions to avoid the scam

## Testing

### Health Check Commands
```bash
# Test Backend
curl http://localhost:8000/docs

# Test Frontend
curl http://localhost:3000

# Test Room Creation
curl -X POST http://localhost:8000/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"nickname": "TestPlayer"}'
```

### Full System Test
See [Test Results](#test-results) below for verified functionality.

## Test Results (Latest)

```
SYSTEM COMPONENTS        STATUS     DETAILS
─────────────────────────────────────────────
Backend API              PASS       Running on http://localhost:8000
Frontend Server          PASS       Running on http://localhost:3000
Room Creation API        PASS       Successfully creates game rooms
Room List API            PASS       Retrieves active rooms
AI Message Generation    PASS       7 realistic scam messages via Groq
Two-Way Conversation     PASS       AI responds to player messages
WebSocket Broadcast      PASS       Error handling for closed connections
Game Scoring             PASS       Block/Ignore = WIN, Share Info = LOSS
```

## Troubleshooting

### Backend Connection Issues
```bash
# Check port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # macOS/Linux

# Kill conflicting process (Windows)
taskkill /PID <PID> /F
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### AI Responses Not Generating
- ✓ Verify GROQ_API_KEY in `.env` is correct
- ✓ Check `.env` file exists in `backend/` directory
- ✓ Ensure Groq account has active API credits
- ✓ Test API key: `curl -H "Authorization: Bearer YOUR_KEY" https://api.groq.com/openai/v1/models`

### WebSocket Connection Errors
- ✓ Ensure backend is running on localhost:8000
- ✓ Check firewall isn't blocking WebSocket connections
- ✓ Verify browser console for detailed error messages
- ✓ Try incognito mode to bypass caching issues

## Future Enhancements

- [ ] Multiplayer co-op scam avoidance
- [ ] Global leaderboard with real-time scores
- [ ] Custom scenario builder for organizations
- [ ] Mobile app version
- [ ] Voice line integration for realistic phone calls
- [ ] Analytics dashboard for corporate trainers
- [ ] Certification program and completion tracking
- [ ] Integration with corporate training platforms (Moodle, Canvas)
- [ ] Email phishing simulation round
- [ ] SMS scam simulation

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add YourFeature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support & Contact

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing discussions for common problems
- Contact the development team

## Credits

**ScamEscape** was developed as a comprehensive fraud prevention training platform using cutting-edge AI technology.

Built with ❤️ for cybersecurity awareness education.

---

**Version**: 2.0.0  
**Status**: Production Ready  
**Last Updated**: April 4, 2026  
**AI Model**: Groq LLaMA 3.3 70B  
**Framework**: Next.js 16 + FastAPI 0.115

🚀 **Ready to train against scammers?**  
Visit: **http://localhost:3000** and start playing!

