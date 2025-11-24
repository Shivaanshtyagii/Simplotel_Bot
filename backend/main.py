from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import init_db, get_db, FAQ, UserAccount
from nlu import detect_intent, get_intent_confidence
import re

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(title="Voice Bot API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Database (can be replaced with actual database queries)
mock_db = {
    "user_balance": 5200.50,
    "pricing": "Our Pro plan is $29/month. Premium plan is $79/month. Enterprise plan is $199/month.",
    "support_email": "help@voicebot.com",
    "support_phone": "1-800-123-4567",
    "business_hours": "Monday to Friday, 9 AM to 6 PM EST",
    "payment_methods": "We accept all major credit cards, PayPal, and bank transfers."
}

# Request/Response Models
class QueryRequest(BaseModel):
    text: str


class QueryResponse(BaseModel):
    response_text: str
    intent: str


@app.get("/")
def root():
    return {"message": "Voice Bot API is running", "version": "1.0.0"}


@app.post("/api/process-query")
async def process_query(request: QueryRequest, db: Session = Depends(get_db)):
    """
    Process user query using NLU engine and return appropriate response.
    """
    user_text = request.text.strip()
    
    if not user_text:
        raise HTTPException(status_code=400, detail="Query text cannot be empty")
    
    # Use NLU engine to detect intent
    intent = detect_intent(user_text)
    confidence = get_intent_confidence(user_text, intent)
    
    response_text = ""
    
    # Simple NLU Logic with Database Simulation
    if intent == "check_balance":
        # Query database for balance (using mock_db or actual DB)
        # Try to extract username from query, otherwise use default
        username_match = re.search(r"(?:account|user|username)\s+(\w+)", user_text.lower())
        
        if username_match:
            # Query actual database
            try:
                username = username_match.group(1)
                account = db.query(UserAccount).filter(UserAccount.username == username).first()
                if account:
                    response_text = f"Your current balance for account {account.account_number} is ${account.balance:.2f}."
                else:
                    response_text = f"Your current balance is ${mock_db['user_balance']:.2f}."
            except Exception as e:
                print(f"Database query error: {e}")
                response_text = f"Your current balance is ${mock_db['user_balance']:.2f}."
        else:
            # Use mock database or default account
            try:
                account = db.query(UserAccount).filter(UserAccount.username == "demo_user").first()
                if account:
                    response_text = f"Your current balance is ${account.balance:.2f}."
                else:
                    response_text = f"Your current balance is ${mock_db['user_balance']:.2f}."
            except Exception as e:
                print(f"Database query error: {e}")
                response_text = f"Your current balance is ${mock_db['user_balance']:.2f}."
    
    elif intent == "pricing_info":
        response_text = mock_db['pricing']
    
    elif intent == "support_request":
        response_text = f"You can contact us at {mock_db['support_email']} or call {mock_db['support_phone']}. Our support hours are {mock_db['business_hours']}."
    
    elif intent == "get_hours":
        response_text = f"Our business hours are {mock_db['business_hours']}."
    
    elif intent == "get_payment_methods":
        response_text = mock_db['payment_methods']
    
    else:
        # Fallback: Try to match FAQs from database
        try:
            faqs = db.query(FAQ).all()
            best_match = None
            max_matches = 0
            
            for faq in faqs:
                keywords = [kw.strip().lower() for kw in faq.keywords.split(",")]
                matches = sum(1 for kw in keywords if kw in user_text.lower())
                if matches > max_matches:
                    max_matches = matches
                    best_match = faq
            
            if best_match and max_matches > 0:
                response_text = best_match.answer
                intent = "faq_match"
            else:
                response_text = "I didn't understand that. You can ask about balance, pricing, or support. How can I help you?"
        except Exception as e:
            print(f"FAQ query error: {e}")
            response_text = "I didn't understand that. You can ask about balance, pricing, or support. How can I help you?"
    
    return {
        "response_text": response_text,
        "intent": intent
    }


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get basic statistics"""
    faq_count = db.query(FAQ).count()
    user_count = db.query(UserAccount).count()
    return {
        "total_faqs": faq_count,
        "total_users": user_count
    }
