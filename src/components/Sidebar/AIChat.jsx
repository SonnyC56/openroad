import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, MapPin, Loader2, Sparkles } from 'lucide-react'
import styles from './AIChat.module.css'

const AIChat = ({ currentTrip }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your AI travel assistant. I can help you discover amazing places, suggest stops along your route, and create the perfect itinerary. Start by telling me your starting point and destination, or ask me for recommendations!",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (userInput) => {
    // This is a placeholder - replace with actual AI integration
    const waypoints = currentTrip?.waypoints || []
    const hasStart = waypoints.some(wp => wp.type === 'start' && wp.location)
    const hasEnd = waypoints.some(wp => wp.type === 'end' && wp.location)
    
    // Context-aware responses based on current trip state
    if (!hasStart && !hasEnd) {
      return "I'd love to help you plan your trip! To get started, could you tell me where you're traveling from and where you'd like to go? For example: 'I want to drive from San Francisco to Los Angeles.'"
    } else if (hasStart && !hasEnd) {
      return "Great! I see you're starting your trip. Where would you like to go? I can suggest some amazing destinations and help you plan the perfect route."
    } else if (!hasStart && hasEnd) {
      return "I see your destination! Where will you be starting your journey from? Once I know both points, I can suggest some incredible stops along the way."
    } else {
      const responses = [
        "Perfect! I can see your route is taking shape. Would you like me to suggest some amazing stops along the way? I can recommend restaurants, scenic viewpoints, attractions, or hidden gems.",
        "Excellent route! Let me help you discover some incredible places to visit. What interests you most - food, nature, history, or unique attractions?",
        "I love your trip plan! I can suggest some fantastic waypoints to make your journey even more memorable. What type of experiences are you looking for?",
        "Great start! Based on your route, I can recommend some must-visit spots. Would you like suggestions for dining, sightseeing, or outdoor activities?"
      ]
      return responses[Math.floor(Math.random() * responses.length)]
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  }

  return (
    <div className={styles.aiChat}>
      <div className={styles.messagesContainer}>
        <div className={styles.messages}>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                className={`${styles.message} ${styles[message.type]}`}
              >
                <div className={styles.messageIcon}>
                  {message.type === 'ai' ? (
                    <div className={styles.aiAvatar}>
                      <Sparkles size={16} />
                    </div>
                  ) : (
                    <div className={styles.userAvatar}>
                      <User size={16} />
                    </div>
                  )}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>
                    {message.content}
                  </div>
                  <div className={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              className={`${styles.message} ${styles.ai} ${styles.loading}`}
            >
              <div className={styles.messageIcon}>
                <div className={styles.aiAvatar}>
                  <Loader2 size={16} className={styles.spinner} />
                </div>
              </div>
              <div className={styles.messageContent}>
                <div className={styles.messageText}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your trip, ask for recommendations, or chat about your route..."
            className={styles.input}
            rows={1}
            disabled={isLoading}
          />
          <motion.button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={styles.sendButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={18} />
          </motion.button>
        </div>
        
        <div className={styles.suggestions}>
          {!currentTrip?.waypoints?.some(wp => wp.type === 'start' && wp.location) ? (
            <button 
              onClick={() => setInputValue("Plan a road trip from San Francisco to Los Angeles")}
              className={styles.suggestionChip}
            >
              <MapPin size={14} />
              Plan a road trip
            </button>
          ) : (
            <>
              <button 
                onClick={() => setInputValue("Find restaurants along my route")}
                className={styles.suggestionChip}
              >
                Find restaurants
              </button>
              <button 
                onClick={() => setInputValue("Show me scenic viewpoints")}
                className={styles.suggestionChip}
              >
                Scenic viewpoints
              </button>
              <button 
                onClick={() => setInputValue("Add interesting attractions")}
                className={styles.suggestionChip}
              >
                Add attractions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AIChat