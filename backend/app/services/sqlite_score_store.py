"""SQLite-based score storage for leaderboard"""
import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime
from typing import List, Dict, Any
from app.utils.logger import get_logger

log = get_logger(__name__)

# Database path - use project root
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'scores.db')

class SQLiteScoreStore:
    """SQLite-based score storage for player leaderboard"""
    
    @staticmethod
    def _init_db():
        """Initialize database schema"""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS player_scores (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        player_id TEXT NOT NULL,
                        nickname TEXT,
                        room_code TEXT,
                        round_number INTEGER,
                        score INTEGER NOT NULL,
                        grade TEXT,
                        result TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                # Add result column if it doesn't exist (migration for existing databases)
                try:
                    conn.execute('ALTER TABLE player_scores ADD COLUMN result TEXT')
                except:
                    pass  # Column already exists
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS player_totals (
                        player_id TEXT PRIMARY KEY,
                        nickname TEXT,
                        total_score INTEGER DEFAULT 0,
                        games_played INTEGER DEFAULT 0,
                        avg_score REAL DEFAULT 0.0,
                        last_played DATETIME,
                        last_grade TEXT
                    )
                ''')
                conn.commit()
                log.info(f"✅ SQLite database initialized at {DB_PATH}")
        except Exception as e:
            log.error(f"❌ Failed to init SQLite: {e}")
    
    @staticmethod
    def save_score(player_id: str, nickname: str, room_code: str, round_number: int, 
                   score: int, grade: str = 'F', result: str = None) -> bool:
        """Save player score to SQLite
        
        Args:
            player_id: Player ID
            nickname: Player nickname
            room_code: Room code
            round_number: Round number (1 or 2)
            score: Score earned
            grade: Letter grade (A-F)
            result: Game result ('scammed', 'detected', or None)
        """
        try:
            with sqlite3.connect(DB_PATH) as conn:
                # Insert score record with result
                conn.execute('''
                    INSERT INTO player_scores 
                    (player_id, nickname, room_code, round_number, score, grade, result)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (player_id, nickname, room_code, round_number, score, grade, result))
                
                # Update totals
                cursor = conn.cursor()
                cursor.execute('SELECT total_score, games_played FROM player_totals WHERE player_id = ?', (player_id,))
                result = cursor.fetchone()
                
                if result:
                    # Player exists - update
                    total = result[0] + score
                    games = result[1] + 1
                    avg = total / games if games > 0 else 0
                    conn.execute('''
                        UPDATE player_totals 
                        SET total_score = ?, games_played = ?, avg_score = ?, last_played = CURRENT_TIMESTAMP, last_grade = ?
                        WHERE player_id = ?
                    ''', (total, games, avg, grade, player_id))
                else:
                    # New player
                    conn.execute('''
                        INSERT INTO player_totals 
                        (player_id, nickname, total_score, games_played, avg_score, last_played, last_grade)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                    ''', (player_id, nickname, score, 1, float(score), grade))
                
                conn.commit()
                log.info(f"✅ Saved score: {player_id} - {score}pts (round {round_number})")
                return True
        except Exception as e:
            log.error(f"❌ Failed to save score: {e}")
            return False
    
    @staticmethod
    def get_leaderboard(limit: int = 100) -> List[Dict[str, Any]]:
        """Get top players from leaderboard"""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT 
                        player_id, nickname, total_score, games_played, 
                        avg_score, last_played, last_grade,
                        RANK() OVER (ORDER BY total_score DESC) as rank
                    FROM player_totals
                    ORDER BY total_score DESC, last_played DESC
                    LIMIT ?
                ''', (limit,))
                
                rows = cursor.fetchall()
                leaderboard = [dict(row) for row in rows]
                log.info(f"✅ Retrieved leaderboard: {len(leaderboard)} entries")
                return leaderboard
        except Exception as e:
            log.error(f"❌ Failed to get leaderboard: {e}")
            return []
    
    @staticmethod
    def get_player_stats(player_id: str) -> Dict[str, Any]:
        """Get player stats"""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM player_totals WHERE player_id = ?
                ''', (player_id,))
                
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception as e:
            log.error(f"❌ Failed to get player stats: {e}")
            return None


# Initialize database on import
SQLiteScoreStore._init_db()
