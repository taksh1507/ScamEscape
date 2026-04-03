# FraudGuard Arena

Real-time multiplayer scam simulation game built with Next.js, FastAPI, and WebSockets.

## Setup Instructions

### Backend
1. Navigate to the `backend` folder.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your OpenAI API key in a `.env` file in the `backend` folder (optional, but recommended for AI-generated scenarios):
   ```
   OPENAI_API_KEY=your_key_here
   ```
4. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend
1. Navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Round 1: Call Simulation
This round features a dynamic, AI-powered call simulation where users must listen to a scammer's script and make a decision to avoid being scammed.
