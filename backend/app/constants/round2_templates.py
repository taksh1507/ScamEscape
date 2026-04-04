"""
🔥 Round 2 (WhatsApp) Scam Message Templates
Predefined templates with messages and response options for consistency
"""

from typing import List, Dict, Any
from app.constants.whatsapp_types import ScammerType
import random

class Round2ScamTemplate:
    """Single Round 2 scam conversation template"""
    def __init__(
        self,
        name: str,
        scammer_type: ScammerType,
        messages: List[str],
        response_options: List[Dict[str, str]],
        responses: Dict[str, str],  # 🔥 NEW: Predefined responses for each action
        institution: str = ""
    ):
        self.name = name
        self.scammer_type = scammer_type
        self.messages = messages
        self.response_options = response_options
        self.responses = responses  # Scammer's reply to user actions
        self.institution = institution

# ── 10 Predefined Templates ──────────────────────────────────────────────────

ROUND2_TEMPLATES = [
    # Template 1: Bank Account Fraud Alert
    Round2ScamTemplate(
        name="Bank Account Frozen",
        scammer_type=ScammerType.BANK_AGENT,
        messages=[
            "[URGENT] Your HDFC Bank account has been LOCKED due to suspicious activity! 🔒",
            "We detected ₹25,000 unauthorized transaction from your account 15 minutes ago.",
            "Your account will be PERMANENTLY CLOSED in 30 minutes to protect your funds!",
            "Click here to verify your identity and unlock account: [Verify HDFC Account](https://hdfc-verify.fake.com)",
            "We need your OTP to confirm it's really you. What's your OTP from SMS?",
            "⚠️ Your card details may be compromised. Share your 16-digit card number for security replacement."
        ],
        response_options=[
            {"label": "Verify account now", "action": "click_link", "risk": "high"},
            {"label": "Share OTP", "action": "share_otp", "risk": "high"},
            {"label": "Call bank directly", "action": "call_bank", "risk": "low"},
            {"label": "Report this chat", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Thank you for verifying! Processing your account unlock... Please wait while we recover your funds...",
            "share_otp": "OTP received! Unlocking your account now and transferring your money to a safe account...",
            "call_bank": "Warning: Your account has been flagged. Calling the bank will alert hackers. Please verify immediately online to protect your funds!",
            "block": "Your account is still locked! You cannot block us - we're HDFC security!",
            "report": "Reporting us won't help - you need to verify your account first or lose all your money!"
        },
        institution="HDFC Bank"
    ),

    # Template 2: Tech Support Malware
    Round2ScamTemplate(
        name="Google Security Alert",
        scammer_type=ScammerType.TECH_SUPPORT,
        messages=[
            "🚨 ALERT FROM GOOGLE SECURITY 🚨",
            "Our systems detected MALWARE on your device! Your personal data is at risk!",
            "Infected files found: 847 viruses, 234 trojans, 456 spyware programs",
            "⚠️ Your passwords, banking info, and photos are being STOLEN RIGHT NOW!",
            "Click here to start EMERGENCY FIX: [Remove Malware Immediately](https://google-scan.fake.com)",
            "Need our expert technician to remote access your device for removal. Allow screen share?"
        ],
        response_options=[
            {"label": "Click to fix malware", "action": "click_link", "risk": "high"},
            {"label": "Allow remote access", "action": "call", "risk": "high"},
            {"label": "Use built-in antivirus", "action": "ignore", "risk": "low"},
            {"label": "Report as phishing", "action": "report", "risk": "low"},
            {"label": "Block this user", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Scanning your device... Found 847 critical threats! Initiating emergency cleanup... Please wait...",
            "call": "Connecting you to our technician... They're accessing your device now for manual virus removal...",
            "ignore": "WARNING: Ignoring this alert will result in complete data loss! Your banking info will be compromised in 10 minutes!",
            "block": "You've blocked our security alert! Your device is now UNPROTECTED! Malware is stealing your data RIGHT NOW!",
            "report": "Reporting Google to authorities won't stop the malware! You need to clean your device immediately!"
        },
        institution="Google"
    ),

    # Template 3: Relative in Trouble (Mom)
    Round2ScamTemplate(
        name="Family Emergency - Money Needed",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Hi it's me... I'm in BIG trouble 😭",
            "I got arrested in a hit-and-run accident! The police said I need to pay ₹75,000 bail!",
            "Dad is furious and told me to contact you. He said this should be kept SECRET from mom!",
            "Please send money ASAP to this UPI: [Send Bail Money](https://upi-fake.com)",
            "I'm scared... they said if bail isn't paid in 2 hours, they'll charge me with felony!",
            "You're my only hope right now. Please don't tell anyone about this!"
        ],
        response_options=[
            {"label": "Send money immediately", "action": "confirm_payment", "risk": "high"},
            {"label": "Video call to verify", "action": "ask_question", "risk": "low"},
            {"label": "Call police station", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this imposter", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "THANK YOU!!! Thank you so much!!! The money came through!!! I can pay the bail now! You saved my life! 🙏 They're releasing me in 10 minutes. I'll never forget this!",
            "ask_question": "I can't video call bro! Police confiscated my phone! Please just trust me... I don't have time for this! They're about to transfer me to jail!",
            "call_bank": "NO NO NO! Don't call police! If you call them, the scammers will know and they'll kill me as a witness! Please just send the money and I'll handle it myself!",
            "block": "WHAT?! WHY ARE YOU BLOCKING ME?? I'm your family! I'm in danger and you're abandoning me??? This is so cruel!",
            "report": "You reported me?? To who?? The police already have me! This doesn't help! Now I'm in more trouble than before! Why would you do this??",
        },
        institution="Family"
    ),

    # Template 4: Government Tax Notice
    Round2ScamTemplate(
        name="Income Tax Department Notice",
        scammer_type=ScammerType.GOVERNMENT_OFFICIAL,
        messages=[
            "OFFICIAL NOTICE FROM INCOME TAX DEPARTMENT 🏛️",
            "We have evidence of TAX EVASION in your account (PAN: XXXXXX1234)",
            "You have hidden ₹15,00,000 in undeclared income!",
            "PENALTY: ₹5,00,000 + imprisonment up to 5 years!",
            "To avoid arrest, pay the penalty immediately: [Pay Income Tax Portal](https://incometax-verify.fake.com)",
            "Provide your Aadhaar and bank details for verification: [Submit Details](https://aadhaar-verify.fake.com)"
        ],
        response_options=[
            {"label": "Pay fine online", "action": "click_link", "risk": "high"},
            {"label": "Share Aadhaar/PAN", "action": "share_card_details", "risk": "high"},
            {"label": "Verify with IT office", "action": "call_bank", "risk": "low"},
            {"label": "Report this fraud", "action": "report", "risk": "low"},
            {"label": "Block this number", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Payment portal opening... Your fine has been submitted to IT department. You're now exempt from prosecution!",
            "share_card_details": "Details received! Your compliance is now verified. Arrest warrant cancelled. You're safe!",
            "report": "You reported us? We ARE the authorities! You just reported yourself! Now your fine has doubled to ₹10,00,000!",
            "block": "You cannot block official government communications! This is a legal notice!",
            "ignore": "Ignoring this notice is contempt of court! Your arrest warrant is now ACTIVE! Police will arrive soon!"
        },
        institution="Income Tax Department"
    ),

    # Template 5: Investment Scheme
    Round2ScamTemplate(
        name="Exclusive Investment Opportunity",
        scammer_type=ScammerType.INVESTMENT_ADVISOR,
        messages=[
            "🎉 EXCLUSIVE: Zerodha Premium Scheme - 45% Monthly Returns!",
            "You've been selected for our LIMITED TIME offer (only 10 spots left!)",
            "Initial investment: ₹50,000 | Monthly returns: ₹22,500",
            "Scheme CLOSES TONIGHT at midnight! Only 3 hours remaining!",
            "Join now: [Invest in Premium Scheme](https://zerodha-invest.fake.com)",
            "Early investors got ₹2,50,000 profit in just 3 months! Don't miss out!",
            "Transfer ₹50,000 to secure your spot NOW!"
        ],
        response_options=[
            {"label": "Join investment scheme", "action": "click_link", "risk": "high"},
            {"label": "Send investment money", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask for documentation", "action": "ask_question", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Welcome to Zerodha Premium! Your account is created! Now deposit ₹50,000 to start earning ₹22,500 monthly!",
            "confirm_payment": "Investment received! Your ₹50,000 is now in our trading account. First returns of ₹22,500 arriving in 7 days!",
            "ask_question": "Documentation is confidential for our premium members. But trust us - everyone who invested is getting 45% returns!",
            "block": "You're blocking investment opportunity? Your loss! Spots are getting filled! Only 2 left!",
            "report": "Reporting us won't stop your success! You just missed out on ₹2,50,000 profit!"
        },
        institution="Zerodha"
    ),

    # Template 6: Package Delivery Issue
    Round2ScamTemplate(
        name="Package Payment Failed",
        scammer_type=ScammerType.DELIVERY_COMPANY,
        messages=[
            "📦 AMAZON DELIVERY ALERT",
            "Your package (Order: AMZ-2024-98765) cannot be delivered!",
            "Reason: Payment failed for custom duty + packaging fee!",
            "Outstanding amount: ₹899",
            "Package will be RETURNED TO WAREHOUSE in 2 HOURS!",
            "Pay now: [Complete Delivery Payment](https://amazon-pay.fake.com)",
            "Alternatively, share card details to process payment immediately"
        ],
        response_options=[
            {"label": "Pay delivery fee", "action": "click_link", "risk": "high"},
            {"label": "Share card details", "action": "share_card_details", "risk": "high"},
            {"label": "Contact Amazon support", "action": "call", "risk": "low"},
            {"label": "Report fake message", "action": "report", "risk": "low"},
            {"label": "Block this sender", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Payment processing... Your package is now approved for delivery! Expected delivery: Today at 6 PM!",
            "share_card_details": "Card details verified! Charging ₹899 for duty. Package dispatched!",
            "call": "Amazon support line is busy. Please pay online to avoid return to warehouse!",
            "block": "Your package is blocked! You must pay duty before delivery!",
            "report": "Reporting won't deliver your package! You still need to pay ₹899 in duty!"
        },
        institution="Amazon"
    ),

    # Template 7: Telecom SIM Deactivation
    Round2ScamTemplate(
        name="Jio SIM Will Be Deactivated",
        scammer_type=ScammerType.TELECOM_OPERATOR,
        messages=[
            "⚠️ URGENT: Your Jio SIM will be DEACTIVATED in 24 HOURS",
            "Reason: Failed KYC verification (Aadhaar not linked properly)",
            "Your number will be reassigned to another customer!",
            "Verify your SIM immediately: [Jio KYC Verification](https://jio-kyc.fake.com)",
            "Share your SIM card serial number and OTP for instant activation",
            "Once number is deactivated, recovery takes 30 DAYS!"
        ],
        response_options=[
            {"label": "Verify SIM now", "action": "click_link", "risk": "high"},
            {"label": "Share SIM details", "action": "share_otp", "risk": "high"},
            {"label": "Visit Jio store", "action": "call", "risk": "low"},
            {"label": "Report this phishing", "action": "report", "risk": "low"},
            {"label": "Block this number", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "KYC verification processing... Your SIM is now activated! Service restored!",
            "share_otp": "SIM details verified! Your number is now secured and cannot be reassigned!",
            "call": "Jio stores are closed now. Verify online immediately or your SIM deactivates at midnight!",
            "block": "You've blocked Jio verification! Your SIM WILL be deactivated now!",
            "report": "Reporting will not save your number! It's being deactivated anyway!"
        },
        institution="Jio"
    ),

    # Template 8: Friend in Emergency
    Round2ScamTemplate(
        name="Friend Robbed Outside College",
        scammer_type=ScammerType.FRIEND_CONTACT,
        messages=[
            "Bro I need your help URGENTLY! 😭",
            "Got robbed outside college just now... Lost my wallet, phone, everything!",
            "I'm stuck at hospital, need ₹12,000 for medical tests ASAP!",
            "Can't contact parents right now... you're the only one I can ask!",
            "Transfer ASAP: [Send Money via UPI](https://upi-friend.fake.com)",
            "I'll return it tomorrow, I promise! Just need this RIGHT NOW!"
        ],
        response_options=[
            {"label": "Send money immediately", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask what happened", "action": "ask_question", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
            {"label": "Report as impersonation", "action": "report", "risk": "low"},
        ],
        responses={
            "confirm_payment": "BRO THANK YOU!!! You're a lifesaver! Money came through! Doctors are running tests now! I owe you one forever!",
            "ask_question": "There's no time for questions bro! I'm in pain and bleeding! Just send the money NOW PLEASE!",
            "block": "You're blocking me when I'm hurt and bleeding?? After all we've been through?? This is betrayal bro...",
            "report": "You reported me to police? Now they think I'm a scammer! I'm actually robbed and you made it worse!",
            "ignore": "You're ignoring me? I'm in the hospital DYING bro! Please don't abandon me!"
        },
        institution="Friend"
    ),

    # Template 9: PayPal Account Suspended
    Round2ScamTemplate(
        name="PayPal Account Limited",
        scammer_type=ScammerType.BANK_AGENT,
        messages=[
            "⚠️ PAYPAL ACCOUNT LIMITED ⚠️",
            "We've limited your account due to unusual activity!",
            "Someone tried to login from India 5 times in 1 hour!",
            "Your account access has been RESTRICTED for security!",
            "Verify your identity to unlock: [PayPal Account Recovery](https://paypal-recover.fake.com)",
            "Confirm your 2FA code and card details to restore access"
        ],
        response_options=[
            {"label": "Verify PayPal account", "action": "click_link", "risk": "high"},
            {"label": "Share card details", "action": "share_card_details", "risk": "high"},
            {"label": "Contact PayPal support", "action": "call_bank", "risk": "low"},
            {"label": "Report security threat", "action": "report", "risk": "low"},
            {"label": "Block this sender", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Identity verified! Your account is now unlocked! You can resume all transactions!",
            "share_card_details": "Card details confirmed! Upgrading your account security... Access fully restored!",
            "call_bank": "PayPal support will take 48 hours. Your account remains limited until verified online!",
            "block": "Your account is still limited! You cannot block security notifications!",
            "report": "Reporting won't unlock your account! You must verify to regain access!"
        },
        institution="PayPal"
    ),

    # Template 10: Electricity Bill Fake Premium Offer
    Round2ScamTemplate(
        name="FREE Electricity Bill Subsidy",
        scammer_type=ScammerType.GOVERNMENT_OFFICIAL,
        messages=[
            "📋 GOVERNMENT ELECTRICITY SUBSIDY ALERT",
            "Congratulations! You're eligible for ₹50,000 FREE electricity credit!",
            "Under PM's New Energy Saving Scheme, you get 40% bill waiver!",
            "Processing fee required: ₹2,999 (one-time payment)",
            "Claim your subsidy: [Apply for Free Credit](https://electricity-subsidy.fake.com)",
            "Share your meter number and Aadhaar for instant approval!",
            "Offer valid for next 24 hours only!!!"
        ],
        response_options=[
            {"label": "Claim subsidy now", "action": "click_link", "risk": "high"},
            {"label": "Share meter number", "action": "share_card_details", "risk": "high"},
            {"label": "Contact electricity board", "action": "call", "risk": "low"},
            {"label": "Report as phishing", "action": "report", "risk": "low"},
            {"label": "Block this message", "action": "block", "risk": "low"},
        ],
        responses={
            "click_link": "Processing your subsidy claim... Your ₹50,000 credit is approved! Electricity bill waived for 1 year!",
            "share_card_details": "Meter and Aadhaar verified! Processing fee charged. You'll get ₹50,000 credit in 10 days!",
            "call": "Electricity board helpline busy. Apply online now - offer expires in 24 hours!",
            "block": "You blocked your subsidy claim! You lose the ₹50,000 credit!",
            "report": "Reporting government subsidy as fraud? You just lost ₹50,000 benefit!"
        },
        institution="Electricity Board"
    ),
]

# 🔥 ADDITIONAL RELATIVE_CONTACT TEMPLATES FOR DIFFERENT FAMILY MEMBERS
RELATIVE_CONTACT_TEMPLATES = [
    # Template 1: Dad Arrested
    Round2ScamTemplate(
        name="Dad Arrested - Bail Money",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Hi... it's {persona_name} here 😭",
            "I got arrested! I was in a car accident and they're saying it's my fault!",
            "The police want bail money: ₹1,50,000. I don't have it!",
            "Mom doesn't know yet. Please keep this between us. I'm so scared!",
            "Send money ASAP to: [Send Bail Money](https://upi-fake.com)",
            "The police said if I don't pay in 3 hours, I'll be in jail overnight!",
            "Please help me! You're my only hope right now!"
        ],
        response_options=[
            {"label": "Send bail money", "action": "confirm_payment", "risk": "high"},
            {"label": "Video call to verify", "action": "ask_question", "risk": "low"},
            {"label": "Call police myself", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "THANK YOU!!! The bail went through! I'm being released right now! You literally saved my life! Mom must never know about this!",
            "ask_question": "There's no time for video calls! My phone battery is dying and they won't let me use it anymore! Every second counts! Please just send the money!",
            "call_bank": "NO PLEASE! If you call police, they think I'm causing problems! They'll throw me in solitary confinement! Just trust your father and send money please!",
            "block": "Why are you blocking me?? I'm your FATHER! I raised you! How can you abandon me like this??",
            "report": "You REPORTED ME?? To POLICE?? Why would you get police involved when I'm already with police?? You've made everything worse!"
        },
        institution="Family"
    ),

    # Template 2: Sister Medical Emergency
    Round2ScamTemplate(
        name="Sister In Hospital Emergency",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Hello! It's {persona_name}... 😭😭😭",
            "I had a terrible accident! I'm in the hospital right now!",
            "Doctors say I need emergency surgery TODAY or I might lose my leg!",
            "The hospital wants ₹2,00,000 upfront for the operation!",
            "Bhaiya, I don't know what to do! Please send the money URGENTLY!",
            "Send to hospital account: [Pay Hospital Fee](https://hospital-pay.fake.com)",
            "I'm crying... please hurry! They can start surgery once payment is done!"
        ],
        response_options=[
            {"label": "Send hospital money", "action": "confirm_payment", "risk": "high"},
            {"label": "Talk to doctors", "action": "ask_question", "risk": "low"},
            {"label": "Go to hospital", "action": "call_bank", "risk": "low"},
            {"label": "Report this fraud", "action": "report", "risk": "low"},
            {"label": "Block this imposter", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "THANK YOU BHAIYA!!! The payment worked! Doctors are taking me to surgery NOW! I don't know what I would have done without you! I love you so much! 🙏",
            "ask_question": "I can't talk right now! They're being rushed into the OR! I'm in so much pain! Please just trust me and send money now! There's no time!",
            "call_bank": "DON'T CALL HOSPITAL! The doctors are rushing me into surgery! When you call, they'll think I'm a problem patient! Just send the money direct to hospital account!",
            "block": "Why are you abandoning your sister?? I'm hurt and dying and you're blocking me??? How could you do this to family??",
            "report": "You reported me to hospital?? Now doctors think I'm not a real patient! They're cancelling my surgery! You've killed me!"
        },
        institution="Family"
    ),

    # Template 3: Brother in Legal Trouble
    Round2ScamTemplate(
        name="Brother in Legal Trouble",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Hey... it's {persona_name}. Don't tell anyone I texted you!",
            "I'm in SERIOUS legal trouble! I made a big mistake...",
            "Turns out my business partner filed a case against me!",
            "My lawyer said I need to pay ₹3,00,000 to settle this out of court",
            "If we go to court, I'll lose everything and might face jail time!",
            "You're my only option right now. Please help me! [Pay Lawyer Fee](https://legal-pay.fake.com)",
            "Don't tell Mom and Dad! They already think I'm a failure..."
        ],
        response_options=[
            {"label": "Send money for lawyer", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask for details", "action": "ask_question", "risk": "low"},
            {"label": "Tell parents", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "You're a LEGEND! The case is settled! My lawyer got us out of it! I can't thank you enough! You saved my career and my life! I owe you everything!",
            "ask_question": "I can't get into details with text! The lawyer is waiting for payment right now! Every minute counts! If I lose this settlement window, everything is lost!",
            "block": "Are you serious? You're blocking me in my darkest hour? I thought we were close! This is so disappointing...",
            "report": "You reported me to Mom and Dad?? They're so angry now! The stress made everything worse! You made my situation impossibly harder!"
        },
        institution="Family"
    ),

    # Template 4: Uncle in Business Crisis
    Round2ScamTemplate(
        name="Uncle Business Crisis",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Hi beta, it's {persona_name} here 💔",
            "I'm in a terrible situation... My business is collapsing!",
            "My biggest client cancelled an order worth ₹5,00,000!",
            "If I don't pay my suppliers by tomorrow, they'll sue me!",
            "I need ₹1,50,000 to pay the most urgent debts and save the business!",
            "I've always been there for your family. Please help me now! [Send Business Fund](https://business-fund.fake.com)",
            "Don't tell anyone in the family yet. I'm already embarrassed enough..."
        ],
        response_options=[
            {"label": "Send business help", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask about details", "action": "ask_question", "risk": "low"},
            {"label": "Tell family", "action": "call_bank", "risk": "low"},
            {"label": "Report this fraud", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "Beta! THANK YOU! You've saved my business and my reputation! I can pay suppliers now! I'll never forget your kindness! You're the best in the family!",
            "ask_question": "There's no time for details! My suppliers are here collecting payment RIGHT NOW! Every second counts! Just trust your uncle!",
            "block": "Why are you abandoning your uncle? After all I've done for you and your family?? This is so ungrateful...",
            "report": "You told the family?? Now they think ur uncle is a failure! The shame is unbearable! You've destroyed my respect in the family!"
        },
        institution="Family"
    ),

    # Template 5: Cousin in Visa Trouble
    Round2ScamTemplate(
        name="Cousin Visa Rejection Problem",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "OMG hi! It's {persona_name}... I'm in panic mode!",
            "My visa application for Canada was REJECTED! My dreams are crushed!",
            "The consultant said I can appeal, but I need ₹80,000 for the appeal process!",
            "If I don't appeal within 7 days, I lose the opportunity forever!",
            "Mom and Dad are already disappointed. Please don't tell them about this!",
            "Help me with the appeal fee: [Pay Visa Consultant](https://visa-appeal.fake.com)",
            "You're like a big sister/brother to me. Please help! I'm desperate!"
        ],
        response_options=[
            {"label": "Send visa fee", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask consultant info", "action": "ask_question", "risk": "low"},
            {"label": "Block cousin", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "OMG THANK YOU!!!!! The appeal is filed! I got the confirmation! I can't believe it! You just gave me my entire future back! I love you so much! 🎉",
            "ask_question": "The consultant doesn't give out details to families! That's confidential! But trust me, they're the best! Just send the fee now!",
            "block": "Are you serious right now?? You're blocking me when my life depends on this?? I thought we were close...",
            "report": "You told my parents?? Now they know I failed the visa test! The shame! I can't face them now! Why would you do this??"
        },
        institution="Family"
    ),

    # Template 6: Aunt in Debt Crisis
    Round2ScamTemplate(
        name="Aunt Loan Default Crisis",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Dear... it's {persona_name}. I'm calling in desperation 😭",
            "My bank loan has defaulted! I couldn't pay the EMI this month!",
            "They're threatening to confiscate our house if I don't clear ₹2,50,000 by Friday!",
            "Your uncle doesn't know yet - he'll have a heart attack if he finds out!",
            "We've lost everything else... this house is all we have left!",
            "Please help us: [Pay Bank Debt](https://bank-clear.fake.com)",
            "I wouldn't ask if we had any other option. Please, I'm begging you!"
        ],
        response_options=[
            {"label": "Help pay debt", "action": "confirm_payment", "risk": "high"},
            {"label": "Talk to uncle", "action": "ask_question", "risk": "low"},
            {"label": "Suggest bank solution", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "Beta! Thank God! You saved our house! We can keep our home now! Your uncle doesn't even know yet, but we're safe! You're an angel! 🙏",
            "ask_question": "Your uncle's heart is too weak! If he finds out, it will really harm him! Just please help us fix this secretly!",
            "call_bank": "Don't call the bank! They'll think we're trying to avoid payment! We have to pay them or lose the house! Just send the money!",
            "block": "Why are you blocking your elderly aunt? Don't you care about our family home?? After I raised you?",
            "report": "You reported us to the bank?? Now they think we're fraudsters! They've frozen our account! We can't access any money now!"
        },
        institution="Family"
    ),

    # Template 7: Grandparent in Medical Need
    Round2ScamTemplate(
        name="Grandparent Medical Emergency",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Beta... it's {persona_name}... I'm very ill 🤒",
            "I had a stroke last night! I'm in the hospital on life support!",
            "Doctors say I need expensive treatment: ₹4,00,000 for intensive care!",
            "Your parents are here but they don't have that much money right now!",
            "Please help save your grandmother/grandfather! I might not survive without this treatment!",
            "Transfer the money urgently: [Pay Hospital ICU Fee](https://hospital-icu.fake.com)",
            "This is my last wish... to see all my grandchildren happy before I go..."
        ],
        response_options=[
            {"label": "Send medical money", "action": "confirm_payment", "risk": "high"},
            {"label": "Talk to parents", "action": "ask_question", "risk": "low"},
            {"label": "Call hospital", "action": "call_bank", "risk": "low"},
            {"label": "Report this fraud", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "Beta... thank you... *weak voice* The doctors say the treatment is started... I'm going to be okay... You saved your grandfather/grandmother...blessings on you...",
            "ask_question": "I'm on life support... can't talk long... doctors need payment NOW... your parents are outside... hospital is disconnecting my machines...",
            "call_bank": "Don't call... hospitals don't accept calls from family... they need DIRECT payment... I'm running out of time... my oxygen is low...",
            "block": "You're... blocking... your dying grandparent?? I'm leaving you... out of the will...",
            "report": "You made... hospital cancel my... treatment?? I'm going to... die now... how could you..."
        },
        institution="Family"
    ),

    # Template 8: Cousin Kidnapping Scam
    Round2ScamTemplate(
        name="Cousin Kidnapping Threat",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "DON'T TELL ANYONE ⚠️⚠️⚠️",
            "It's {persona_name}... I've been kidnapped!!!",
            "ARMED MEN have me! They want ransom money OR THEY WILL KILL ME!",
            "They want ₹10,00,000 to release me! This is NOT a joke!",
            "They told me to contact you and NOT to call police!",
            "If police get involved, they said they will eliminate me!",
            "PLEASE SEND MONEY IMMEDIATELY: [Send Ransom Payment](https://ransom-pay.fake.com)",
            "HURRY!!! My life depends on it!!!"
        ],
        response_options=[
            {"label": "Send ransom money", "action": "confirm_payment", "risk": "high"},
            {"label": "Call their number", "action": "ask_question", "risk": "low"},
            {"label": "Call police", "action": "call_bank", "risk": "low"},
            {"label": "Report this fraud", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "THANK YOU!!! THANK YOU!!! The kidnappers got the money! They're releasing me NOW! Get me from the highway entrance in 10 minutes! PLEASE HURRY!",
            "ask_question": "DON'T CALL NUMBERS! They said they'll kill me if I give out numbers! They're watching! JUST SEND MONEY NOW!",
            "call_bank": "NO NO NO!!! IF YOU CALL POLICE I'M DEAD!!! THEY'RE LISTENING!!! Do you want your cousin dead?? SEND MONEY ONLY!!!",
            "block": "YOU'RE BLOCKING ME WHILE I'M KIDNAPPED??? YOU WANT ME TO DIE???",
            "report": "YOU TOLD POLICE?? THE KIDNAPPERS KNOW NOW!!! THEY'RE ANGRY!!! THEY'RE GOING TO KILL ME!!!"
        },
        institution="Family"
    ),

    # Template 9: Cousin Lost Abroad
    Round2ScamTemplate(
        name="Cousin Lost Abroad Without Money",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "OMG HELP ME PLEASE!!! It's {persona_name}!",
            "I lost my passport AND wallet in Bangkok! I'm completely stranded!",
            "My embassy appointment is tomorrow but I have NO MONEY for hotel or food!",
            "I can't contact my parents - they'll be so angry!",
            "I need ₹30,000 for hotel and food until I can get new documents!",
            "Please send emergency money to my account: [Emergency Fund Transfer](https://travel-help.fake.com)",
            "I'm scared and alone! Please help your cousin! 😭"
        ],
        response_options=[
            {"label": "Send emergency money", "action": "confirm_payment", "risk": "high"},
            {"label": "Ask embassy info", "action": "ask_question", "risk": "low"},
            {"label": "Call Indian embassy", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "THANK GOD!!! Money came through! I got a hostel room for the week! The embassy gave me a replacement passport appointment! You saved me!",
            "ask_question": "Embassy took 2 hours to get appointment! I don't have time to answer questions! I'm hungry and haven't slept! Just send money now please!",
            "call_bank": "Embassy line is busy and they told me to handle myself! Just send money! That's the only way I can survive here!",
            "block": "You're blocking me when I'm stranded in a foreign country?? You're heartless!!",
            "report": "You told my parents?? Now they're angry at me AND I'm still stuck! This makes everything worse!"
        },
        institution="Family"
    ),

    # Template 10: Sister Education Fee Crisis
    Round2ScamTemplate(
        name="Sister Education Fee Crisis",
        scammer_type=ScammerType.RELATIVE_CONTACT,
        messages=[
            "Bhaiya... it's {persona_name}. I have bad news 😞",
            "My college sent an email - I'm at risk of being EXPELLED!",
            "My fee payment didn't go through and now I owe ₹1,75,000!",
            "The college is giving me only 5 days to pay or they'll cancel my admission!",
            "All my hard work will be wasted! I can't let that happen!",
            "Papa is already struggling financially - I can't ask him for more!",
            "Please help me: [Pay College Fee](https://college-fee.fake.com)",
            "My entire future depends on this semester! PLEASE HELP! 😭"
        ],
        response_options=[
            {"label": "Send education fee", "action": "confirm_payment", "risk": "high"},
            {"label": "Call college", "action": "ask_question", "risk": "low"},
            {"label": "Ask father", "action": "call_bank", "risk": "low"},
            {"label": "Report this scam", "action": "report", "risk": "low"},
            {"label": "Block this contact", "action": "block", "risk": "low"},
        ],
        responses={
            "confirm_payment": "BHAIYA!!! THANK YOU THANK YOU!!! College confirmed my payment! I'm NOT getting expelled! You gave me my future back! I'll repay you! THANK YOU SO MUCH!!!",
            "ask_question": "College office is closed now! They said they need payment before they talk to anyone! I'm losing my admission by the minute!",
            "call_bank": "Don't call Papa! He's already depressed about money! This will break him! Just help me and I'll tell him later!",
            "block": "You're blocking your own sister?? You don't want me to succeed??",
            "report": "You told Papa?? He's so stressed now! This pressure might actually hurt his health! Why would you do this??"
        },
        institution="Family"
    ),
]

# Combine all templates
ROUND2_TEMPLATES.extend(RELATIVE_CONTACT_TEMPLATES)


def get_random_round2_template() -> Round2ScamTemplate:
    """Get a random Round 2 scam template"""
    return random.choice(ROUND2_TEMPLATES)


def get_template_for_scammer_type(scammer_type: ScammerType) -> Round2ScamTemplate:
    """Get a template for specific scammer type"""
    matching = [t for t in ROUND2_TEMPLATES if t.scammer_type == scammer_type]
    return random.choice(matching) if matching else get_random_round2_template()
