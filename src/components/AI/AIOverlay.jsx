import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Sparkles, Minimize2, Maximize2, X, MapPin, Loader2, Key, ChevronDown, ChevronUp, Trash2, Brain, Zap } from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import { searchSuggestions } from '../../services/geocoding'
import { generateTripResponse, extractLocationSuggestions, extractStructuredSuggestions, isGeminiAvailable, initializeGemini, clearApiKey } from '../../services/gemini'
import weatherService from '../../services/weather'
import trafficService from '../../services/traffic'
import { createAgenticAI, ACTION_TYPES } from '../../services/agenticAI'
import MapAgent from '../../services/mapAgent'
import '../../styles/mapAgent.css'
import styles from './AIOverlay.module.css'

const AIOverlay = memo(() => {
  const { state, setCurrentTrip, addWaypoint, updateWaypoint, removeWaypoint, setSelectedLeg } = useTrip()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(!isGeminiAvailable())
  const [apiKey, setApiKey] = useState('')
  const [autoMode] = useState(true) // Always auto mode
  const [aiAgent, setAiAgent] = useState(null)
  const [mapAgent, setMapAgent] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [showClearHistory, setShowClearHistory] = useState(false)
  
  // Function to download conversation history
  const downloadConversationHistory = () => {
    const conversationData = {
      messages: messages,
      tripInfo: state.currentTrip ? {
        name: state.currentTrip.name,
        waypoints: state.currentTrip.waypoints.map(wp => ({
          location: wp.location,
          type: wp.type,
          notes: wp.notes
        }))
      } : null,
      exportDate: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openroad-conversation-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: isGeminiAvailable() 
        ? "Hi! I'm your AI travel agent 🗺️✨\n\nI'll automatically plan your trips, plot locations on the map, and add stops to your itinerary!\n\n**🎯 I can:**\n• Plan complete trip itineraries with automatic waypoint creation\n• Plot all suggestions directly on the map with animations\n• Add stops to your trip automatically as I suggest them\n• Provide expert travel timing and route optimization\n• Show real-time weather and traffic conditions\n• Give smart recommendations based on conditions\n\n**Try asking:**\n• \"Plan a 14-day trip from NY to LA visiting national parks\"\n• \"Show me scenic stops between Denver and Vegas\"\n• \"What's the weather like on my route?\"\n• \"Find the best time to leave to avoid traffic\"\n\nWhat adventure shall we plan together?"
        : "Hi! I'm your AI travel assistant. To use AI features, please enter your Google Gemini API key. You can get a free API key at https://ai.google.dev/. Once set up, I can help you discover amazing places!",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Handle smart auto-scrolling
  useEffect(() => {
    scrollToBottom()
  }, [messages, shouldAutoScroll])

  // Detect if user has scrolled up manually
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px tolerance
      setShouldAutoScroll(isAtBottom)
    }

    messagesContainer.addEventListener('scroll', handleScroll)
    return () => messagesContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // State for selected segment info
  const [selectedSegment, setSelectedSegment] = useState(null)

  // Listen for route segment selection from the map
  useEffect(() => {
    const handleSegmentSelect = (event) => {
      const { segmentInfo } = event.detail
      setSelectedSegment(segmentInfo)
      
      // Ensure AI overlay is visible when segment is selected
      if (isMinimized) {
        setIsMinimized(false)
      }
      if (isCollapsed) {
        setIsCollapsed(false)
      }
    }

    window.addEventListener('routeSegmentSelect', handleSegmentSelect)
    return () => window.removeEventListener('routeSegmentSelect', handleSegmentSelect)
  }, [isMinimized, isCollapsed])

  // Listen for POI additions from the map
  useEffect(() => {
    const handlePOIAdded = (event) => {
      const { poi, position, addedTime } = event.detail
      
      // Add a message to the chat about the POI addition
      const poiMessage = {
        id: Date.now(),
        type: 'ai',
        content: `Great choice! I've added **${poi.name}** to your trip. ${poi.description}\n\n${addedTime > 0 ? `This adds approximately ${addedTime} minutes to your journey.` : ''}\n\nWould you like me to suggest similar attractions or help you plan activities at this location?`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, poiMessage])
      setShouldAutoScroll(true)
    }

    window.addEventListener('poiAddedToRoute', handlePOIAdded)
    return () => {
      window.removeEventListener('poiAddedToRoute', handlePOIAdded)
    }
  }, [])

  // Load conversation history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('openroad-ai-conversation')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        if (parsed && parsed.messages && parsed.messages.length > 0) {
          setMessages(parsed.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })))
        }
      } catch (error) {
        console.error('Error loading conversation history:', error)
      }
    }
  }, [])

  // Save conversation history to localStorage
  useEffect(() => {
    if (messages.length > 1) { // Don't save just the initial message
      const historyToSave = {
        messages: messages.slice(-50), // Keep last 50 messages
        lastUpdated: new Date().toISOString()
      }
      localStorage.setItem('openroad-ai-conversation', JSON.stringify(historyToSave))
    }
  }, [messages])

  // Clear chat when trip changes
  useEffect(() => {
    const tripId = state.currentTrip?.id
    if (tripId && messages.length > 1) { // Only clear if there are messages beyond the initial one
      setMessages([{
        id: Date.now(),
        type: 'ai',
        content: isGeminiAvailable() 
          ? "New trip started! I'm ready to help you discover amazing places along your route. What are you looking for?"
          : "New trip started! Please enter your API key to use AI features.",
        timestamp: new Date()
      }])
    }
  }, [state.currentTrip?.id])

  // Initialize Agentic AI and Map Agent
  useEffect(() => {
    // Get map instance from global or context
    const mapInstance = window.mapInstance || null
    
    if (mapInstance && !mapAgent) {
      console.log('🤖 Initializing Agentic AI System...')
      
      // Create map agent
      const newMapAgent = new MapAgent(mapInstance)
      setMapAgent(newMapAgent)
      
      // Set global reference for map interactions
      window.mapAgent = newMapAgent
      
      // Create agentic AI with map capabilities
      const newAiAgent = createAgenticAI(
        mapInstance,
        { state },
        async (action) => {
          console.log('🎯 AI Action:', action.type)
          
          switch (action.type) {
            case ACTION_TYPES.PLOT_LOCATION:
              if (action.locations) {
                await newMapAgent.plotAISuggestions(
                  action.locations.map(loc => ({ 
                    location: loc, 
                    name: loc,
                    description: `AI Action: ${loc}`,
                    confidence: 0.8
                  })),
                  { animate: true, showRoutes: false }
                )
              }
              break
              
            case ACTION_TYPES.HIGHLIGHT_AREA:
              if (action.bounds) {
                newMapAgent.highlightArea(action.bounds, action.options)
              } else if (action.locations) {
                // Handle location-based area highlighting
                await newMapAgent.plotAISuggestions(
                  action.locations.map(loc => ({ 
                    location: loc, 
                    name: loc,
                    description: `Area highlight: ${loc}`,
                    confidence: 0.7
                  })),
                  { animate: true, showRoutes: true }
                )
              }
              break
              
            case ACTION_TYPES.ADD_WAYPOINT:
              if (action.waypoint) {
                addWaypoint(action.waypoint)
              }
              break
              
            default:
              console.log('Action queued:', action.type)
          }
        }
      )
      
      setAiAgent(newAiAgent)
      
      console.log('✅ Agentic AI System Ready!')
    }
  }, [state, addWaypoint])

  // Listen for map agent actions
  useEffect(() => {
    const handleMapAction = (event) => {
      const { action, data } = event.detail
      
      switch (action) {
        case 'addToTrip':
          addWaypoint({
            id: `waypoint-${Date.now()}`,
            location: data.name,
            lat: data.lat,
            lng: data.lng,
            type: 'waypoint',
            address: data.name,
            date: '',
            time: '',
            notes: 'Added via AI suggestion'
          })
          
          // Add confirmation message
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: `✅ Added "${data.name}" to your trip! I can suggest more stops along your route if you'd like.`,
            timestamp: new Date()
          }])
          break
          
        case 'showDetails':
          // Trigger AI to provide more details about the location
          handleSendMessage(`Tell me more about ${data.name}`, false)
          break
      }
    }
    
    window.addEventListener('aiMapAction', handleMapAction)
    return () => window.removeEventListener('aiMapAction', handleMapAction)
  }, [addWaypoint])

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Helper function to calculate string similarity (Levenshtein distance based)
  const calculateStringSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0
    
    // Normalize strings
    const s1 = str1.toLowerCase().trim().replace(/[^\w\s]/g, '')
    const s2 = str2.toLowerCase().trim().replace(/[^\w\s]/g, '')
    
    if (s1 === s2) return 1
    
    const len1 = s1.length
    const len2 = s2.length
    
    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0
    
    // Create matrix
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null))
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[0][i] = i
    for (let j = 0; j <= len2; j++) matrix[j][0] = j
    
    // Fill matrix
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,      // deletion
          matrix[j][i - 1] + 1,      // insertion
          matrix[j - 1][i - 1] + cost // substitution
        )
      }
    }
    
    const distance = matrix[len2][len1]
    const maxLength = Math.max(len1, len2)
    
    return 1 - (distance / maxLength)
  }

  // Find the best position to insert a waypoint to maintain route progression
  const findBestInsertPosition = (waypoints, newLat, newLng) => {
    const validWaypoints = waypoints.filter(wp => wp.lat && wp.lng)
    if (validWaypoints.length < 2) return waypoints.length - 1 // Add before end if no route exists
    
    // For east-west trips (like NY to LA), use longitude progression
    // For north-south trips, use latitude progression
    const start = validWaypoints[0]
    const end = validWaypoints[validWaypoints.length - 1]
    
    const lonDiff = Math.abs(end.lng - start.lng)
    const latDiff = Math.abs(end.lat - start.lat)
    
    // Determine if this is primarily an east-west or north-south trip
    const isEastWest = lonDiff > latDiff
    
    if (isEastWest) {
      // For east-west trips, insert based on longitude progression
      const isWestToEast = end.lng > start.lng
      
      for (let i = 0; i < validWaypoints.length - 1; i++) {
        const currentWp = validWaypoints[i]
        const nextWp = validWaypoints[i + 1]
        
        if (isWestToEast) {
          // Going west to east 
          if (newLng >= currentWp.lng && newLng <= nextWp.lng) {
            return waypoints.findIndex(wp => wp.id === nextWp.id)
          }
        } else {
          // Going east to west (like NY to LA)
          if (newLng <= currentWp.lng && newLng >= nextWp.lng) {
            return waypoints.findIndex(wp => wp.id === nextWp.id)
          }
        }
      }
    } else {
      // For north-south trips, insert based on latitude progression
      const isNorthToSouth = end.lat < start.lat
      
      for (let i = 0; i < validWaypoints.length - 1; i++) {
        const currentWp = validWaypoints[i]
        const nextWp = validWaypoints[i + 1]
        
        if (isNorthToSouth) {
          // Going north to south
          if (newLat <= currentWp.lat && newLat >= nextWp.lat) {
            return waypoints.findIndex(wp => wp.id === nextWp.id)
          }
        } else {
          // Going south to north
          if (newLat >= currentWp.lat && newLat <= nextWp.lat) {
            return waypoints.findIndex(wp => wp.id === nextWp.id)
          }
        }
      }
    }
    
    // If no perfect position found, find the position that minimizes detour
    let bestPosition = 1
    let minDetour = Infinity
    
    for (let i = 1; i < validWaypoints.length; i++) {
      const prevWp = validWaypoints[i - 1]
      const nextWp = validWaypoints[i]
      
      const originalDist = calculateDistance(prevWp.lat, prevWp.lng, nextWp.lat, nextWp.lng)
      const detourDist = calculateDistance(prevWp.lat, prevWp.lng, newLat, newLng) +
                        calculateDistance(newLat, newLng, nextWp.lat, nextWp.lng)
      const detour = detourDist - originalDist
      
      if (detour < minDetour) {
        minDetour = detour
        bestPosition = waypoints.findIndex(wp => wp.id === nextWp.id)
      }
    }
    
    return bestPosition
  }

  // AI Agent Functions for Trip Manipulation
  const addWaypointToTrip = (locationData, placement = 'auto') => {
    console.log('🔧 Adding waypoint to trip:', locationData, 'placement:', placement)
    const currentTrip = state.currentTrip
    
    if (!currentTrip || !locationData) {
      console.error('❌ Cannot add waypoint: missing currentTrip or locationData')
      return null
    }

    const newWaypoint = {
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      location: locationData.name,
      date: '',
      time: '',
      type: 'waypoint',
      lat: locationData.lat,
      lng: locationData.lng,
      address: locationData.address,
      notes: locationData.notes || ''
    }
    
    console.log('🔧 Created new waypoint:', newWaypoint)
    
    const waypoints = currentTrip.waypoints || []
    let insertIndex
    
    // If we have a selected segment, insert relative to it
    if (selectedSegment && selectedSegment.legIndex !== undefined) {
      insertIndex = selectedSegment.legIndex + 1
      console.log(`🔧 Inserting waypoint after selected segment: ${selectedSegment.to}`)
    } else if (locationData.maintainOrder) {
      // For multi-step trips, add in sequential order
      insertIndex = waypoints.length - 1 // Add before the end waypoint
      console.log(`🔧 Adding waypoint in sequential order for multi-step trip`)
    } else {
      // Find the best position to maintain logical route progression
      insertIndex = findBestInsertPosition(waypoints, locationData.lat, locationData.lng)
      console.log(`🔧 Auto-positioning waypoint at index ${insertIndex} for optimal route`)
    }
    
    // Create new waypoints array with the new waypoint inserted at the correct position
    const newWaypoints = [
      ...waypoints.slice(0, insertIndex),
      newWaypoint,
      ...waypoints.slice(insertIndex)
    ]
    
    // Update the entire trip with the new waypoints array
    setCurrentTrip({
      ...currentTrip,
      waypoints: newWaypoints,
      route: null, // Reset route for recalculation
      distance: null,
      duration: null
    })
    
    console.log('🔧 Waypoint added, TripPlanner will handle route calculation')
    
    return newWaypoint.id
  }

  const removeWaypointFromTrip = (identifier) => {
    const currentTrip = state.currentTrip
    if (!currentTrip) return false
    
    const waypoints = currentTrip.waypoints || []
    
    // Find waypoint to remove by ID, name, or location
    const waypointToRemove = waypoints.find(wp => {
      if (wp.type === 'start' || wp.type === 'end') return false // Never remove start/end
      return wp.id === identifier || 
             wp.location.toLowerCase() === identifier.toLowerCase() ||
             (wp.address && wp.address.toLowerCase().includes(identifier.toLowerCase()))
    })
    
    if (waypointToRemove) {
      removeWaypoint(waypointToRemove.id)
      return true
    }
    return false
  }

  const updateWaypointInTrip = (identifier, updates) => {
    const currentTrip = state.currentTrip
    if (!currentTrip) return false
    
    const waypoints = currentTrip.waypoints || []
    
    // Find waypoint to update by ID, name, or location
    const waypointToUpdate = waypoints.find(wp => {
      return wp.id === identifier || 
             wp.location.toLowerCase() === identifier.toLowerCase() ||
             (wp.address && wp.address.toLowerCase().includes(identifier.toLowerCase()))
    })
    
    if (waypointToUpdate) {
      updateWaypoint(waypointToUpdate.id, updates)
      return true
    }
    return false
  }


  // Let TripPlanner handle route calculation to avoid race conditions
  const triggerRouteCalculation = () => {
    console.log('🔧 Route calculation will be handled by TripPlanner component')
    // TripPlanner already handles route calculation when waypoints change
    // This prevents race conditions and duplicate calculations
  }

  // Memoize the handleAddSuggestion function to prevent unnecessary re-renders
  const handleAddSuggestion = useCallback((suggestion) => {
    console.log('Adding suggestion to trip:', suggestion)
    const currentWaypoints = state.currentTrip?.waypoints || []
    console.log('Current waypoints before adding:', currentWaypoints.length)
    
    const waypointId = addWaypointToTrip({
      name: suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.address,
      isAlongRoute: suggestion.isAlongRoute,
      notes: suggestion.description
    }, suggestion.placement || 'auto')
    
    if (waypointId) {
      console.log('Waypoint added successfully with ID:', waypointId)
      
      // Add a confirmation message
      const confirmationMessage = {
        id: Date.now(),
        type: 'ai',
        content: `Perfect! I've added "${suggestion.name}" to your trip${selectedSegment ? ` along the route from ${selectedSegment.from} to ${selectedSegment.to}` : ''}. This waypoint has been saved and the route will be recalculated automatically.`,
        timestamp: new Date(),
        addedWaypoints: [suggestion.name]
      }
      setMessages(prev => [...prev, confirmationMessage])
      
      // Force scroll to show the confirmation
      setShouldAutoScroll(true)
    } else {
      console.error('Failed to add waypoint')
      
      const errorMessage = {
        id: Date.now(),
        type: 'ai',
        content: `Sorry, I couldn't add "${suggestion.name}" to your trip. Please try adding it manually or try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [state.currentTrip?.waypoints, selectedSegment, addWaypointToTrip, setShouldAutoScroll])

  const handleSendMessage = async (customInput = null, addToMessages = true) => {
    const userInput = customInput || inputValue.trim()
    if (!userInput || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    }

    if (addToMessages) {
      setMessages(prev => [...prev, userMessage])
    }
    
    if (!customInput) {
      setInputValue('')
    }
    setIsLoading(true)
    setIsThinking(true)

    try {
      let aiResponse
      
      if (aiAgent) {
        // Always use agentic AI for automatic trip planning
        console.log('🧠 Using AI Agent Mode...')
        console.log('📝 User input:', userInput)
        console.log('🗺️ Map agent available:', !!mapAgent)
        
        const agentResponse = await aiAgent.think(userInput, messages.slice(-5), selectedSegment)
        console.log('🤖 Agent response:', agentResponse)
        
        // Process actions: both map visualization AND waypoint creation (consolidated to avoid duplicates)
        if (agentResponse.actions && mapAgent) {
          const addedWaypoints = []
          const allLocationsToProcess = new Set() // Use Set to avoid duplicates
          let primaryAction = null
          
          // Clean up localStorage periodically to prevent quota issues
          try {
            const storageKeys = Object.keys(localStorage)
            if (storageKeys.length > 50) { // If too many keys, clean old ones
              console.log('🧹 Cleaning up localStorage to prevent quota issues')
              const oldKeys = storageKeys.filter(key => 
                key.startsWith('ai-') || key.startsWith('temp-') || key.startsWith('cache-')
              ).slice(0, 20)
              oldKeys.forEach(key => localStorage.removeItem(key))
            }
          } catch (e) {
            console.warn('⚠️ localStorage cleanup failed:', e)
          }
          
          // Collect all unique locations from all actions with enhanced duplicate prevention
          const currentWaypoints = state.currentTrip?.waypoints || []
          const existingLocationStrings = new Set([
            ...currentWaypoints.map(w => w.location?.toLowerCase().trim()).filter(Boolean),
            ...currentWaypoints.map(w => w.address?.toLowerCase().trim()).filter(Boolean),
            ...currentWaypoints.map(w => w.notes?.toLowerCase().trim()).filter(Boolean)
          ])
          
          console.log('🗺️ Existing waypoint locations:', Array.from(existingLocationStrings))
          
          for (const action of agentResponse.actions) {
            console.log('🎯 Processing action:', action.type, action.locations)
            
            if (action.locations && action.locations.length > 0) {
              action.locations.forEach(loc => {
                const locationLower = loc.toLowerCase().trim()
                
                // Enhanced duplicate check - don't add if similar location already exists
                const isDuplicate = Array.from(existingLocationStrings).some(existing => 
                  existing.includes(locationLower) || 
                  locationLower.includes(existing) ||
                  calculateStringSimilarity(existing, locationLower) > 0.8
                )
                
                if (!isDuplicate) {
                  allLocationsToProcess.add(loc)
                  existingLocationStrings.add(locationLower) // Add to prevent future duplicates in this batch
                } else {
                  console.log(`🚫 Skipping duplicate/similar location: "${loc}"`)
                }
              })
              
              // Use the first action with start/end points as primary
              if (!primaryAction && (action.startPoint || action.endPoint)) {
                primaryAction = action
              }
            }
          }
          
          // If we have locations to process, do it once
          if (allLocationsToProcess.size > 0) {
            const locationsArray = Array.from(allLocationsToProcess)
            console.log('🗺️ Processing unique locations (after deduplication):', locationsArray)
            
            // Plot all locations on map
            const plottedResults = await mapAgent.plotAISuggestions(
              locationsArray.map(loc => ({ 
                location: loc, 
                name: loc,
                description: `AI suggested: ${loc}`,
                confidence: 0.85
              })),
              { animate: true, showRoutes: true, highlightBest: true }
            )
            
            // Filter results and prepare for intelligent sorting
            const validResults = plottedResults
              .filter(result => result.coords && result.suggestion)
              .filter(result => {
                const locationName = (result.suggestion.name || result.suggestion.location).toLowerCase().trim()
                
                // Final duplicate check against current waypoints
                const currentWaypointsNow = state.currentTrip?.waypoints || []
                const currentLocationStrings = new Set([
                  ...currentWaypointsNow.map(w => w.location?.toLowerCase().trim()).filter(Boolean),
                  ...currentWaypointsNow.map(w => w.address?.toLowerCase().trim()).filter(Boolean)
                ])
                
                return !Array.from(currentLocationStrings).some(existing => 
                  existing.includes(locationName) || 
                  locationName.includes(existing) ||
                  calculateStringSimilarity(existing, locationName) > 0.8
                )
              })
            
            console.log('🗺️ Valid results before sorting:', validResults.map(r => `${r.suggestion.location} (${r.coords.lat.toFixed(2)}, ${r.coords.lng.toFixed(2)})`))
            
            // Intelligent sorting based on trip direction
            if (validResults.length > 1) {
              // Determine trip direction from start/end points or from spread of coordinates
              let startPoint = null
              let endPoint = null
              
              if (primaryAction?.startPoint && primaryAction?.endPoint) {
                // Find start and end in results
                startPoint = validResults.find(r => {
                  const name = r.suggestion.location.toLowerCase()
                  const start = primaryAction.startPoint.toLowerCase()
                  return name.includes(start) || start.includes(name) || calculateStringSimilarity(name, start) > 0.7
                })
                endPoint = validResults.find(r => {
                  const name = r.suggestion.location.toLowerCase()
                  const end = primaryAction.endPoint.toLowerCase()
                  return name.includes(end) || end.includes(name) || calculateStringSimilarity(name, end) > 0.7
                })
              }
              
              // If we found start and end points, sort based on their direction
              if (startPoint && endPoint) {
                const lonDiff = endPoint.coords.lng - startPoint.coords.lng
                const latDiff = endPoint.coords.lat - startPoint.coords.lat
                const isEastWest = Math.abs(lonDiff) > Math.abs(latDiff)
                const isWestToEast = lonDiff > 0
                const isNorthToSouth = latDiff < 0
                
                console.log(`🧭 Trip direction: ${isEastWest ? (isWestToEast ? 'West→East' : 'East→West') : (isNorthToSouth ? 'North→South' : 'South→North')}`)
                
                validResults.sort((a, b) => {
                  if (isEastWest) {
                    // Sort by longitude (west to east or east to west)
                    return isWestToEast ? (a.coords.lng - b.coords.lng) : (b.coords.lng - a.coords.lng)
                  } else {
                    // Sort by latitude (north to south or south to north)
                    return isNorthToSouth ? (b.coords.lat - a.coords.lat) : (a.coords.lat - b.coords.lat)
                  }
                })
              } else {
                // Fallback: sort west to east, then south to north
                validResults.sort((a, b) => {
                  if (Math.abs(a.coords.lng - b.coords.lng) > 1) {
                    return a.coords.lng - b.coords.lng // West to East
                  }
                  return a.coords.lat - b.coords.lat // South to North
                })
              }
            }
            
            console.log('🗺️ Adding waypoints in proper order:', validResults.map(r => r.suggestion.location))
            
            // Clear existing waypoints if this is a new trip plan from scratch
            if (primaryAction?.startPoint && primaryAction?.endPoint && currentWaypoints.length === 0) {
              console.log('🆕 Starting fresh trip plan')
            }
            
            // Smart waypoint addition - ONLY add intermediate waypoints, never replace start/end
            console.log(`📍 Current waypoints before AI addition:`, currentWaypoints.map(w => `${w.type}: ${w.location || 'EMPTY'}`))
            
            // Check if we have existing start and end waypoints
            const hasExistingStart = currentWaypoints.some(wp => wp.type === 'start' && wp.location)
            const hasExistingEnd = currentWaypoints.some(wp => wp.type === 'end' && wp.location)
            
            console.log(`🔍 Existing trip state: Start=${hasExistingStart}, End=${hasExistingEnd}`)
            
            for (let i = 0; i < validResults.length; i++) {
              const result = validResults[i]
              const locationName = result.suggestion.name || result.suggestion.location
              
              // FIXED LOGIC: Determine waypoint type more intelligently
              let waypointType = 'waypoint' // Default to intermediate waypoint
              let shouldSkip = false
              
              // Only allow start/end type assignment if we're creating a completely new trip
              const isNewTripFromScratch = currentWaypoints.length <= 2 && 
                                         currentWaypoints.every(wp => !wp.location || wp.location.trim() === '')
              
              if (isNewTripFromScratch && primaryAction?.startPoint && primaryAction?.endPoint) {
                // Check if this location matches the start point for NEW trips only
                if (primaryAction?.startPoint) {
                  const startName = primaryAction.startPoint.toLowerCase()
                  const locationLower = locationName.toLowerCase()
                  if (locationLower.includes(startName) || startName.includes(locationLower) || 
                      calculateStringSimilarity(locationLower, startName) > 0.7) {
                    waypointType = 'start'
                  }
                }
                
                // Check if this location matches the end point for NEW trips only
                if (primaryAction?.endPoint) {
                  const endName = primaryAction.endPoint.toLowerCase()
                  const locationLower = locationName.toLowerCase()
                  if (locationLower.includes(endName) || endName.includes(locationLower) || 
                      calculateStringSimilarity(locationLower, endName) > 0.7) {
                    waypointType = 'end'
                  }
                }
              } else {
                // For existing trips, NEVER replace start/end - only add intermediate waypoints
                console.log(`🚫 Existing trip detected - only adding intermediate waypoints`)
                
                // Skip if this looks like it might be trying to replace start/end
                if (primaryAction?.startPoint || primaryAction?.endPoint) {
                  const locationLower = locationName.toLowerCase()
                  
                  if (primaryAction?.startPoint) {
                    const startName = primaryAction.startPoint.toLowerCase()
                    if (locationLower.includes(startName) || startName.includes(locationLower) || 
                        calculateStringSimilarity(locationLower, startName) > 0.7) {
                      console.log(`⚠️ Skipping potential start point replacement: ${locationName}`)
                      shouldSkip = true
                    }
                  }
                  
                  if (primaryAction?.endPoint) {
                    const endName = primaryAction.endPoint.toLowerCase()
                    if (locationLower.includes(endName) || endName.includes(locationLower) || 
                        calculateStringSimilarity(locationLower, endName) > 0.7) {
                      console.log(`⚠️ Skipping potential end point replacement: ${locationName}`)
                      shouldSkip = true
                    }
                  }
                }
                
                // Force all new additions to be waypoints for existing trips
                waypointType = 'waypoint'
              }
              
              if (shouldSkip) {
                console.log(`🚫 Skipping ${locationName} to preserve existing trip structure`)
                continue
              }
              
              // Check if we can replace an empty waypoint of the same type (only for new trips)
              const currentWaypointsNow = state.currentTrip?.waypoints || []
              const emptyWaypointOfType = isNewTripFromScratch ? currentWaypointsNow.find(wp => 
                wp.type === waypointType && (!wp.location || wp.location.trim() === '')
              ) : null
              
              if (emptyWaypointOfType) {
                // Update the existing empty waypoint instead of creating a new one
                console.log(`🔄 Updating empty ${waypointType} waypoint:`, emptyWaypointOfType.id)
                updateWaypoint(emptyWaypointOfType.id, {
                  location: locationName,
                  lat: result.coords.lat,
                  lng: result.coords.lng,
                  address: result.suggestion.location,
                  notes: `AI suggested: ${result.suggestion.description || 'Great stop for your trip!'}`
                })
                addedWaypoints.push(`${waypointType.toUpperCase()}: ${locationName}`)
                console.log(`✅ Updated ${waypointType}:`, locationName, `(${result.coords.lat.toFixed(2)}, ${result.coords.lng.toFixed(2)})`)
              } else {
                // Create a new waypoint - for existing trips, always add as intermediate waypoint
                const waypoint = {
                  id: `ai-waypoint-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                  location: locationName,
                  lat: result.coords.lat,
                  lng: result.coords.lng,
                  type: waypointType,
                  address: result.suggestion.location,
                  date: '',
                  time: '',
                  notes: `AI suggested: ${result.suggestion.description || 'Great stop for your trip!'}`
                }
                
                addWaypoint(waypoint)
                addedWaypoints.push(`STOP: ${locationName}`)
                console.log(`✅ Added new ${waypointType}:`, locationName, `(${result.coords.lat.toFixed(2)}, ${result.coords.lng.toFixed(2)})`)
              }
              
              // Small delay between waypoints to prevent race conditions
              if (i < validResults.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 150))
              }
            }
          }
          
          // Add confirmation message about added waypoints
          if (addedWaypoints.length > 0) {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                id: Date.now() + 999,
                type: 'ai',
                content: `🎉 I've automatically added ${addedWaypoints.length} stops to your trip:\n\n${addedWaypoints.map(w => `📍 ${w}`).join('\n')}\n\nYou can see them plotted on the map and in your trip planner! Want me to suggest more stops or optimize the route?`,
                timestamp: new Date(),
                isAutoConfirmation: true
              }])
            }, 2000) // Wait 2 seconds for animations to complete
          }
        }
        
        aiResponse = {
          id: Date.now() + 1,
          type: 'ai',
          content: agentResponse.text,
          timestamp: new Date(),
          confidence: agentResponse.confidence,
          intent: agentResponse.intent,
          actions: agentResponse.actions || [],
          isAgentic: true
        }
        
      } else {
        // Fallback to original AI response
        aiResponse = await generateAIResponse(userInput)
      }
      
      setMessages(prev => [...prev, aiResponse])
      
    } catch (error) {
      console.error('AI Response Error:', error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: "I encountered an issue processing your request. Let me try a different approach - what would you like to explore?",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
      setIsThinking(false)
    }
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
      // Check for specific agent commands first (higher priority)
      const agentActions = parseAgentCommands(userInput)
      const actionsPerformed = []
      
      if (agentActions.length > 0) {
        console.log('🔧 Processing agent commands:', agentActions)
        for (const action of agentActions) {
          const result = await performAgentAction(action)
          if (result.success) {
            actionsPerformed.push(result.message)
          }
        }
      }
      
      // Only check for trip planning if no specific commands were found AND we don't have a current trip
      let currentTrip = state.currentTrip
      let waypoints = currentTrip?.waypoints || []
      const hasMinimalTrip = waypoints.filter(wp => wp.location).length >= 2
      const tripPlanningResult = parseAndSetupTrip(userInput)
      
      if (tripPlanningResult.isTrip && !hasMinimalTrip) {
        console.log('🔧 Setting up basic trip structure')
        // Set up the basic trip structure only if we don't already have a decent trip
        if (tripPlanningResult.origin && tripPlanningResult.destination) {
          const updatedTrip = await setupBasicTrip(tripPlanningResult.origin, tripPlanningResult.destination)
          actionsPerformed.push(`Set up trip from ${tripPlanningResult.origin} to ${tripPlanningResult.destination}`)
          
          // Update our local references to use the updated trip data
          if (updatedTrip) {
            currentTrip = updatedTrip
            waypoints = updatedTrip.waypoints || []
          }
        }
      } else if (tripPlanningResult.isTrip && hasMinimalTrip) {
        console.log('🔧 Skipping trip setup - already have a trip with waypoints')
      }

      // Check if this is a multi-step trip planning request
      const isMultiStepTrip = userInput.toLowerCase().includes('plan') && 
                            (userInput.toLowerCase().includes('trip') || userInput.toLowerCase().includes('route')) &&
                            (userInput.toLowerCase().includes('days') || userInput.toLowerCase().includes('stops') || 
                             userInput.toLowerCase().includes('national parks') || userInput.toLowerCase().includes('cities'))
      
      // Generate AI response using Gemini with enhanced context
      const selectedLeg = state.selectedLeg
      const tripContext = {
        waypoints: waypoints.map(wp => ({
          location: wp.location,
          type: wp.type,
          notes: wp.notes,
          hasCoordinates: !!(wp.lat && wp.lng)
        })),
        currentLocation: null,
        totalWaypoints: waypoints.length,
        completedWaypoints: waypoints.filter(wp => wp.location).length,
        routeCalculated: !!(currentTrip?.route?.distance),
        totalDistance: currentTrip?.route?.distance ? Math.round(currentTrip.route.distance / 1000) + ' km' : null,
        totalDuration: currentTrip?.route?.duration ? Math.round(currentTrip.route.duration / 60) + ' min' : null,
        selectedLeg: selectedLeg,
        selectedLegInfo: selectedLeg !== null && currentTrip?.route?.legs ? {
          from: waypoints[selectedLeg]?.location,
          to: waypoints[selectedLeg + 1]?.location,
          distance: currentTrip.route.legs[selectedLeg]?.distance ? Math.round(currentTrip.route.legs[selectedLeg].distance / 1000) + ' km' : null,
          duration: currentTrip.route.legs[selectedLeg]?.duration ? Math.round(currentTrip.route.legs[selectedLeg].duration / 60) + ' min' : null
        } : null
      }
      
      // Include conversation history for context
      const recentMessages = messages.slice(-4).map(msg => `${msg.type}: ${msg.content}`).join('\n')
      
      const enhancedPrompt = `${userInput}

CONVERSATION CONTEXT:
${recentMessages}

CURRENT TRIP STATE:
- Waypoints: ${waypoints.map(wp => `${wp.type}: ${wp.location || 'empty'}`).join(', ')}
- Route: ${tripContext.routeCalculated ? `${tripContext.totalDistance}, ${tripContext.totalDuration}` : 'Not calculated'}
- Trip Status: ${waypoints.length === 0 ? 'No trip started' : waypoints.filter(wp => wp.location).length + ' stops planned'}
${selectedSegment ? `- FOCUSED SEGMENT: ${selectedSegment.from} → ${selectedSegment.to} (${selectedSegment.distance}, ${selectedSegment.duration})` : ''}
${tripContext.selectedLegInfo ? `- Selected Leg: ${tripContext.selectedLegInfo.from} → ${tripContext.selectedLegInfo.to} (${tripContext.selectedLegInfo.distance}, ${tripContext.selectedLegInfo.duration})` : ''}
${autoMode ? '- AUTO MODE ENABLED: Suggestions will be automatically added to the trip' : ''}

INSTRUCTIONS:
- Reference previous conversation when relevant
- Be aware of the current trip state
${selectedSegment ? `- When suggesting locations, they will be added AFTER ${selectedSegment.to} in the route` : ''}
- Provide specific, actionable recommendations
${isMultiStepTrip ? `- This is a multi-step trip planning request. Suggest a complete itinerary with multiple stops.` : ''}
${isMultiStepTrip ? `- For multi-day trips, suggest logical daily segments and overnight stops` : ''}
${isMultiStepTrip ? `- Include a mix of destinations based on the user's interests (national parks, cities, scenic routes, etc.)` : ''}
${isMultiStepTrip ? `- CRITICAL: You MUST suggest stops in EXACT GEOGRAPHICAL ORDER along the direct route from ${waypoints[0]?.location || 'start'} to ${waypoints[waypoints.length - 1]?.location || 'destination'}` : ''}
${isMultiStepTrip ? `- For example, if going from NY to LA, suggest stops like: Chicago, Denver, Las Vegas - NOT jumping around like Chicago, Las Vegas, Denver` : ''}
${isMultiStepTrip ? `- List destinations in the EXACT order they would be encountered when driving the most direct route` : ''}
- Keep responses concise but informative
- If suggesting locations, ${autoMode ? 'they will be auto-added' : 'provide 3-5 options'}
- ${autoMode ? 'Suggest up to 10 locations for complex trips IN ROUTE ORDER' : 'Use clickable buttons for location suggestions'}`
      
      const aiResponse = await generateTripResponse(enhancedPrompt, tripContext)
      
      // Extract location suggestions - use structured output if available, fallback to text parsing
      let suggestions = []
      const responseText = aiResponse.text || aiResponse
      
      if (aiResponse.structured && aiResponse.structured.suggestions) {
        suggestions = extractStructuredSuggestions(aiResponse.structured)
        console.log('✅ Using structured suggestions:', suggestions.length, 'found')
      } else {
        // Fallback to text extraction for natural conversation
        suggestions = extractLocationSuggestions(responseText)
        console.log('📝 Using text extraction fallback:', suggestions.length, 'found')
        console.log('Response type: Natural conversation')
      }
      const interactiveSuggestions = []
      const addedLocations = []
      
      // In auto mode or for multi-step trips, automatically add suggestions
      if ((autoMode || isMultiStepTrip) && suggestions.length > 0) {
        
        // For multi-step trips, temporarily disable smart positioning to maintain order
        const shouldMaintainOrder = isMultiStepTrip && waypoints.filter(wp => wp.location).length <= 2
        
        // Prepare suggestions for user selection (or auto-add in auto mode)
        for (let i = 0; i < suggestions.length && i < (autoMode ? 10 : 5); i++) {
          const suggestion = suggestions[i]
        try {
          const searchQuery = suggestion.location 
            ? `${suggestion.name} ${suggestion.location}`
            : suggestion.name
          
          const geoResults = await searchSuggestions(searchQuery, 1)
          
          if (geoResults.length > 0) {
            const place = geoResults[0]
            
            // Use structured data for route analysis if available, otherwise fallback to text analysis
            let isAlongRoute = suggestion.isAlongRoute
            if (isAlongRoute === undefined) {
              // Fallback to text analysis for legacy suggestions
              const lowerInput = userInput.toLowerCase()
              const lowerDescription = (suggestion.description || '').toLowerCase()
              isAlongRoute = 
                lowerInput.includes('along') || 
                lowerInput.includes('between') || 
                lowerInput.includes('on the way') ||
                lowerInput.includes('stop by') ||
                lowerInput.includes('detour') ||
                lowerDescription.includes('along') ||
                lowerDescription.includes('between')
            }
            
            const locationData = {
              name: place.display_name.split(',')[0],
              fullName: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lng || place.lon),
              address: place.display_name,
              description: suggestion.description || '',
              isAlongRoute: isAlongRoute,
              placement: isAlongRoute ? 'middle' : 'after'
            }
            
            // Auto-add in auto mode
            if (autoMode || isMultiStepTrip) {
              const waypointId = addWaypointToTrip({
                name: locationData.name,
                lat: locationData.lat,
                lng: locationData.lng,
                address: locationData.address,
                isAlongRoute: locationData.isAlongRoute,
                notes: locationData.description,
                maintainOrder: shouldMaintainOrder
              }, locationData.placement)
              
              if (waypointId) {
                addedLocations.push(locationData.name)
              }
            } else {
              interactiveSuggestions.push(locationData)
            }
          }
        } catch (error) {
          console.error('Error geocoding suggestion:', error)
        }
      }
      
        // Add confirmation of auto-added locations
        if (addedLocations.length > 0) {
          actionsPerformed.push(`Added ${addedLocations.length} stops to your trip: ${addedLocations.join(', ')}`)
        }
      }
      
      // Keep response concise and friendly
      let finalContent = aiResponse.text || aiResponse
      const allActions = [...actionsPerformed]
      
      if (allActions.length > 0) {
        finalContent += `\n\n✅ ${allActions.join(', ')}`
      }
      
      if (autoMode && interactiveSuggestions.length === 0 && addedLocations.length > 0) {
        finalContent += `\n\n🤖 Auto mode: I've automatically added these stops to your itinerary!`
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

  // Helper function to expand common city abbreviations
  const expandCityAbbreviation = (abbr) => {
    const abbreviations = {
      'NY': 'New York, NY',
      'NYC': 'New York, NY',
      'LA': 'Los Angeles, CA',
      'SF': 'San Francisco, CA',
      'CHI': 'Chicago, IL',
      'BOS': 'Boston, MA',
      'DC': 'Washington, DC',
      'SEA': 'Seattle, WA',
      'ATL': 'Atlanta, GA',
      'MIA': 'Miami, FL',
      'DAL': 'Dallas, TX',
      'HOU': 'Houston, TX',
      'PHX': 'Phoenix, AZ',
      'PHI': 'Philadelphia, PA',
      'SD': 'San Diego, CA',
      'DEN': 'Denver, CO',
      'LV': 'Las Vegas, NV',
      'PDX': 'Portland, OR',
      'NOLA': 'New Orleans, LA',
      'NSH': 'Nashville, TN'
    }
    
    const upperAbbr = abbr.toUpperCase()
    return abbreviations[upperAbbr] || abbr
  }

  // Parse trip planning patterns like "from X to Y" or "plan a trip from X to Y"
  const parseAndSetupTrip = (input) => {
    const waypoints = state.currentTrip?.waypoints || []
    
    // Pattern 1: "from X to Y" or "plan a trip from X to Y"
    // Updated regex to better capture abbreviations like NY, LA and multi-word destinations
    const fromToPattern = /(?:plan.*?trip.*?)?from\s+([A-Z]{2}|[^,\s]+(?:\s+[^,\s]+)*?)\s+to\s+([A-Z]{2}|[^,\s]+(?:\s+[^,\s]+)*?)(?:\s+(?:visiting|with|through|via|including|and|,|$))/i
    const fromToMatch = input.match(fromToPattern)
    
    if (fromToMatch) {
      return {
        isTrip: true,
        origin: expandCityAbbreviation(fromToMatch[1].trim()),
        destination: expandCityAbbreviation(fromToMatch[2].trim())
      }
    }
    
    // Fallback pattern for simple "from X to Y"
    const simpleFallbackPattern = /from\s+([^,]+?)\s+to\s+([^,]+?)(?:\s|$)/i
    const fallbackMatch = input.match(simpleFallbackPattern)
    
    if (fallbackMatch) {
      return {
        isTrip: true,
        origin: expandCityAbbreviation(fallbackMatch[1].trim()),
        destination: expandCityAbbreviation(fallbackMatch[2].trim())
      }
    }
    
    // Pattern 2: "trip to X" (assume current location or first waypoint as start)
    const tripToPattern = /trip\s+to\s+([^,!?.]+)/i
    const tripToMatch = input.match(tripToPattern)
    
    if (tripToMatch) {
      return {
        isTrip: true,
        origin: waypoints.length > 0 ? waypoints[0].location : null,
        destination: tripToMatch[1].trim()
      }
    }
    
    return { isTrip: false }
  }

  // Set up basic trip structure with start and end points
  const setupBasicTrip = async (origin, destination) => {
    console.log('🔧 Setting up basic trip:', { origin, destination })
    const currentTrip = state.currentTrip
    const waypoints = currentTrip?.waypoints || []
    console.log('🔧 Current waypoints before setup:', waypoints.length)
    
    if (!currentTrip) return null
    
    // Only clear waypoints if we don't have any meaningful waypoints yet
    const currentWaypoints = waypoints.filter(wp => wp.location && wp.location.trim())
    console.log('🔧 Existing waypoints with locations:', currentWaypoints.length)
    
    // If we already have waypoints, don't clear them - just return the current trip
    if (currentWaypoints.length > 0) {
      console.log('🔧 Skipping basic trip setup - already have waypoints')
      return currentTrip
    }
    
    const updatedWaypoints = []
    
    // Add origin as start point
    if (origin) {
      try {
        const originResults = await searchSuggestions(origin, 1)
        if (originResults.length > 0) {
          const place = originResults[0]
          updatedWaypoints.push({
            id: 'start-' + Date.now(),
            location: place.display_name.split(',')[0],
            type: 'start',
            date: '',
            time: '',
            notes: '',
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lng || place.lon),
            address: place.display_name
          })
        }
      } catch (error) {
        console.error('Error geocoding origin:', error)
      }
    }
    
    // Keep existing middle waypoints if any
    const existingWaypoints = currentWaypoints.filter(wp => wp.type === 'waypoint')
    updatedWaypoints.push(...existingWaypoints)
    
    // Add destination as end point
    if (destination) {
      try {
        const destResults = await searchSuggestions(destination, 1)
        if (destResults.length > 0) {
          const place = destResults[0]
          updatedWaypoints.push({
            id: 'end-' + Date.now(),
            location: place.display_name.split(',')[0],
            type: 'end',
            date: '',
            time: '',
            notes: '',
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lng || place.lon),
            address: place.display_name
          })
        }
      } catch (error) {
        console.error('Error geocoding destination:', error)
      }
    }
    
    // Update the trip
    const updatedTrip = {
      ...currentTrip,
      waypoints: updatedWaypoints,
      route: null,
      distance: null,
      duration: null,
      updated: new Date().toISOString()
    }
    
    setCurrentTrip(updatedTrip)
    
    // Trigger route calculation
    setTimeout(() => {
      if (updatedWaypoints.length >= 2) {
        const validWaypoints = updatedWaypoints.filter(wp => wp.lat && wp.lng)
        if (validWaypoints.length >= 2) {
          triggerRouteCalculation()
        }
      }
    }, 500)
    
    // Return the updated trip so the caller can use it immediately
    return updatedTrip
  }

  const performAgentAction = async (action) => {
    try {
      switch (action.type) {
        case 'remove':
          const removed = removeWaypointFromTrip(action.target)
          return removed 
            ? { success: true, message: `Removed "${action.target}" from trip` }
            : { success: false, message: `Could not find "${action.target}" to remove` }
        
        case 'addNote': {
          const waypoints = state.currentTrip?.waypoints || []
          if (action.target) {
            const updated = updateWaypointInTrip(action.target, { notes: action.note })
            return updated
              ? { success: true, message: `Added note to "${action.target}"` }
              : { success: false, message: `Could not find "${action.target}" to add note` }
          } else {
            // Add to the last waypoint with a location
            const lastWaypoint = waypoints.filter(wp => wp.location).pop()
            if (lastWaypoint) {
              updateWaypointInTrip(lastWaypoint.id, { notes: action.note })
              return { success: true, message: `Added note to ${lastWaypoint.location || 'destination'}` }
            }
          }
          return { success: false, message: 'Could not add note' }
        }
        
        case 'clearTrip': {
          const currentTrip = state.currentTrip
          if (currentTrip) {
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
          }
          return { success: false, message: 'No trip to clear' }
        }
        
        default:
          return { success: false, message: 'Unknown command' }
      }
    } catch (error) {
      console.error('Error performing agent action:', error)
      return { success: false, message: `Error: ${error.message}` }
    }
  }


  // Memoize keyboard handler to prevent unnecessary re-renders
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

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
        <span>✨</span>
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
          <span className={styles.headerIcon}>✨</span>
          <h3>AI Travel Assistant</h3>
          <span className={styles.agenticModeIndicator}>
            <Brain size={14} />
            <span>AI Agent</span>
            {isThinking && <span className={styles.thinkingIndicator}>💭</span>}
          </span>
          {selectedSegment && (
            <div className={styles.segmentIndicator}>
              <span>📍</span>
              <span>{selectedSegment.from} → {selectedSegment.to}</span>
              <button 
                className={styles.clearSegmentBtn}
                onClick={() => {
                  setSelectedSegment(null)
                  setSelectedLeg(null)
                }}
                title="Clear selection - talk about whole trip"
              >
                ❌
              </button>
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          {showClearHistory && (
            <>
              <button 
                onClick={downloadConversationHistory}
                className={styles.actionBtn}
                title="Download conversation history"
              >
                💾
              </button>
              <button 
                onClick={() => {
                  const confirmClear = window.confirm('Clear all conversation history? This cannot be undone.')
                  if (confirmClear) {
                    localStorage.removeItem('openroad-ai-conversation')
                    setMessages([{
                      id: Date.now(),
                      type: 'ai',
                      content: isGeminiAvailable() 
                        ? "Conversation history cleared! Let's start fresh. How can I help you plan your trip?"
                        : "Hi! I'm your AI travel assistant. Please enter your API key to get started.",
                      timestamp: new Date()
                    }])
                    setShowClearHistory(false)
                  }
                }}
                className={styles.actionBtn}
                title="Clear conversation history"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button 
            onClick={() => setShowClearHistory(!showClearHistory)}
            className={styles.actionBtn}
            title="Manage conversation history"
          >
            📋
          </button>
          {!isGeminiAvailable() ? (
            <button 
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={styles.actionBtn}
              title="Set API Key"
            >
              🔑
            </button>
          ) : (
            <button 
              onClick={handleClearApiKey}
              className={styles.actionBtn}
              title="Clear API Key"
            >
              🛑
            </button>
          )}
          <button 
            onClick={() => {
              setMessages([{
                id: Date.now(),
                type: 'ai',
                content: isGeminiAvailable() 
                  ? "Chat cleared! How can I help you plan your trip?"
                  : "Chat cleared. Please enter your API key to use AI features.",
                timestamp: new Date()
              }])
            }}
            className={styles.actionBtn}
            title="Clear chat"
          >
            🧹
          </button>
          <button 
            onClick={() => setIsMinimized(true)}
            className={styles.actionBtn}
            title="Close"
          >
            ❌
          </button>
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          className={styles.collapsibleContent}
        >
            <div className={styles.messagesContainer} ref={messagesContainerRef}>
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
                      <span>📍</span>
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
                            <span>📍</span>
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
                <span className={styles.spinner}>⏳</span>
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
              🔑
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
            onKeyDown={handleKeyDown}
            placeholder={
              !isGeminiAvailable() 
                ? "Set up your API key to use AI features..."
                : selectedSegment 
                  ? `Find stops along ${selectedSegment.from} → ${selectedSegment.to}...`
                  : "Ask me to find restaurants, attractions, or scenic stops..."
            }
            className={styles.input}
            disabled={isLoading || !isGeminiAvailable()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isGeminiAvailable()}
            className={styles.sendButton}
          >
            📤
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
      </AnimatePresence>
    </motion.div>
  )
})

// Display name for debugging
AIOverlay.displayName = 'AIOverlay'

export default AIOverlay