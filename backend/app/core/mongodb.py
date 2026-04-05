"""
MongoDB connection and initialization
"""

import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# MongoDB connection URL from settings or environment
MONGODB_URL = settings.MONGODB_URL or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = settings.DATABASE_NAME or os.getenv("DATABASE_NAME", "scamescape")

# Global client and database instances
client = None
db = None
is_connected = False


def connect_to_mongo():
    """Connect to MongoDB"""
    global client, db, is_connected
    try:
        log.info(f"🔄 Connecting to MongoDB: {MONGODB_URL}")
        client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client[DATABASE_NAME]
        
        # Verify connection with a ping
        db.command("ping")
        is_connected = True
        log.info(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes
        create_indexes()
        return db
    except ServerSelectionTimeoutError:
        is_connected = False
        log.warning(f"⚠️ MongoDB not available at {MONGODB_URL}")
        log.warning("⚠️ Application will run with in-memory storage only")
        log.info("📍 To enable MongoDB:")
        log.info("   1. Install MongoDB locally: https://www.mongodb.com/try/download/community")
        log.info("   2. Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas")
        log.info("   3. Set MONGODB_URL in .env file")
        return None
    except Exception as e:
        is_connected = False
        log.warning(f"⚠️ Failed to connect to MongoDB: {e}")
        log.warning("⚠️ Application will run with in-memory storage only")
        return None


def close_mongo_connection():
    """Close MongoDB connection"""
    global client, is_connected
    if client:
        try:
            client.close()
            is_connected = False
            log.info("✅ Closed MongoDB connection")
        except Exception as e:
            log.warning(f"⚠️ Error closing MongoDB connection: {e}")


def create_indexes():
    """Create necessary indexes for better query performance"""
    if not is_connected or not db:
        return
    
    try:
        # Room collection indexes
        db.rooms.create_index("room_code", unique=True)
        db.rooms.create_index("created_at")
        db.rooms.create_index("status")
        
        # Player collection indexes
        db.players.create_index("player_id", unique=True)
        db.players.create_index("room_code")
        db.players.create_index("created_at")
        
        # Game session indexes
        db.game_sessions.create_index("room_code", unique=True)
        db.game_sessions.create_index("created_at")
        
        log.info("✅ MongoDB indexes created successfully")
    except Exception as e:
        log.warning(f"⚠️ Index creation warning: {e}")


def get_database():
    """Get the database instance"""
    if not is_connected or db is None:
        return None
    return db


def is_mongodb_connected():
    """Check if MongoDB is connected"""
    return is_connected and db is not None
