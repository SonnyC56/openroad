import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Minimize2, Maximize2, X, MapPin, Loader2, Key, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import { searchSuggestions } from '../../services/geocoding'
import { calculateRoute } from '../../services/routing'
import { generateTripResponse, extractLocationSuggestions, isGeminiAvailable, initializeGemini, clearApiKey } from '../../services/gemini'
import styles from './AIOverlay.module.css'

const AIOverlay = () => {
  const { state, setCurrentTrip } = useTrip()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(!isGeminiAvailable())
  const [apiKey, setApiKey] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: isGeminiAvailable() 
        ? "Hi! I'm your AI travel assistant 🗺️\n\nI can help you discover amazing places and manage your trip. When I suggest locations, you'll see clickable buttons to add the ones you like!\n\n**Try asking:**\n• \"Find 3 great parks in San Francisco\"\n• \"Remove Seattle from my trip\"\n• \"Add note bring camera to Golden Gate\"\n• \"Suggest scenic stops between LA and Vegas\"\n\nWhat would you like to explore?"
        : "Hi! I'm your AI travel assistant. To use AI features, please enter your Google Gemini API key. You can get a free API key at https://ai.google.dev/. Once set up, I can help you discover amazing places!",
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
  const addWaypointToTrip = (locationData, autoCalculateRoute = false) => {
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
    
    // Auto-recalculate route if requested and we have valid waypoints
    if (autoCalculateRoute && locationData.lat && locationData.lng) {
      setTimeout(() => {
        const validWaypoints = newWaypoints.filter(wp => wp.lat && wp.lng)
        if (validWaypoints.length >= 2) {
          triggerRouteCalculation()
        }
      }, 500)
    }
    
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

  const triggerRouteCalculation = async () => {
    try {
      // Get current waypoints after the addition
      const currentWaypoints = currentTrip?.waypoints || []
      const validWaypoints = currentWaypoints.filter(wp => wp.lat && wp.lng)
      
      if (validWaypoints.length >= 2) {
        const routeData = await calculateRoute(validWaypoints)
        
        if (routeData) {
          setCurrentTrip({
            ...currentTrip,
            route: routeData,
            distance: routeData.distance,
            duration: routeData.duration
          })
          
          // Add a route calculation success message
          const routeMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: `Route updated! Your trip is now ${Math.round(routeData.distance / 1000)} km and takes about ${Math.round(routeData.duration / 60)} minutes.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, routeMessage])
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I had trouble calculating the route, but your waypoint has been added successfully!",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleAddSuggestion = (suggestion) => {
    const waypointId = addWaypointToTrip({
      name: suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.address
    }, true) // Enable auto route calculation
    
    if (waypointId) {
      // Add a confirmation message
      const confirmationMessage = {
        id: Date.now(),
        type: 'ai',
        content: `Perfect! I've added "${suggestion.name}" to your trip. Calculating the new route...`,
        timestamp: new Date(),
        addedWaypoints: [suggestion.name]
      }
      setMessages(prev => [...prev, confirmationMessage])
    }
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
- Waypoints: ${waypoints.map(wp => `${wp.type}: ${wp.location || 'empty'}`).join(', ')}

As a helpful travel assistant, provide a concise response (2-3 sentences max) with specific recommendations. If suggesting multiple locations, limit to 3-5 options and be conversational.`
      
      const aiResponse = await generateTripResponse(enhancedPrompt, tripContext)
      
      // Extract location suggestions from the AI response for interactive selection
      const suggestions = extractLocationSuggestions(aiResponse)
      const interactiveSuggestions = []
      
      // Prepare suggestions for user selection (don't auto-add)
      for (const suggestion of suggestions.slice(0, 5)) { // Limit to 5 suggestions
        try {
          const searchQuery = suggestion.location 
            ? `${suggestion.name} ${suggestion.location}`
            : suggestion.name
          
          const geoResults = await searchSuggestions(searchQuery, 1)
          
          if (geoResults.length > 0) {
            const place = geoResults[0]
            interactiveSuggestions.push({
              name: place.display_name.split(',')[0],
              fullName: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lng || place.lon),
              address: place.display_name,
              description: suggestion.description || ''
            })
          }
        } catch (error) {
          console.error('Error geocoding suggestion:', error)
        }
      }
      
      // Keep response concise and friendly
      let finalContent = aiResponse
      const allActions = [...actionsPerformed]
      
      if (allActions.length > 0) {
        finalContent += `\n\n✅ ${allActions.join(', ')}`
      }
      
      return {
        id: Date.now() + 1,
        type: 'ai',
        content: finalContent,
        timestamp: new Date(),
        addedWaypoints: [],
        actions: allActions,
        suggestions: interactiveSuggestions // New: suggestions for user to choose from
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
        content: "Perfect! Your API key has been saved and I'm ready to help you plan amazing trips. Try asking me something like 'Find great restaurants in San Francisco' or 'Suggest scenic stops between Seattle and Portland'!",
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

  const handleClearApiKey = () => {
    clearApiKey()
    setShowApiKeyInput(true)
    setMessages([{
      id: Date.now(),
      type: 'ai',
      content: "API key cleared. Enter a new Gemini API key to continue using AI features.",
      timestamp: new Date()
    }])
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
          {!isGeminiAvailable() ? (
            <button 
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={styles.actionBtn}
              title="Set API Key"
            >
              <Key size={16} />
            </button>
          ) : (
            <button 
              onClick={handleClearApiKey}
              className={styles.actionBtn}
              title="Clear API Key"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.actionBtn}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
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

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.collapsibleContent}
          >
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
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className={styles.suggestionsSection}>
                      <div className={styles.suggestionsHeader}>
                        <span>Would you like to add any of these?</span>
                      </div>
                      <div className={styles.interactiveSuggestions}>
                        {message.suggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            className={styles.suggestionButton}
                            onClick={() => handleAddSuggestion(suggestion)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <MapPin size={14} />
                            <div className={styles.suggestionInfo}>
                              <span className={styles.suggestionName}>{suggestion.name}</span>
                              {suggestion.description && (
                                <span className={styles.suggestionDesc}>{suggestion.description}</span>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
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
              onClick={() => setInputValue("Find 3 great restaurants in San Francisco")}
              className={styles.suggestionChip}
            >
              Find restaurants
            </button>
            <button 
              onClick={() => setInputValue("Show me scenic spots along my route")}
              className={styles.suggestionChip}
            >
              Scenic spots
            </button>
            <button 
              onClick={() => setInputValue("Suggest fun activities for families")}
              className={styles.suggestionChip}
            >
              Family fun
            </button>
            <button 
              onClick={() => setInputValue("What are the best photo spots?")}
              className={styles.suggestionChip}
            >
              Photo spots
            </button>
          </div>
        )}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AIOverlay