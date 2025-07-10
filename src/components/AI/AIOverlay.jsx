import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Minimize2, Maximize2, X, MapPin, Loader2, Key } from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import { searchSuggestions } from '../../services/geocoding'
import { generateTripResponse, extractLocationSuggestions, isGeminiAvailable, initializeGemini } from '../../services/gemini'
import styles from './AIOverlay.module.css'

const AIOverlay = () => {
  const { state, setCurrentTrip } = useTrip()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(!isGeminiAvailable())
  const [apiKey, setApiKey] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: isGeminiAvailable() 
        ? "Hi! I'm your AI travel agent powered by Google Gemini. I can directly modify your trip for you!\n\n**What I can do:**\n• Add locations to your route\n• Remove waypoints: 'Remove Seattle'\n• Add notes: 'Add note great coffee to Portland'\n• Clear trip: 'Start over'\n• Suggest restaurants, attractions, and scenic stops\n\nTry asking me 'Find great restaurants in San Francisco' or 'Remove the last stop and add a scenic viewpoint instead'."
        : "Hi! I'm your AI travel assistant. To use AI features, please enter your Google Gemini API key. You can get a free API key at https://ai.google.dev/. Once set up, I can intelligently manage your entire trip!",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const currentTrip = state.currentTrip
  const waypoints = currentTrip?.waypoints || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // AI Agent Functions for Trip Manipulation
  const addWaypointToTrip = (locationData) => {
    if (!currentTrip || !locationData) return

    const newWaypoint = {
      id: `waypoint-${Date.now()}`,
      location: locationData.name,
      date: '',
      time: '',
      type: 'waypoint',
      lat: locationData.lat,
      lng: locationData.lng,
      address: locationData.address,
      notes: ''
    }
    
    // Insert before the last waypoint (end)
    const newWaypoints = [...waypoints.slice(0, -1), newWaypoint, waypoints[waypoints.length - 1]]
    const updatedTrip = {
      ...currentTrip,
      waypoints: newWaypoints,
      route: null, // Reset route when adding waypoints
      distance: null,
      duration: null
    }
    setCurrentTrip(updatedTrip)
    
    return newWaypoint.id
  }

  const removeWaypointFromTrip = (identifier) => {
    if (!currentTrip) return false
    
    // Remove by ID, name, or location
    const newWaypoints = waypoints.filter(wp => {
      if (wp.type === 'start' || wp.type === 'end') return true // Never remove start/end
      return wp.id !== identifier && 
             wp.location.toLowerCase() !== identifier.toLowerCase() &&
             !wp.address.toLowerCase().includes(identifier.toLowerCase())
    })
    
    if (newWaypoints.length !== waypoints.length) {
      const updatedTrip = {
        ...currentTrip,
        waypoints: newWaypoints,
        route: null,
        distance: null,
        duration: null
      }
      setCurrentTrip(updatedTrip)
      return true
    }
    return false
  }

  const updateWaypointInTrip = (identifier, updates) => {
    if (!currentTrip) return false
    
    const newWaypoints = waypoints.map(wp => {
      if (wp.id === identifier || 
          wp.location.toLowerCase() === identifier.toLowerCase() ||
          wp.address.toLowerCase().includes(identifier.toLowerCase())) {
        return { ...wp, ...updates }
      }
      return wp
    })
    
    const updatedTrip = {
      ...currentTrip,
      waypoints: newWaypoints,
      route: null,
      distance: null,
      duration: null
    }
    setCurrentTrip(updatedTrip)
    return true
  }

  const reorderWaypoints = (fromIndex, toIndex) => {
    if (!currentTrip || fromIndex === toIndex) return false
    
    // Don't allow moving start/end waypoints
    if (fromIndex === 0 || fromIndex === waypoints.length - 1 || 
        toIndex === 0 || toIndex === waypoints.length - 1) return false
    
    const newWaypoints = [...waypoints]
    const [movedItem] = newWaypoints.splice(fromIndex, 1)
    newWaypoints.splice(toIndex, 0, movedItem)
    
    const updatedTrip = {
      ...currentTrip,
      waypoints: newWaypoints,
      route: null,
      distance: null,
      duration: null
    }
    setCurrentTrip(updatedTrip)
    return true
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Simulate AI processing and potentially add waypoints
    setTimeout(async () => {
      const aiResponse = await generateAIResponse(currentInput)
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = async (userInput) => {
    if (!isGeminiAvailable()) {
      return {
        id: Date.now() + 1,
        type: 'ai',
        content: "I need a Gemini API key to provide AI suggestions. Please click the key icon to set up your API key, then I can help you discover amazing places for your trip!",
        timestamp: new Date(),
        addedWaypoints: [],
        actions: []
      }
    }

    try {
      // Check for specific agent commands first
      const agentActions = parseAgentCommands(userInput)
      const actionsPerformed = []
      
      if (agentActions.length > 0) {
        for (const action of agentActions) {
          const result = await performAgentAction(action)
          if (result.success) {
            actionsPerformed.push(result.message)
          }
        }
      }

      // Generate AI response using Gemini with enhanced context
      const tripContext = {
        waypoints: waypoints.map(wp => ({
          location: wp.location,
          type: wp.type,
          notes: wp.notes,
          hasCoordinates: !!(wp.lat && wp.lng)
        })),
        currentLocation: null,
        totalWaypoints: waypoints.length,
        completedWaypoints: waypoints.filter(wp => wp.location).length
      }
      
      const enhancedPrompt = `${userInput}

Current trip context:
- Total waypoints: ${tripContext.totalWaypoints}
- Filled waypoints: ${tripContext.completedWaypoints}
- Waypoints: ${waypoints.map(wp => `${wp.type}: ${wp.location || 'empty'}`).join(', ')}

As an AI travel agent, I can:
1. Add locations to the trip
2. Remove locations from the trip  
3. Update waypoint details (notes, times)
4. Reorder waypoints
5. Suggest routes and attractions

Please provide helpful travel advice and if suggesting locations, I'll automatically add the best ones to the trip.`
      
      const aiResponse = await generateTripResponse(enhancedPrompt, tripContext)
      
      // Extract location suggestions from the AI response
      const suggestions = extractLocationSuggestions(aiResponse)
      const addedWaypoints = []
      
      // Try to add suggested locations to the trip
      for (const suggestion of suggestions) {
        try {
          const searchQuery = suggestion.location 
            ? `${suggestion.name} ${suggestion.location}`
            : suggestion.name
          
          const geoResults = await searchSuggestions(searchQuery, 1)
          
          if (geoResults.length > 0) {
            const place = geoResults[0]
            const waypointId = addWaypointToTrip({
              name: place.display_name.split(',')[0], // Use shorter name
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lng || place.lon),
              address: place.display_name
            })
            
            if (waypointId) {
              addedWaypoints.push(place.display_name.split(',')[0])
            }
          }
        } catch (error) {
          console.error('Error adding waypoint:', error)
        }
      }
      
      // Combine all performed actions
      let finalContent = aiResponse
      const allActions = [...actionsPerformed]
      
      if (addedWaypoints.length > 0) {
        allActions.push(`Added ${addedWaypoints.length} location${addedWaypoints.length > 1 ? 's' : ''} to your route`)
      }
      
      if (allActions.length > 0) {
        finalContent += `\n\n✅ **Actions performed:**\n${allActions.map(action => `• ${action}`).join('\n')}`
      }
      
      return {
        id: Date.now() + 1,
        type: 'ai',
        content: finalContent,
        timestamp: new Date(),
        addedWaypoints,
        actions: allActions
      }
      
    } catch (error) {
      console.error('AI Response error:', error)
      return {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm having trouble generating suggestions right now. This might be due to API limits or connection issues. Please try again in a moment!",
        timestamp: new Date(),
        addedWaypoints: [],
        actions: []
      }
    }
  }

  const parseAgentCommands = (input) => {
    const commands = []
    const lowerInput = input.toLowerCase()
    
    // Remove waypoint commands
    if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
      const matches = input.match(/(?:remove|delete)\s+([^,.!?]+)/gi)
      if (matches) {
        matches.forEach(match => {
          const location = match.replace(/(?:remove|delete)\s+/i, '').trim()
          commands.push({ type: 'remove', target: location })
        })
      }
    }
    
    // Add notes commands
    if (lowerInput.includes('add note') || lowerInput.includes('note that')) {
      const noteMatch = input.match(/(?:add note|note that)\s+(.+?)(?:\s+(?:to|for)\s+([^,.!?]+))?/i)
      if (noteMatch) {
        commands.push({ 
          type: 'addNote', 
          note: noteMatch[1].trim(),
          target: noteMatch[2] ? noteMatch[2].trim() : null
        })
      }
    }
    
    // Clear trip command
    if (lowerInput.includes('clear trip') || lowerInput.includes('start over')) {
      commands.push({ type: 'clearTrip' })
    }
    
    return commands
  }

  const performAgentAction = async (action) => {
    try {
      switch (action.type) {
        case 'remove':
          const removed = removeWaypointFromTrip(action.target)
          return removed 
            ? { success: true, message: `Removed "${action.target}" from trip` }
            : { success: false, message: `Could not find "${action.target}" to remove` }
        
        case 'addNote':
          if (action.target) {
            const updated = updateWaypointInTrip(action.target, { notes: action.note })
            return updated
              ? { success: true, message: `Added note to "${action.target}"` }
              : { success: false, message: `Could not find "${action.target}" to add note` }
          } else {
            // Add to the last waypoint
            const lastWaypoint = waypoints[waypoints.length - 1]
            if (lastWaypoint) {
              updateWaypointInTrip(lastWaypoint.id, { notes: action.note })
              return { success: true, message: `Added note to ${lastWaypoint.location || 'destination'}` }
            }
          }
          return { success: false, message: 'Could not add note' }
        
        case 'clearTrip':
          const newTrip = {
            ...currentTrip,
            waypoints: [
              { id: 'start-1', location: '', date: '', type: 'start', time: '', lat: null, lng: null, address: '', notes: '' },
              { id: 'end-1', location: '', date: '', type: 'end', time: '', lat: null, lng: null, address: '', notes: '' }
            ],
            route: null,
            distance: null,
            duration: null
          }
          setCurrentTrip(newTrip)
          return { success: true, message: 'Cleared trip and started fresh' }
        
        default:
          return { success: false, message: 'Unknown command' }
      }
    } catch (error) {
      console.error('Error performing agent action:', error)
      return { success: false, message: `Error: ${error.message}` }
    }
  }

  const extractLocation = (text) => {
    // Simple location extraction - could be improved with NLP
    const patterns = [
      /(?:in|near|around|at)\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/,
      /([a-zA-Z\s]+?)\s+(?:restaurants|food|scenic|attractions)/
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return null
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleApiKeySubmit = () => {
    if (!apiKey.trim()) return
    
    const success = initializeGemini(apiKey.trim())
    if (success) {
      setShowApiKeyInput(false)
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: "Great! Your API key has been set up successfully. I'm now powered by Google Gemini and ready to help you discover amazing places for your trip. Try asking me something like 'Find great restaurants in San Francisco' or 'Suggest scenic stops between Seattle and Portland'!",
        timestamp: new Date()
      }])
      setApiKey('')
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: "I couldn't validate that API key. Please make sure you've entered a valid Google Gemini API key. You can get one for free at https://ai.google.dev/",
        timestamp: new Date()
      }])
    }
  }

  if (isMinimized) {
    return (
      <motion.div 
        className={styles.minimizedOverlay}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsMinimized(false)}
      >
        <Sparkles size={20} />
        <span>AI Assistant</span>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={`${styles.aiOverlay} ${isExpanded ? styles.expanded : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.overlayHeader}>
        <div className={styles.headerContent}>
          <Sparkles size={18} className={styles.headerIcon} />
          <h3>AI Travel Assistant</h3>
        </div>
        <div className={styles.headerActions}>
          {!isGeminiAvailable() && (
            <button 
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={styles.actionBtn}
              title="Set API Key"
            >
              <Key size={16} />
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.actionBtn}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            onClick={() => setIsMinimized(true)}
            className={styles.actionBtn}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        <div className={styles.messages}>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${styles.message} ${styles[message.type]}`}
              >
                <div className={styles.messageContent}>
                  {message.content}
                  {message.addedWaypoints && message.addedWaypoints.length > 0 && (
                    <div className={styles.addedWaypoints}>
                      <MapPin size={14} />
                      <span>Added to route</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.message} ${styles.ai} ${styles.loading}`}
            >
              <div className={styles.messageContent}>
                <Loader2 size={16} className={styles.spinner} />
                <span>Thinking...</span>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showApiKeyInput && !isGeminiAvailable() && (
        <div className={styles.apiKeySection}>
          <div className={styles.apiKeyInfo}>
            <p>Enter your Google Gemini API key to enable AI features:</p>
            <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">
              Get free API key →
            </a>
          </div>
          <div className={styles.apiKeyInput}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className={styles.input}
            />
            <button
              onClick={handleApiKeySubmit}
              disabled={!apiKey.trim()}
              className={styles.sendButton}
            >
              <Key size={16} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isGeminiAvailable() 
                ? "Ask me to find restaurants, attractions, or scenic stops..."
                : "Set up your API key to use AI features..."
            }
            className={styles.input}
            disabled={isLoading || !isGeminiAvailable()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isGeminiAvailable()}
            className={styles.sendButton}
          >
            <Send size={16} />
          </button>
        </div>

        {isGeminiAvailable() && (
          <div className={styles.suggestions}>
            <button 
              onClick={() => setInputValue("Find restaurants in San Francisco")}
              className={styles.suggestionChip}
            >
              Find restaurants
            </button>
            <button 
              onClick={() => setInputValue("Add scenic viewpoints between my stops")}
              className={styles.suggestionChip}
            >
              Scenic views
            </button>
            <button 
              onClick={() => setInputValue("Remove the last waypoint")}
              className={styles.suggestionChip}
            >
              Remove stop
            </button>
            <button 
              onClick={() => setInputValue("Start over with a new trip")}
              className={styles.suggestionChip}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AIOverlay