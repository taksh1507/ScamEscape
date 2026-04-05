# 🚀 ScamEscape - Complete Setup Guide

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [API Key Setup](#api-key-setup)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Verification & Testing](#verification--testing)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Minimum Requirements
- **RAM**: 4GB (2GB minimum, but tight)
- **Disk**: 2GB free space
- **Processor**: 2-core CPU minimum
- **OS**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)

### Required Software
```
✓ Python 3.13+
✓ Node.js 18.x or higher
✓ npm 9.x or yarn 3.x
✓ Git (for cloning repository)
```

### Check Your Versions
```bash
# Python
python --version        # or python3 --version

# Node.js & npm
node --version
npm --version

# Git
git --version
```

---

## 🔑 API Key Setup

### Step 1: Get GROQ API Key (FREE)

Groq provides a free API with no credit card required.

1. **Visit**: https://console.groq.com/keys
2. **Sign up** with your email address
3. **Verify** your email if prompted
4. **Create new API key**:
   - Click "Create New API Key"
   - Name it: `ScamEscape-Dev` (optional)
   - Copy the key (starts with `gsk_`)
5. **Save securely** - you'll need this in Step 3 below

**✅ Features**:
- Free tier with NO rate limits
- Supports llama-3.3-70b-versatile model
- Instant inference (no queue)
- Perfect for development and small-scale deployment

### Step 2: Optional - MongoDB Atlas Setup (Cloud Database)

If using local MongoDB, skip to **Backend Setup**.

1. **Visit**: https://www.mongodb.com/cloud/atlas
2. **Create account** with email/Google/GitHub
3. **Create organization** and project
4. **Create cluster**:
   - Choose FREE tier
   - Select region closest to you
   - Click "Create Cluster"
5. **Setup database access**:
   - Go to "Database Access"
   - Add database user
   - Create username & password
   - Choose "Password" in "Authentication Method"
6. **Get connection string**:
   - Go to "Clusters"
   - Click "Connect"
   - Choose "Drivers"
   - Copy connection string
   - Replace `<username>`, `<password>`, and `<dbname>`
   - Format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

---

## 🗄️ Database Setup

### Option A: Local MongoDB (Development)

**Windows**:
1. Download: https://www.mongodb.com/try/download/community
2. Run installer and follow prompts
3. Choose "Install MongoDB as a Service"
4. MongoDB starts automatically

**macOS**:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu)**:
```bash
# Add MongoDB repository
curl https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verify MongoDB is running**:
```bash
# Connect to MongoDB CLI
mongosh
# Should show: mongosh (version)
# Type: exit
```

### Option B: MongoDB Atlas (Cloud)

Use the connection string from Setup above. No local installation needed.

---

## 🐍 Backend Setup

### Windows (PowerShell)

```powershell
# Navigate to backend
cd ScamEscape_fresh
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# You should see (venv) in your prompt
```

If you get execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

```powershell
# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep -E "fastapi|pydantic|groq"
```

**Create .env file**:
```powershell
# Create .env in backend root
notepad .env
```

Add these lines:
```
GROQ_API_KEY=gsk_your_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=scamescape
ENVIRONMENT=development
DEBUG=true
FRONTEND_ORIGIN=http://localhost:3000
```

Save and close.

**Start backend server**:
```powershell
# Make sure you're in the backend directory with venv activated
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ GROQ AI Client initialized successfully
```

### macOS/Linux (Bash)

```bash
# Navigate to backend
cd ScamEscape_fresh
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# You should see (venv) in your prompt
```

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep -E "fastapi|pydantic|groq"
```

**Create .env file**:
```bash
cat > .env << EOF
GROQ_API_KEY=gsk_your_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=scamescape
ENVIRONMENT=development
DEBUG=true
FRONTEND_ORIGIN=http://localhost:3000
EOF
```

**Start backend server**:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Verify Backend is Running

**In another terminal**, test the API:
```bash
curl -X GET http://localhost:8000/health
# Should return: {"status":"healthy"}
```

