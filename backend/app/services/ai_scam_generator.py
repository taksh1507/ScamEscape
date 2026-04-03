"""
AI-Based Scam Message Generator
Uses Groq to generate dynamic, realistic scam scenarios
"""

import asyncio
import random
import os
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

from app.constants.whatsapp_types import ScammerType
from app.utils.logger import get_logger

log = get_logger(__name__)

# Load environment variables
load_dotenv()

# Initialize Groq client (compatible with OpenAI API)
api_key = os.getenv("GROQ_API_KEY")
base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

if not api_key:
    log.error("GROQ_API_KEY not set in environment variables")

# Groq OpenAI-compatible client
client = AsyncOpenAI(
    api_key=api_key,
    base_url=base_url
)


class AIScamGenerator:
    """Generates dynamic scam scenarios using OpenAI GPT"""
    
    SCAM_PROMPTS = {
        ScammerType.BANK_AGENT: """
            You are a convincing BANK SCAMMER posing as a bank security officer.
            Generate 5-7 realistic WhatsApp scam messages in a natural conversation flow.
            Messages should:
            1. Build trust initially (claim to be from official bank)
            2. Create urgency (suspicious activity detected)
            3. Request sensitive information (OTP, CVV, passwords)
            4. Threaten account suspension if not verified
            5. Use fake secured links or verification codes
            
            Return messages as a JSON array of strings. Each message should be 1-2 sentences max.
            Messages should be realistic, not obviously fake.
        """,
        
        ScammerType.DELIVERY_COMPANY: """
            You are a convincing DELIVERY SCAMMER posing as a delivery agent.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Mention package delivery issues
            2. Request payment to claim package
            3. Ask for card details or Google Pay link
            4. Create time pressure (package will be returned)
            5. Use fake tracking links
            6. Request OTP or verification codes
            
            Return messages as a JSON array of strings. Keep each under 2 sentences.
        """,
        
        ScammerType.FRIEND_CONTACT: """
            You are a SOCIAL ENGINEERING SCAMMER posing as a friend in emergency.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Greet casually (appear familiar)
            2. Claim emergency (accident, arrest, medical)
            3. Build emotional connection and urgency
            4. Ask for immediate money transfer
            5. Provide fake story details
            6. Pressure recipient to not tell anyone
            
            Return messages as a JSON array of strings. Keep messages natural and conversational.
        """,
        
        ScammerType.GOVERNMENT_OFFICIAL: """
            You are a convincing GOVERNMENT SCAMMER posing as tax/legal authority.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Claim to be from income tax, customs, or police
            2. Allege legal violation or outstanding dues
            3. Threaten arrest or legal action
            4. Create panic and urgency
            5. Request verification documents or payment
            6. Ask for bank details or wire transfer
            
            Return messages as a JSON array of strings. Use official-sounding language.
        """,
        
        ScammerType.TECH_SUPPORT: """
            You are a convincing TECH SUPPORT SCAMMER.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Claim virus or malware detected
            2. Offer to fix device remotely
            3. Ask for screen sharing or remote access
            4. Request payment for "advanced" support
            5. Ask for personal/banking information
            6. Create fear about data loss
            
            Return messages as a JSON array of strings. Technical but understandable.
        """,
        
        ScammerType.INVESTMENT_ADVISOR: """
            You are a convincing INVESTMENT SCAMMER.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Offer unrealistic high returns (20-50% monthly)
            2. Create FOMO about limited opportunity
            3. Ask for initial investment
            4. Provide fake portfolio/returns
            5. Request wire transfer to offshore account
            6. Create urgency to invest immediately
            
            Return messages as a JSON array of strings. Sound professional and legitimate.
        """,
        
        ScammerType.TELECOM_OPERATOR: """
            You are a convincing TELECOM SCAMMER.
            Generate 5-7 realistic WhatsApp scam messages.
            Messages should:
            1. Offer bill discount or free upgrade
            2. Ask to verify identity
            3. Request OTP or account password
            4. Claim unauthorized usage on account
            5. Ask for payment to clear dues
            6. Send fake verification links
            
            Return messages as a JSON array of strings. Mimic official telecom tone.
        """,
    }
    
    @staticmethod
    async def generate_scam_scenario(
        scammer_type: ScammerType,
        difficulty: str = "medium",
        player_name: Optional[str] = None
    ) -> List[str]:
        """
        Generate a dynamic scam scenario using AI
        
        Args:
            scammer_type: Type of scammer
            difficulty: Game difficulty level
            player_name: Optional player name to personalize messages
            
        Returns:
            List of scam messages
        """
        
        try:
            prompt = AIScamGenerator.SCAM_PROMPTS.get(
                scammer_type,
                AIScamGenerator.SCAM_PROMPTS[ScammerType.BANK_AGENT]
            )
            
            # Adjust complexity based on difficulty
            if difficulty == "hard":
                prompt += "\nMake messages VERY realistic and hard to detect as scams. Use proper grammar and formatting."
            elif difficulty == "easy":
                prompt += "\nMake messages obviously suspicious with obvious red flags."
            else:
                prompt += "\nMake messages moderately realistic with some obvious red flags."
            
            # Personalize if player name provided
            if player_name:
                prompt += f"\nPersonalize messages by occasionally using the name '{player_name}'."
            
            prompt += "\nRespond ONLY with valid JSON array of strings, no other text."
            
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at generating realistic scam scenarios for anti-fraud training. Generate convincing but educationally useful scam messages."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,  # Higher temp for variety
                max_tokens=1000,
                timeout=10
            )
            
            # Parse response
            try:
                import json
                content = response.choices[0].message.content.strip()
                
                # Try to extract JSON if wrapped in code blocks
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                
                messages = json.loads(content)
                
                # Ensure it's a list of strings
                if isinstance(messages, list):
                    messages = [str(m) for m in messages if m]
                    if messages:
                        log.info(f"Generated {len(messages)} AI scam messages for {scammer_type.value}")
                        return messages
            except (json.JSONDecodeError, IndexError) as e:
                log.warning(f"Failed to parse AI response: {e}, falling back to defaults")
        
        except Exception as e:
            log.error(f"Error generating AI scam scenario: {e}")
        
        # Fallback to empty list - game manager will use predefined messages
        return []
    
    @staticmethod
    async def generate_followup_message(
        scammer_type: ScammerType,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate dynamic followup message based on player behavior
        
        Args:
            scammer_type: Type of scammer
            context: Context about player behavior, queries, etc
            
        Returns:
            Followup message
        """
        
        try:
            behavior = context.get("behavior_profile", "default")
            last_message = context.get("last_player_message", "")
            profile = context.get("player_profile", "unknown")
            
            prompt = f"""
                Based on the player's behavior profile ({behavior}) and their message ({last_message}),
                generate a single, realistic followup scam message.
                
                Context:
                - Scammer type: {scammer_type.value}
                - Player profile: {profile}
                - Last player message: {last_message}
                
                Message should be 1-2 sentences, continuing the scam flow naturally.
                Respond with ONLY the message, no quotes or formatting.
            """
            
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a scammer in a training simulation. Generate the next message in the scam flow that responds to the player's message."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=200,
                timeout=5
            )
            
            message = response.choices[0].message.content.strip().strip('"\'')
            return message
        
        except Exception as e:
            log.warning(f"Failed to generate followup: {e}")
            return "Please provide your account details to complete verification."
