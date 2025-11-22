"""
Natural Language Understanding (NLU) Engine
Categorizes user intents based on keyword matching
"""

def detect_intent(text: str) -> str:
    """
    Detect user intent from text using keyword matching.
    
    Args:
        text: User's input text
        
    Returns:
        Intent string: 'check_balance', 'pricing_info', 'support_request', or 'fallback'
    """
    user_text = text.lower().strip()
    
    # Balance check intent - look for balance/money related keywords
    balance_keywords = ["balance", "money", "account balance", "how much do i have", 
                       "check balance", "my balance", "account", "funds", "available"]
    if any(keyword in user_text for keyword in balance_keywords):
        return "check_balance"
    
    # Pricing intent - look for price/cost related keywords
    pricing_keywords = ["price", "pricing", "cost", "how much", "plan", "subscription",
                       "fee", "charge", "rate", "pricing info", "what does it cost"]
    if any(keyword in user_text for keyword in pricing_keywords):
        return "pricing_info"
    
    # Support intent - look for help/support related keywords
    support_keywords = ["support", "help", "contact", "assistance", "customer service",
                       "talk to someone", "speak with", "get help", "need help",
                       "problem", "issue", "question"]
    if any(keyword in user_text for keyword in support_keywords):
        return "support_request"
    
    # Business hours intent
    hours_keywords = ["hours", "open", "when", "time", "available", "business hours",
                     "operating hours", "working hours"]
    if any(keyword in user_text for keyword in hours_keywords):
        return "get_hours"
    
    # Payment methods intent
    payment_keywords = ["payment", "pay", "method", "card", "credit", "debit",
                       "how to pay", "payment options"]
    if any(keyword in user_text for keyword in payment_keywords):
        return "get_payment_methods"
    
    # Default: fallback for unrecognized intents
    return "fallback"


def get_intent_confidence(text: str, intent: str) -> float:
    """
    Calculate confidence score for detected intent (0.0 to 1.0).
    Simple implementation based on keyword matches.
    """
    user_text = text.lower()
    
    intent_keywords = {
        "check_balance": ["balance", "money", "account", "funds"],
        "pricing_info": ["price", "cost", "pricing", "plan"],
        "support_request": ["support", "help", "contact", "assistance"],
        "get_hours": ["hours", "open", "time", "available"],
        "get_payment_methods": ["payment", "pay", "method", "card"]
    }
    
    if intent == "fallback":
        return 0.0
    
    keywords = intent_keywords.get(intent, [])
    matches = sum(1 for keyword in keywords if keyword in user_text)
    
    if matches == 0:
        return 0.0
    
    # Simple confidence: more matches = higher confidence
    return min(1.0, matches / len(keywords) * 2)

