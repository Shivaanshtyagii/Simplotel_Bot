# Voice Bot - Complete Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Important Notes

### Browser Requirements

- **Chrome** (Recommended) - Full support for Web Speech API
- **Edge** - Full support for Web Speech API  
- **Safari** - Limited support
- **Firefox** - Not supported (Web Speech API not available)

### Microphone Permissions

1. When you first click the microphone button, your browser will ask for microphone permission
2. **Click "Allow"** to enable speech recognition
3. If you denied permission, you'll need to:
   - Chrome: Click the lock icon in the address bar → Site settings → Microphone → Allow
   - Edge: Click the lock icon → Permissions → Microphone → Allow

### Troubleshooting

#### "Network Error" in Speech Recognition

This usually means:
1. **No internet connection** - Web Speech API requires internet (it uses Google's servers)
2. **Firewall blocking** - Check if your firewall is blocking the connection
3. **Browser compatibility** - Make sure you're using Chrome or Edge

**Solution**: Ensure you have an active internet connection and try again.

#### "Microphone permission denied"

**Solution**: 
1. Check browser address bar for microphone icon
2. Click it and select "Always allow"
3. Refresh the page

#### Backend not responding

**Solution**:
1. Make sure backend is running on port 8000
2. Check terminal for any error messages
3. Verify `http://localhost:8000` is accessible in browser
4. Check CORS settings in `backend/main.py`

#### TTS (Text-to-Speech) not working

**Solution**:
1. Check browser console for errors
2. Make sure your system volume is not muted
3. Try refreshing the page
4. Some browsers require user interaction before TTS works

## Testing the Application

### Test Queries

1. **Balance Check**: "What's my balance?" or "Check my account balance"
2. **Pricing**: "What is your pricing?" or "How much does it cost?"
3. **Support**: "I need help" or "Contact support"
4. **Hours**: "What are your business hours?"
5. **Payment**: "What payment methods do you accept?"

### Expected Flow

1. Click microphone button → Status changes to "Listening..."
2. Speak your question clearly
3. Status changes to "Processing..." → Your question appears in chat
4. Bot response appears in chat → Bot speaks the response (TTS)
5. Status returns to "Idle"

## Features Verification

✅ **Speech-to-Text (STT)**: Click mic → Speak → Text appears in chat
✅ **Natural Language Understanding**: Bot categorizes your intent
✅ **Response Generation**: Bot generates appropriate response
✅ **Text-to-Speech (TTS)**: Bot speaks the response out loud
✅ **Database Integration**: Bot queries database for account info
✅ **Analytics**: Query count increments with each interaction

## Common Issues

### Issue: Recognition stops immediately

**Cause**: Microphone not detected or permission denied

**Fix**: 
- Check microphone is connected
- Allow microphone permission
- Try speaking louder

### Issue: No audio response

**Cause**: System volume muted or TTS not supported

**Fix**:
- Check system volume
- Check browser console for TTS errors
- Try a different browser

### Issue: Backend connection error

**Cause**: Backend not running or wrong port

**Fix**:
- Start backend: `uvicorn main:app --reload --port 8000`
- Check backend is accessible at `http://localhost:8000`
- Verify CORS settings allow frontend origin

## Development Notes

- Frontend runs on port 5173 (Vite default)
- Backend runs on port 8000
- Database is SQLite (`voicebot.db` in backend folder)
- All speech processing happens in browser (no external API keys needed)

