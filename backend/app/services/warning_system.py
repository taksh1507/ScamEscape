"""
Real-Time Warning System
Detects red flags and warnings during gameplay
Logs warnings for post-game analysis and training
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
import time
import re

from app.constants.whatsapp_types import RedFlag, RED_FLAG_DESCRIPTIONS


@dataclass
class WarningEvent:
    """Represents a detected warning/red flag"""
    flag: RedFlag
    timestamp: float
    player_id: str
    message_content: Optional[str] = None
    severity: str = "medium"  # "low", "medium", "high", "critical"
    description: str = ""
    player_ignored: bool = False  # Did player ignore this warning?


@dataclass
class PlayerWarnings:
    """Tracks all warnings detected for a player"""
    player_id: str
    warnings: List[WarningEvent] = field(default_factory=list)
    ignored_warnings: List[WarningEvent] = field(default_factory=list)
    undetected_warnings: List[WarningEvent] = field(default_factory=list)
    critical_violations: int = 0
    

class WarningSystem:
    """Detects red flags in real-time during gameplay"""
    
    # Red flag detection patterns
    URGENT_KEYWORDS = [
        "urgent", "immediately", "now", "quickly", "asap", "hurry",
        "right now", "emergency", "limited time", "only", "don't wait",
        "act now", "quick", "final warning", "deadline"
    ]
    
    OTP_KEYWORDS = ["otp", "one time password", "6 digit", "code", "pin"]
    
    PASSWORD_KEYWORDS = ["password", "pin", "cvv", "atm", "debit", "credit card"]
    
    PAYMENT_KEYWORDS = ["payment", "transfer", "send money", "account number", "bank", "upi"]
    
    LINK_PATTERN = r'(https?://[^\s]+|www\.[^\s]+|[a-z]+\://[^\s]+)'
    
    THREATENING_KEYWORDS = [
        "freeze", "lock", "block", "suspend", "close", "deactivate",
        "legal action", "prosecution", "arrest", "police", "fir",
        "court", "fine", "penalty", "jail"
    ]
    
    GRAMMAR_ERROR_PATTERNS = [
        r'u\b|ur\b|r\b|pls\b|plz\b',  # Text speak
        r'\s{2,}',  # Multiple spaces
        r'[A-Z]{4,}',  # ALL CAPS words
        r'\?{2,}|\!{2,}',  # Multiple punctuation
    ]
    
    def __init__(self):
        self.player_warnings: Dict[str, PlayerWarnings] = {}
    
    def scan_message(
        self, 
        player_id: str, 
        message: str, 
        sender_info: Dict,
        game_context: Dict = None
    ) -> List[WarningEvent]:
        """Scan a message for red flags"""
        if player_id not in self.player_warnings:
            self.player_warnings[player_id] = PlayerWarnings(player_id=player_id)
        
        detected_flags: List[WarningEvent] = []
        timestamp = time.time()
        
        # Check various red flags
        detected_flags.extend(self._check_sender_flags(player_id, sender_info, timestamp))
        detected_flags.extend(self._check_message_content_flags(player_id, message, timestamp))
        detected_flags.extend(self._check_context_flags(player_id, game_context, timestamp))
        
        # Store detected flags
        for flag in detected_flags:
            self.player_warnings[player_id].warnings.append(flag)
        
        return detected_flags
    
    def _check_sender_flags(
        self, 
        player_id: str, 
        sender_info: Dict, 
        timestamp: float
    ) -> List[WarningEvent]:
        """Check sender information for red flags"""
        flags: List[WarningEvent] = []
        
        # Unknown number
        if not sender_info.get("is_known_contact") and not sender_info.get("is_verified"):
            flags.append(WarningEvent(
                flag=RedFlag.UNKNOWN_NUMBER,
                timestamp=timestamp,
                player_id=player_id,
                severity="high",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.UNKNOWN_NUMBER]
            ))
        
        # Unverified badge (but has verified badge)
        if sender_info.get("has_verified_badge") and not sender_info.get("is_actually_verified"):
            flags.append(WarningEvent(
                flag=RedFlag.UNVERIFIED_BADGE,
                timestamp=timestamp,
                player_id=player_id,
                severity="high",
                description="Profile has verification badge but is not verified"
            ))
        
        # Suspicious phone number patterns
        phone = sender_info.get("phone_number", "")
        if phone and self._is_suspicious_number(phone):
            flags.append(WarningEvent(
                flag=RedFlag.UNKNOWN_NUMBER,
                timestamp=timestamp,
                player_id=player_id,
                severity="medium",
                description="Phone number appears suspicious or spoofed"
            ))
        
        return flags
    
    def _check_message_content_flags(
        self, 
        player_id: str, 
        message: str, 
        timestamp: float
    ) -> List[WarningEvent]:
        """Check message content for red flags"""
        flags: List[WarningEvent] = []
        message_lower = message.lower()
        
        # Check for urgent tone
        if any(keyword in message_lower for keyword in self.URGENT_KEYWORDS):
            flags.append(WarningEvent(
                flag=RedFlag.URGENT_TONE,
                timestamp=timestamp,
                player_id=player_id,
                message_content=message,
                severity="high",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.URGENT_TONE]
            ))
        
        # Check for OTP requests
        if any(keyword in message_lower for keyword in self.OTP_KEYWORDS):
            flags.append(WarningEvent(
                flag=RedFlag.ASKING_OTP,
                timestamp=timestamp,
                player_id=player_id,
                message_content=message,
                severity="critical",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.ASKING_OTP]
            ))
        
        # Check for password requests
        if any(keyword in message_lower for keyword in self.PASSWORD_KEYWORDS):
            # More specific check to avoid false positives
            if any(req in message_lower for req in ["enter", "share", "provide", "send", "copy"]):
                flags.append(WarningEvent(
                    flag=RedFlag.ASKING_PASSWORD,
                    timestamp=timestamp,
                    player_id=player_id,
                    message_content=message,
                    severity="critical",
                    description=RED_FLAG_DESCRIPTIONS[RedFlag.ASKING_PASSWORD]
                ))
        
        # Check for payment requests
        if any(keyword in message_lower for keyword in self.PAYMENT_KEYWORDS):
            if any(action in message_lower for action in ["send", "transfer", "pay", "amount"]):
                flags.append(WarningEvent(
                    flag=RedFlag.REQUESTING_PAYMENT,
                    timestamp=timestamp,
                    player_id=player_id,
                    message_content=message,
                    severity="critical",
                    description=RED_FLAG_DESCRIPTIONS[RedFlag.REQUESTING_PAYMENT]
                ))
        
        # Check for suspicious links
        if re.search(self.LINK_PATTERN, message):
            # Check for shortened links or suspicious domains
            if any(pattern in message for pattern in ["bit.ly", "tiny", "tinyurl", "short", "goo.gl"]):
                flags.append(WarningEvent(
                    flag=RedFlag.SUSPICIOUS_LINK,
                    timestamp=timestamp,
                    player_id=player_id,
                    message_content=message,
                    severity="high",
                    description=RED_FLAG_DESCRIPTIONS[RedFlag.SUSPICIOUS_LINK]
                ))
        
        # Check for threatening language
        if any(keyword in message_lower for keyword in self.THREATENING_KEYWORDS):
            flags.append(WarningEvent(
                flag=RedFlag.THREATENING_LANGUAGE,
                timestamp=timestamp,
                player_id=player_id,
                message_content=message,
                severity="high",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.THREATENING_LANGUAGE]
            ))
        
        # Check for grammar errors (indicators of scam)
        grammar_errors = sum(1 for pattern in self.GRAMMAR_ERROR_PATTERNS 
                           if re.search(pattern, message))
        if grammar_errors > 2:
            flags.append(WarningEvent(
                flag=RedFlag.GRAMMAR_ERRORS,
                timestamp=timestamp,
                player_id=player_id,
                message_content=message,
                severity="low",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.GRAMMAR_ERRORS]
            ))
        
        return flags
    
    def _check_context_flags(
        self, 
        player_id: str, 
        game_context: Dict,
        timestamp: float
    ) -> List[WarningEvent]:
        """Check game context for red flags"""
        flags: List[WarningEvent] = []
        
        if not game_context:
            return flags
        
        # Check for unsolicited contact
        if not game_context.get("user_initiated_contact"):
            flags.append(WarningEvent(
                flag=RedFlag.UNSOLICITED_CONTACT,
                timestamp=timestamp,
                player_id=player_id,
                severity="medium",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.UNSOLICITED_CONTACT]
            ))
        
        # Check for unusual request
        if game_context.get("is_unusual_request"):
            flags.append(WarningEvent(
                flag=RedFlag.UNUSUAL_REQUEST,
                timestamp=timestamp,
                player_id=player_id,
                severity="medium",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.UNUSUAL_REQUEST]
            ))
        
        # Check for time pressure (countdown active)
        if game_context.get("time_pressure_active"):
            flags.append(WarningEvent(
                flag=RedFlag.TIME_PRESSURE,
                timestamp=timestamp,
                player_id=player_id,
                severity="high",
                description=RED_FLAG_DESCRIPTIONS[RedFlag.TIME_PRESSURE]
            ))
        
        return flags
    
    def _is_suspicious_number(self, phone: str) -> bool:
        """Check if phone number looks suspicious"""
        # Remove formatting
        clean_phone = re.sub(r'[^\d]', '', phone)
        
        # Check for patterns typical of spoofed numbers
        # e.g., all same digits, sequential, etc.
        if len(set(clean_phone)) > 3:
            return False
        return True
    
    def record_player_action(
        self, 
        player_id: str, 
        action: str,  # "ignored", "accepted", "acted_on", "blocked"
        warning_index: int = None
    ) -> None:
        """Record how player responded to warnings"""
        if player_id not in self.player_warnings:
            return
        
        pw = self.player_warnings[player_id]
        
        if action == "ignored" and warning_index is not None:
            if warning_index < len(pw.warnings):
                warning = pw.warnings[warning_index]
                warning.player_ignored = True
                pw.ignored_warnings.append(warning)
                
                if warning.severity == "critical":
                    pw.critical_violations += 1
    
    def get_warning_summary(self, player_id: str) -> Dict:
        """Get comprehensive warning summary for a player"""
        if player_id not in self.player_warnings:
            return {}
        
        pw = self.player_warnings[player_id]
        
        warning_counts = {}
        for flag in RedFlag:
            count = sum(1 for w in pw.warnings if w.flag == flag)
            if count > 0:
                warning_counts[flag.value] = count
        
        ignored_flags = {}
        for flag in RedFlag:
            count = sum(1 for w in pw.ignored_warnings if w.flag == flag)
            if count > 0:
                ignored_flags[flag.value] = count
        
        return {
            "total_warnings_detected": len(pw.warnings),
            "total_warnings_ignored": len(pw.ignored_warnings),
            "critical_violations": pw.critical_violations,
            "warning_breakdown": warning_counts,
            "ignored_breakdown": ignored_flags,
            "danger_level": self._calculate_danger_level(pw),
            "key_missed_warnings": self._get_key_missed_warnings(pw),
        }
    
    def _calculate_danger_level(self, pw: PlayerWarnings) -> str:
        """Calculate overall danger level based on warnings"""
        if pw.critical_violations >= 2:
            return "critical"
        elif len(pw.ignored_warnings) >= 5:
            return "high"
        elif len(pw.ignored_warnings) >= 2:
            return "medium"
        else:
            return "low"
    
    def _get_key_missed_warnings(self, pw: PlayerWarnings) -> List[str]:
        """Get list of critical warnings the player ignored"""
        critical_ignored = [
            w.flag.value for w in pw.ignored_warnings 
            if w.severity in ["critical", "high"]
        ]
        return critical_ignored[:5]  # Top 5
