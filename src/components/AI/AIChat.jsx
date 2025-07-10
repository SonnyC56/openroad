import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  MapPin, 
  Search,
  Loader2,
  X,
  ChevronDown
} from 'lucide-react'
import { aiService } from '../../services/ai'
import { searchService } from '../../services/search'
import { useTrip } from '../../contexts/TripContext'
import styles from './AIChat.module.css'

export const AIChat = ({ onClose }) => {
  const { trip, waypoints } = useTrip()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [showSegmentSelector, setShowSegmentSelector] = useState(false)
  const messagesEndRef = useRef(null)

  // Get available route segments
  const routeSegments = waypoints.length > 1 ? waypoints.slice(0, -1).map((wp, index) => ({
    id: index,
    from: wp.name || `Waypoint ${index + 1}`,
    to: waypoints[index + 1].name || `Waypoint ${index + 2}`,
    fromWaypoint: wp,
    toWaypoint: waypoints[index + 1]
  })) : []

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Build context for AI
      const context = []
      
      // Add system message with travel context
      context.push({
        role: 'system',
        content: aiService.createTravelSystemMessage(selectedSegment)
      })

      // Add location context
      if (waypoints.length > 0) {
        context.push({
          role: 'system',
          content: aiService.formatLocationContext(waypoints, selectedSegment)
        })
      }

      // Add search results if query seems like it needs web search
      if (inputValue.toLowerCase().includes('find') || 
          inputValue.toLowerCase().includes('search') ||
          inputValue.toLowerCase().includes('what') ||
          inputValue.toLowerCase().includes('where')) {
        
        const searchQuery = inputValue
        const location = selectedSegment ? 
          `${selectedSegment.from} to ${selectedSegment.to}` :
          waypoints.length > 0 ? waypoints[0].name : null

        const searchResults = await searchService.searchTravel(searchQuery, location)
        if (searchResults.length > 0) {
          context.push({
            role: 'system',
            content: searchService.formatResultsForAI(searchResults, searchQuery)
          })
        }
      }

      // Add conversation history
      context.push(...messages.slice(-6)) // Keep last 6 messages for context
      context.push(userMessage)

      // Generate AI response
      const aiResponse = await aiService.generateResponse(context)
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        model: aiResponse.model
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI chat error:', error)
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again or check your AI provider settings.`,
        timestamp: new Date(),
        isError: true
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={styles.chatContainer}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <Bot className={styles.botIcon} />
          <div>
            <h3>Travel Assistant</h3>
            <p>AI-powered travel recommendations</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={styles.settingsButton}
          >
            <Settings size={20} />
          </button>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Route Segment Selector */}
      <div className={styles.segmentSelector}>
        <button
          onClick={() => setShowSegmentSelector(!showSegmentSelector)}
          className={styles.segmentButton}
        >
          <MapPin size={16} />
          {selectedSegment ? 
            `${selectedSegment.from} → ${selectedSegment.to}` : 
            'Select route segment'
          }
          <ChevronDown size={16} />
        </button>
        
        <AnimatePresence>
          {showSegmentSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={styles.segmentDropdown}
            >
              <button
                onClick={() => {
                  setSelectedSegment(null)
                  setShowSegmentSelector(false)
                }}
                className={`${styles.segmentOption} ${!selectedSegment ? styles.active : ''}`}
              >
                Entire trip
              </button>
              {routeSegments.map(segment => (
                <button
                  key={segment.id}
                  onClick={() => {
                    setSelectedSegment(segment)
                    setShowSegmentSelector(false)
                  }}
                  className={`${styles.segmentOption} ${
                    selectedSegment?.id === segment.id ? styles.active : ''
                  }`}
                >
                  {segment.from} → {segment.to}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.settingsPanel}
          >
            <AISettings />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className={styles.messages}>
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`${styles.message} ${styles[message.role]}`}
            >
              <div className={styles.messageIcon}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.messageText}>
                  {message.content}
                </div>
                <div className={styles.messageTime}>
                  {formatTime(message.timestamp)}
                  {message.model && (
                    <span className={styles.model}>• {message.model}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.message} ${styles.assistant}`}
          >
            <div className={styles.messageIcon}>
              <Bot size={16} />
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageText}>
                <Loader2 size={16} className={styles.spinner} />
                Thinking...
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about places to visit, restaurants, events, or anything about your trip..."
            className={styles.input}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={styles.sendButton}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// AI Settings Component
const AISettings = () => {
  const [providers, setProviders] = useState([])
  const [currentProvider, setCurrentProvider] = useState('')
  const [settings, setSettings] = useState({})

  useEffect(() => {
    setProviders(aiService.getAvailableProviders())
    setCurrentProvider(aiService.currentProvider || '')
    setSettings(aiService.getSettings())
  }, [])

  const handleProviderChange = (providerId) => {
    aiService.setProvider(providerId)
    setCurrentProvider(providerId)
  }

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    aiService.updateSettings(newSettings)
  }

  return (
    <div className={styles.settings}>
      <h4>AI Settings</h4>
      
      <div className={styles.settingGroup}>
        <label>Provider</label>
        <select
          value={currentProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} {provider.configured ? '✓' : '(not configured)'}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.settingGroup}>
        <label>Temperature: {settings.temperature}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
        />
      </div>

      <div className={styles.settingGroup}>
        <label>Max Tokens</label>
        <input
          type="number"
          min="100"
          max="4000"
          value={settings.maxTokens}
          onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
        />
      </div>
    </div>
  )
}