Or visit in browser: http://localhost:8000/docs

---

## 📦 Frontend Setup

Open a **new terminal** (keep your backend terminal running).

```bash
# Navigate to frontend
cd ScamEscape_fresh
cd frontend

# Install dependencies
npm install
# (This will take 2-3 minutes)

# Start development server
npm run dev
```

Expected output:
```
➜ Local: http://localhost:3000
```

---

## ✅ Verification & Testing

### Test 1: Check Backend Health

```bash
curl -X GET http://localhost:8000/health

# Expected response:
# {"status":"healthy"}
```

### Test 2: Check Frontend

Open browser and go to: **http://localhost:3000**

You should see:
- ScamEscape logo
- "Learn. Play. Survive." tagline
- Red/cyan cyberpunk aesthetic
- All buttons clickable

### Test 3: Create a Game Room

1. Click "PLAY NOW" or scroll to rooms section
2. Enter a room name (e.g., "TestRoom")
3. Enter your name (e.g., "TestUser")
4. Click "CREATE ROOM"
5. You should get a 6-character room code
6. Copy the room code

### Test 4: API Integration

In browser console (F12 → Console):
```javascript
// Test API connection
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend connected:', d))
  .catch(e => console.error('❌ Backend error:', e))
```

Should log: `✅ Backend connected: {status: 'healthy'}`

---

## 🐛 Troubleshooting

### Backend Issues

**"ModuleNotFoundError: No module named 'fastapi'"**
```bash
# Make sure venv is activated (you should see (venv) in prompt)
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\Activate.ps1  # Windows

# Then reinstall
pip install -r requirements.txt
```

**"GROQ_API_KEY not found"**
```bash
# Check .env file exists and is in correct location
ls -la .env  # macOS/Linux
dir .env    # Windows

# Make sure file contains:
GROQ_API_KEY=gsk_...your_key...

# If not, recreate it manually
```

**"Connection refused on port 8000"**
```bash
# Something else is using port 8000
# Find and kill the process:
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process:
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Frontend Issues

**"npm: command not found"**
```bash
# Install Node.js from https://nodejs.org
# Then verify installation:
node --version
npm --version
```

**"Port 3000 already in use"**
```bash
# Kill the process using port 3000:
lsof -i :3000  # macOS/Linux - then kill -9 <PID>
netstat -ano | findstr :3000  # Windows - then taskkill /PID <PID> /F
```

**"Module not found" errors during npm install**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json  # or delete manually on Windows
npm install
```

### Connection Issues

**Frontend can't reach backend**
```bash
# Check FRONTEND_ORIGIN in backend .env matches:
# FRONTEND_ORIGIN=http://localhost:3000

# Check backend is actually running:
curl http://localhost:8000/health
```

**WebSocket connection fails**
```bash
# Make sure both services are running
# Backend: http://localhost:8000
# Frontend: http://localhost:3000

# Check browser console (F12) for errors
# Network tab should show successful WebSocket handshake
```

---

## 📚 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | Required | Your Groq API key (get free from console.groq.com) |
| `GROQ_BASE_URL` | https://api.groq.com/openai/v1 | Groq API endpoint |
| `MONGODB_URL` | mongodb://localhost:27017 | Database connection (local or Atlas) |
| `DATABASE_NAME` | scamescape | Database name |
| `ENVIRONMENT` | production | dev/production mode |
| `DEBUG` | false | Enable debug logging |
| `FRONTEND_ORIGIN` | http://localhost:3000 | Frontend URL for CORS |

---

## 🎉 You're All Set!

Your ScamEscape development environment is ready!

**Next steps**:
1. Explore the game at http://localhost:3000
2. Create a room and play a test round
3. Check the leaderboard
4. Read [API Documentation](./API_DOCS.md) for backend details
5. Read [Architecture Guide](./ARCHITECTURE.md) for code structure

**Happy fraud-fighting! 🛡️**
