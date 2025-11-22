import { useState, useRef, useCallback, useEffect } from 'react'

const API_BASE_URL = 'http://localhost:8000'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState([])
  const [queryCount, setQueryCount] = useState(0)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Idle') // 'Idle', 'Listening...', 'Processing...'
  const [transcript, setTranscript] = useState('')

  const recognitionRef = useRef(null)
  const isRecognitionActiveRef = useRef(false)

  // Text-to-Speech function - Initialize once
  const speakText = useCallback((text) => {
    if (!text || !text.trim()) return
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      // Small delay to ensure cancellation is processed
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text.trim())
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 1.0
        utterance.lang = 'en-US'
        
        utterance.onstart = () => {
          console.log('TTS started:', text)
        }
        
        utterance.onend = () => {
          console.log('TTS ended')
        }
        
        utterance.onerror = (event) => {
          console.error('TTS error:', event.error)
        }
        
        window.speechSynthesis.speak(utterance)
      }, 100)
    } else {
      console.warn('Text-to-speech is not supported in this browser.')
    }
  }, [])

  // Handle query - send to backend and process response
  const handleQuery = useCallback(async (text) => {
    if (!text || !text.trim()) {
      console.log('Empty text, skipping query')
      return
    }

    console.log('Processing query:', text)
    setIsProcessing(true)
    setStatus('Processing...')
    setError('')

    // 1. Add user message to UI
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // 5. Increment query count
    setQueryCount(prev => prev + 1)

    try {
      // 2. Send to FastAPI backend
      const response = await fetch(`${API_BASE_URL}/api/process-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Backend response:', data)

      // 3. Add bot response to UI
      const botMessage = {
        id: Date.now() + 1,
        text: data.response_text,
        sender: 'bot',
        intent: data.intent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])

      setIsProcessing(false)
      setStatus('Idle')

      // 4. Trigger Text-to-Speech (TTS) - Wait a bit for UI to update
      setTimeout(() => {
        speakText(data.response_text)
      }, 300)

    } catch (err) {
      console.error('Error processing query:', err)
      setIsProcessing(false)
      setStatus('Idle')
      
      const errorMessage = {
        id: Date.now() + 1,
        text: `Sorry, I encountered an error: ${err.message}. Please make sure the backend server is running on port 8000.`,
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setError(err.message)
      
      setTimeout(() => {
        speakText("I'm sorry, I encountered an error. Please check if the backend server is running.")
      }, 300)
    }
  }, [speakText])

  // Create a fresh recognition instance each time
  const createRecognition = useCallback(() => {
    // Strict browser check
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setError("Browser not supported. Please use Chrome or Edge.")
      return null
    }

    // Create new recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true  // Show interim results
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('Recognition started')
      setIsListening(true)
      setStatus('Listening...')
      setError('')
      setTranscript('')
      isRecognitionActiveRef.current = true
    }

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript = ''

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Update transcript display
      if (interimTranscript) {
        setTranscript(interimTranscript)
      }

      // If we have final transcript, process it
      if (finalTranscript.trim()) {
        const finalText = finalTranscript.trim()
        console.log('Final transcript:', finalText)
        setTranscript(finalText)
        // Stop recognition before processing
        recognition.stop()
        // Process the query
        handleQuery(finalText)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      isRecognitionActiveRef.current = false
      setIsListening(false)
      setStatus('Idle')
      
      // Handle specific errors
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try speaking again.')
        setTranscript('')
      } else if (event.error === 'audio-capture') {
        setError('No microphone found. Please check your microphone settings.')
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.')
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection and try again.')
      } else if (event.error === 'aborted') {
        // User stopped, don't show error
        console.log('Recognition aborted by user')
      } else {
        setError(`Speech recognition error: ${event.error}. Please try again.`)
      }
    }

    recognition.onend = () => {
      console.log('Recognition ended')
      isRecognitionActiveRef.current = false
      setIsListening(false)
      if (status === 'Listening...') {
        setStatus('Idle')
      }
      // Clear recognition ref so we can create a new one
      recognitionRef.current = null
    }

    return recognition
  }, [handleQuery, status])

  // Start listening function
  const startListening = useCallback(() => {
    // Check browser support first
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert("Browser not supported. Please use Chrome or Edge.")
      return
    }

    // Don't start if already listening or processing
    if (isListening || isProcessing || isRecognitionActiveRef.current) {
      console.log('Already listening or processing')
      return
    }

    // Create fresh recognition instance
    const recognition = createRecognition()
    if (!recognition) {
      return
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      console.log('Starting recognition...')
    } catch (err) {
      console.error('Error starting recognition:', err)
      if (err.message && err.message.includes('already started')) {
        // Recognition was already started, stop it first
        try {
          recognition.stop()
        } catch (e) {
          console.error('Error stopping recognition:', e)
        }
        // Try again after a short delay
        setTimeout(() => {
          try {
            recognition.start()
          } catch (e2) {
            setError('Failed to start speech recognition. Please try again.')
          }
        }, 100)
      } else {
        setError('Failed to start speech recognition. Please try again.')
      }
    }
  }, [isListening, isProcessing, createRecognition])

  // Stop listening function
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop()
        console.log('Stopping recognition...')
      } catch (err) {
        console.error('Error stopping recognition:', err)
      }
    }
    setIsListening(false)
    setStatus('Idle')
    isRecognitionActiveRef.current = false
  }, [])

  // Button handlers
  const handleButtonClick = () => {
    if (isListening || isRecognitionActiveRef.current) {
      stopListening()
    } else if (!isProcessing) {
      startListening()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (err) {
          console.error('Error cleaning up recognition:', err)
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-indigo-600">Voice Bot</h1>
          <p className="text-gray-600 mt-1">Customer Interaction Assistant</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Queries</p>
              <p className="text-3xl font-bold text-indigo-600">{queryCount}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-green-600">{status}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Messages</p>
              <p className="text-3xl font-bold text-purple-600">{messages.length}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-96 overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Conversation</h2>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Click the microphone button to start talking!</p>
              <p className="text-xs mt-2">Make sure to allow microphone access when prompted.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    {message.intent && (
                      <p className="text-xs mt-1 opacity-75">
                        Intent: {message.intent}
                      </p>
                    )}
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Listening:</span> {transcript}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm font-semibold">Error:</p>
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => {
                setError('')
                setTranscript('')
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Microphone Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleButtonClick}
            disabled={isProcessing}
            className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : isProcessing
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? (
              <svg
                className="w-16 h-16"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM5 9a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm9-1a1 1 0 011 1v1a1 1 0 11-2 0V9a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : isProcessing ? (
              <svg
                className="w-16 h-16 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-16 h-16"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p className="mb-2">
            <strong>How to use:</strong> Click the microphone button, speak your question clearly, then wait for the response.
          </p>
          <p className="text-xs">
            Try asking: "What's my balance?", "What is your pricing?", "I need help with support"
          </p>
          <p className="text-xs mt-1 text-gray-500">
            The bot will listen to your question, process it, and respond both in text and audio.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 px-6 mt-8">
        <div className="max-w-4xl mx-auto text-center text-gray-600 text-sm">
          <p>Voice Bot Customer Interaction System &copy; 2024</p>
        </div>
      </footer>
    </div>
  )
}

export default App
