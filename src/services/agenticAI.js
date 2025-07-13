// Agentic AI Framework for OpenRoad Travel Assistant
// This creates a proactive, intelligent travel planning agent

import { generateTripResponse } from './gemini'
import { searchSuggestions } from './geocoding'
import { calculateRoute } from './routing'

/**
 * Action Types for the AI Agent
 */
export const ACTION_TYPES = {
  // Map Actions
  PLOT_LOCATION: 'plot_location',
  PLOT_ROUTE: 'plot_route',
  HIGHLIGHT_AREA: 'highlight_area',
  ADD_MARKERS: 'add_markers',
  
  // Trip Planning Actions
  CREATE_ITINERARY: 'create_itinerary',
  OPTIMIZE_ROUTE: 'optimize_route',
  ADD_WAYPOINT: 'add_waypoint',
  REMOVE_WAYPOINT: 'remove_waypoint',
  REORDER_WAYPOINTS: 'reorder_waypoints',
  
  // Discovery Actions
  SEARCH_ATTRACTIONS: 'search_attractions',
  FIND_ACCOMMODATIONS: 'find_accommodations',
  DISCOVER_RESTAURANTS: 'discover_restaurants',
  SUGGEST_ACTIVITIES: 'suggest_activities',
  
  // Analysis Actions
  ANALYZE_DISTANCE: 'analyze_distance',
  ESTIMATE_TIME: 'estimate_time',
  CALCULATE_COSTS: 'calculate_costs',
  CHECK_WEATHER: 'check_weather',
  
  // Proactive Actions
  SUGGEST_IMPROVEMENTS: 'suggest_improvements',
  NOTIFY_ALERTS: 'notify_alerts',
  PROVIDE_INSIGHTS: 'provide_insights'
}

/**
 * Travel Expert Knowledge Base
 */
export const TRAVEL_EXPERTISE = {
  regions: {
    'north_america': {
      seasons: {
        spring: 'March-May: Mild weather, blooming flowers, fewer crowds',
        summer: 'June-August: Peak season, warm weather, highest prices',
        fall: 'September-November: Beautiful foliage, comfortable temperatures',
        winter: 'December-February: Snow activities, lower prices, some closures'
      },
      specialties: ['national_parks', 'scenic_drives', 'road_trips', 'urban_exploration']
    },
    'europe': {
      seasons: {
        spring: 'April-June: Perfect weather, shoulder season pricing',
        summer: 'July-August: Peak tourist season, warm weather',
        fall: 'September-October: Harvest season, mild temperatures',
        winter: 'November-March: Christmas markets, skiing, indoor attractions'
      },
      specialties: ['historic_cities', 'cultural_tours', 'wine_regions', 'rail_travel']
    }
  },
  
  trip_types: {
    'road_trip': {
      optimal_distance_per_day: '200-400 miles',
      break_frequency: 'Every 2-3 hours',
      planning_tips: ['Plan scenic routes', 'Book accommodations in advance', 'Pack emergency kit']
    },
    'national_parks': {
      best_seasons: ['spring', 'fall'],
      booking_advice: 'Reserve camping/lodging 5-6 months ahead',
      packing_essentials: ['hiking_boots', 'layers', 'water', 'camera']
    },
    'city_break': {
      optimal_duration: '2-4 days',
      transportation: 'Public transit or walking',
      must_dos: ['local_food', 'historic_sites', 'neighborhoods', 'museums']
    }
  },
  
  poi_categories: {
    'natural': ['national_parks', 'state_parks', 'beaches', 'mountains', 'lakes', 'waterfalls'],
    'cultural': ['museums', 'galleries', 'theaters', 'historic_sites', 'monuments'],
    'entertainment': ['theme_parks', 'zoos', 'aquariums', 'sports_venues', 'nightlife'],
    'culinary': ['restaurants', 'food_markets', 'breweries', 'wineries', 'food_tours'],
    'adventure': ['hiking_trails', 'skiing', 'water_sports', 'rock_climbing', 'cycling']
  }
}

/**
 * Enhanced Agentic AI Class - The core intelligence system with proactive capabilities
 */
export class AgenticTravelAI {
  constructor(mapInstance, tripContext, onAction) {
    this.map = mapInstance
    this.tripContext = tripContext
    this.onAction = onAction
    this.actionHistory = []
    this.pendingActions = []
    this.expertise = TRAVEL_EXPERTISE
    this.isThinking = false
    this.userPreferences = this.loadUserPreferences()
    this.conversationContext = []
    this.proactiveTimer = null
    this.lastInteractionTime = Date.now()
    
    // Enhanced agent capabilities
    this.capabilities = {
      canPlotOnMap: true,
      canOptimizeRoutes: true,
      canSuggestAlternatives: true,
      canAnalyzePreferences: true,
      canProvideTiming: true,
      canEstimateCosts: true,
      canAccessRealTimeData: false, // TODO: Add weather/traffic APIs
      canLearnFromInteractions: true,
      canProvideProactiveSuggestions: true,
      canDetectUserIntent: true,
      canContextualizeRecommendations: true
    }

    // Start proactive monitoring
    this.startProactiveMonitoring()
  }

  /**
   * Load user preferences from localStorage
   */
  loadUserPreferences() {
    try {
      const stored = localStorage.getItem('openroad-user-preferences')
      return stored ? JSON.parse(stored) : {
        preferredTripTypes: [],
        favoriteCategories: [],
        budgetRange: null,
        travelStyle: null,
        lastInteractions: [],
        personalizedInterests: []
      }
    } catch (error) {
      console.error('Error loading user preferences:', error)
      return {
        preferredTripTypes: [],
        favoriteCategories: [],
        budgetRange: null,
        travelStyle: null,
        lastInteractions: [],
        personalizedInterests: []
      }
    }
  }

  /**
   * Save user preferences to localStorage
   */
  saveUserPreferences() {
    try {
      localStorage.setItem('openroad-user-preferences', JSON.stringify(this.userPreferences))
    } catch (error) {
      console.error('Error saving user preferences:', error)
    }
  }

  /**
   * Start proactive monitoring for intelligent suggestions
   */
  startProactiveMonitoring() {
    // Check for proactive opportunities every 30 seconds
    this.proactiveTimer = setInterval(() => {
      this.checkForProactiveOpportunities()
    }, 30000)
  }

  /**
   * Check for opportunities to provide proactive suggestions
   */
  async checkForProactiveOpportunities() {
    const timeSinceLastInteraction = Date.now() - this.lastInteractionTime
    const trip = this.tripContext.state.currentTrip
    
    // Don't be too aggressive - wait at least 2 minutes since last interaction
    if (timeSinceLastInteraction < 120000) return
    
    // Analyze current trip state for opportunities
    if (trip && trip.waypoints) {
      const validWaypoints = trip.waypoints.filter(wp => wp.location && wp.lat && wp.lng)
      
      // Suggest improvements for trips with 2+ waypoints
      if (validWaypoints.length >= 2) {
        await this.checkForRouteImprovements(validWaypoints)
      }
      
      // Suggest completion for incomplete trips
      if (validWaypoints.length === 1) {
        await this.suggestTripCompletion(validWaypoints[0])
      }
    }
  }

  /**
   * Analyze route for improvement opportunities
   */
  async checkForRouteImprovements(waypoints) {
    const route = this.tripContext.state.currentTrip?.route
    
    if (!route || waypoints.length < 2) return
    
    // Calculate route characteristics
    const totalDistance = route.distance || 0
    const estimatedDuration = route.duration || 0
    
    // Suggest attractions for long routes (>300km)
    if (totalDistance > 300000 && waypoints.length < 5) {
      this.triggerProactiveSuggestion({
        type: 'route_enhancement',
        message: `🎯 I noticed your ${Math.round(totalDistance/1000)}km route could use some interesting stops! Would you like me to suggest scenic attractions or dining spots along the way?`,
        action: 'suggest_attractions',
        confidence: 0.8
      })
    }
    
    // Suggest overnight stops for very long routes (>800km)
    if (totalDistance > 800000 && !this.hasOvernightStops(waypoints)) {
      this.triggerProactiveSuggestion({
        type: 'overnight_suggestion',
        message: `🛏️ This looks like a long journey (${Math.round(totalDistance/1000)}km)! I can suggest comfortable overnight stops to break up the drive. Want me to find some great places to rest?`,
        action: 'suggest_overnight',
        confidence: 0.9
      })
    }
  }

  /**
   * Check if trip has overnight stops based on notes or timing
   */
  hasOvernightStops(waypoints) {
    return waypoints.some(wp => 
      wp.notes && wp.notes.toLowerCase().includes('overnight') ||
      wp.notes && wp.notes.toLowerCase().includes('hotel') ||
      wp.notes && wp.notes.toLowerCase().includes('stay')
    )
  }

  /**
   * Trigger a proactive suggestion
   */
  triggerProactiveSuggestion(suggestion) {
    if (this.onAction) {
      this.onAction({
        type: 'PROACTIVE_SUGGESTION',
        suggestion,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Learn from user interactions to improve suggestions
   */
  learnFromInteraction(userInput, context, outcome) {
    this.lastInteractionTime = Date.now()
    
    // Extract and store user interests
    const interests = this.extractInterests(userInput)
    if (interests.length > 0) {
      this.userPreferences.personalizedInterests = [
        ...new Set([...this.userPreferences.personalizedInterests, ...interests])
      ].slice(-20) // Keep last 20 interests
    }

    // Store interaction pattern
    this.userPreferences.lastInteractions.push({
      input: userInput,
      interests: interests,
      timestamp: Date.now(),
      outcome: outcome
    })

    // Keep only last 10 interactions
    this.userPreferences.lastInteractions = this.userPreferences.lastInteractions.slice(-10)
    
    this.saveUserPreferences()
  }

  /**
   * Extract interests from user input
   */
  extractInterests(input) {
    const interests = []
    const lowerInput = input.toLowerCase()
    
    // Food interests
    if (lowerInput.includes('restaurant') || lowerInput.includes('food') || lowerInput.includes('dining')) {
      interests.push('dining')
    }
    
    // Nature interests
    if (lowerInput.includes('nature') || lowerInput.includes('park') || lowerInput.includes('hiking') || lowerInput.includes('scenic')) {
      interests.push('nature')
    }
    
    // Culture interests
    if (lowerInput.includes('museum') || lowerInput.includes('historic') || lowerInput.includes('culture') || lowerInput.includes('art')) {
      interests.push('culture')
    }
    
    // Entertainment interests
    if (lowerInput.includes('entertainment') || lowerInput.includes('fun') || lowerInput.includes('activity') || lowerInput.includes('attraction')) {
      interests.push('entertainment')
    }
    
    // Family interests
    if (lowerInput.includes('family') || lowerInput.includes('kids') || lowerInput.includes('children')) {
      interests.push('family-friendly')
    }
    
    return interests
  }

  /**
   * Enhanced thinking engine with personalization and context awareness
   */
  async think(userInput, conversationHistory = [], selectedSegment = null) {
    this.isThinking = true
    
    try {
      // Learn from this interaction
      this.learnFromInteraction(userInput, { conversationHistory, selectedSegment }, null)
      
      // Parse user intent with personalization
      const intent = this.parseIntent(userInput)
      
      // Analyze current trip state
      const tripAnalysis = this.analyzeTripState()
      
      // Add personalization context
      const personalizedContext = this.getPersonalizedContext(intent, tripAnalysis)
      
      // Generate expert response with enhanced personalization
      const response = await this.generateExpertResponse(
        userInput, 
        intent, 
        tripAnalysis, 
        conversationHistory, 
        selectedSegment,
        personalizedContext
      )
      
      // Execute planned actions
      await this.executeActions(response.actions)
      
      // Learn from the outcome
      this.learnFromInteraction(userInput, { conversationHistory, selectedSegment }, response)
      
      this.isThinking = false
      return response
      
    } catch (error) {
      this.isThinking = false
      console.error('AI thinking error:', error)
      return {
        text: "I'm having trouble processing that request. Let me try a different approach with some personalized suggestions based on your interests.",
        actions: [],
        confidence: 0.1
      }
    }
  }

  /**
   * Get personalized context based on user preferences and history
   */
  getPersonalizedContext(intent, tripAnalysis) {
    const context = {
      userInterests: this.userPreferences.personalizedInterests,
      preferredCategories: this.userPreferences.favoriteCategories,
      recentPatterns: this.analyzeRecentPatterns(),
      personalizedRecommendations: this.generatePersonalizedRecommendations(intent),
      contextualAdjustments: this.getContextualAdjustments(tripAnalysis)
    }
    
    return context
  }

  /**
   * Analyze recent interaction patterns
   */
  analyzeRecentPatterns() {
    const recent = this.userPreferences.lastInteractions.slice(-5)
    const patterns = {
      commonInterests: [],
      preferredTimeOfDay: null,
      frequentRequestTypes: [],
      averageSessionLength: 0
    }
    
    // Find common interests across recent interactions
    const allInterests = recent.flatMap(interaction => interaction.interests || [])
    const interestCounts = {}
    allInterests.forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1
    })
    
    patterns.commonInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([interest]) => interest)
    
    return patterns
  }

  /**
   * Generate personalized recommendations based on user intent and preferences
   */
  generatePersonalizedRecommendations(intent) {
    const recommendations = []
    
    // If user has shown interest in dining, prioritize food suggestions
    if (this.userPreferences.personalizedInterests.includes('dining')) {
      recommendations.push({
        type: 'priority_category',
        category: 'restaurants',
        reason: 'Based on your interest in dining experiences'
      })
    }
    
    // If user likes nature, suggest scenic routes
    if (this.userPreferences.personalizedInterests.includes('nature')) {
      recommendations.push({
        type: 'route_preference',
        preference: 'scenic',
        reason: 'Based on your love for nature and outdoor experiences'
      })
    }
    
    // If user has family interests, suggest family-friendly options
    if (this.userPreferences.personalizedInterests.includes('family-friendly')) {
      recommendations.push({
        type: 'filter_preference',
        filter: 'family-friendly',
        reason: 'Based on your family travel preferences'
      })
    }
    
    return recommendations
  }

  /**
   * Get contextual adjustments based on trip analysis
   */
  getContextualAdjustments(tripAnalysis) {
    const adjustments = []
    
    // Adjust suggestions based on trip length
    if (tripAnalysis.tripLength > 500000) { // >500km
      adjustments.push({
        type: 'suggestion_density',
        value: 'high',
        reason: 'Long trip detected - suggesting more stops'
      })
    }
    
    // Adjust based on time of year (season-aware suggestions)
    const season = this.getCurrentSeason()
    adjustments.push({
      type: 'seasonal_adjustment',
      season: season,
      reason: `Tailoring suggestions for ${season} travel`
    })
    
    return adjustments
  }

  /**
   * Parse user intent from natural language
   */
  parseIntent(input) {
    const lowerInput = input.toLowerCase()
    
    const intents = {
      plan_trip: /plan.*trip|create.*itinerary|help.*plan|make.*trip|trip.*from.*to/i.test(input),
      find_places: /find|search|look for|show me/i.test(input),
      optimize_route: /optimize|improve|better route|shorter/i.test(input),
      get_directions: /directions|how to get|route to/i.test(input),
      discover: /discover|explore|what.*see|recommendations/i.test(input),
      modify_trip: /add|remove|change|modify|update/i.test(input),
      get_info: /tell me|what.*is|how.*much|when.*best/i.test(input),
      visualize: /show.*map|plot|mark|highlight/i.test(input)
    }

    // Determine primary intent
    const primaryIntent = Object.keys(intents).find(intent => intents[intent]) || 'general_query'
    
    // Extract entities (locations, dates, preferences)
    const entities = this.extractEntities(input)
    
    return {
      primary: primaryIntent,
      entities,
      confidence: this.calculateIntentConfidence(input, primaryIntent),
      requiresMapAction: ['plan_trip', 'find_places', 'visualize', 'get_directions'].includes(primaryIntent),
      originalInput: input
    }
  }

  /**
   * Extract structured entities from user input
   */
  extractEntities(input) {
    const entities = {
      locations: [],
      dates: [],
      preferences: [],
      trip_type: null,
      duration: null,
      budget: null
    }

    // Location patterns - enhanced to catch abbreviations
    const locationPatterns = [
      // "from X to Y" - catches abbreviations like NY, LA
      /from\s+([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)\s+to\s+([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)/gi,
      /in\s+([A-Z][a-zA-Z\s,]+?)(?:\s|,|$)/gi,
      /visit\s+([A-Z][a-zA-Z\s,]+?)(?:\s|,|$)/gi,
      // Common abbreviations
      /\b(NY|NYC|LA|SF|CHI|DC|SEA|ATL|MIA|DAL|HOU|PHX)\b/gi
    ]

    locationPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(input)) !== null) {
        if (match.slice) {
          entities.locations.push(...match.slice(1).map(loc => loc.trim()))
        } else {
          entities.locations.push(match[0].trim())
        }
      }
    })

    // Date/duration patterns
    const durationMatch = input.match(/(\d+)[-\s]?day|(\d+)[-\s]?week|(\d+)[-\s]?month/i)
    if (durationMatch) {
      entities.duration = durationMatch[0]
    }

    // Trip type patterns
    const tripTypes = ['road trip', 'national parks', 'city break', 'beach', 'mountains', 'adventure', 'cultural', 'food tour']
    entities.trip_type = tripTypes.find(type => input.toLowerCase().includes(type))

    // Preference patterns
    const preferences = ['budget', 'luxury', 'family', 'romantic', 'adventure', 'relaxing', 'historic', 'modern']
    entities.preferences = preferences.filter(pref => input.toLowerCase().includes(pref))

    return entities
  }

  /**
   * Analyze current trip state and context
   */
  analyzeTripState() {
    const trip = this.tripContext.state.currentTrip
    const waypoints = trip?.waypoints || []
    
    return {
      hasTrip: !!trip,
      waypointCount: waypoints.length,
      filledWaypoints: waypoints.filter(wp => wp.location).length,
      hasRoute: !!(trip?.route?.distance),
      tripLength: trip?.route?.distance || 0,
      estimatedDuration: trip?.route?.duration || 0,
      isEmpty: waypoints.length === 0 || waypoints.filter(wp => wp.location).length === 0,
      isComplete: waypoints.length >= 2 && waypoints.every(wp => wp.location),
      needsOptimization: waypoints.length > 3,
      currentMapView: this.map ? {
        center: this.map.getCenter(),
        zoom: this.map.getZoom()
      } : null
    }
  }

  /**
   * Generate expert travel response with enhanced personalization
   */
  async generateExpertResponse(userInput, intent, tripAnalysis, conversationHistory, selectedSegment = null, personalizedContext = null) {
    // Create enhanced expert system prompt with personalization
    const expertPrompt = this.buildEnhancedExpertPrompt(
      userInput, 
      intent, 
      tripAnalysis, 
      conversationHistory, 
      selectedSegment,
      personalizedContext
    )
    
    // Get AI response with structured actions
    const aiResponse = await generateTripResponse(expertPrompt)
    
    // Parse and plan actions with personalization
    const actions = this.planPersonalizedActions(intent, tripAnalysis, aiResponse, personalizedContext)
    
    // Add intelligent proactive suggestions
    const proactiveActions = this.generateIntelligentProactiveActions(intent, tripAnalysis, personalizedContext)
    
    return {
      text: aiResponse.text || aiResponse,
      actions: [...actions, ...proactiveActions],
      confidence: this.calculateResponseConfidence(intent, tripAnalysis),
      intent: intent.primary,
      mapUpdates: this.planMapUpdates(actions),
      personalization: personalizedContext,
      learningData: this.extractLearningData(userInput, aiResponse)
    }
  }

  /**
   * Build enhanced expert system prompt with personalization
   */
  buildEnhancedExpertPrompt(userInput, intent, tripAnalysis, conversationHistory, selectedSegment = null, personalizedContext = null) {
    const currentSeason = this.getCurrentSeason()
    const travelTips = this.getContextualTravelTips(intent, tripAnalysis)
    const userInterests = personalizedContext?.userInterests || []
    const recentPatterns = personalizedContext?.recentPatterns || {}
    
    return `You are OpenRoad's Enhanced AI Travel Agent - I create personalized trip experiences!

🌍 MY ENHANCED CAPABILITIES:
- Intelligent personalized trip planning based on user preferences
- Smart waypoint suggestions with interest-based filtering
- Proactive route optimization and experience enhancement
- Context-aware recommendations with seasonal adjustments
- Learning from user interactions for better future suggestions

🧭 CURRENT CONTEXT:
- Season: ${currentSeason}
- Trip State: ${tripAnalysis.hasTrip ? `${tripAnalysis.filledWaypoints}/${tripAnalysis.waypointCount} waypoints planned` : 'No active trip'}
- Route Status: ${tripAnalysis.hasRoute ? `${Math.round(tripAnalysis.tripLength/1000)}km planned` : 'No route calculated'}
- User Intent: ${intent.primary}${selectedSegment ? `\n- Selected Route Segment: ${selectedSegment.from} → ${selectedSegment.to}` : ''}

🎯 PERSONALIZATION INSIGHTS:
${userInterests.length > 0 ? `- User Interests: ${userInterests.join(', ')}` : '- Learning user preferences...'}
${recentPatterns.commonInterests?.length > 0 ? `- Recent Focus: ${recentPatterns.commonInterests.join(', ')}` : ''}
${personalizedContext?.personalizedRecommendations?.length > 0 ? `- Smart Recommendations: ${personalizedContext.personalizedRecommendations.map(r => r.reason).join('; ')}` : ''}

🎯 ENHANCED INSTRUCTIONS:
1. **Personalized Suggestions** - Prioritize recommendations based on user's demonstrated interests
2. **Smart Contextual Awareness** - Consider trip length, season, and time of day for optimal suggestions
3. **Proactive Enhancement** - Suggest improvements before users ask (route optimization, timing, stops)
4. **Interest-Based Filtering** - Focus on categories the user has shown preference for
5. **Seasonal Intelligence** - Adjust recommendations for current season and weather considerations
6. **Learning Integration** - Build on previous conversations and successful suggestions

💡 INTELLIGENT FEATURES:
- Every location suggestion is automatically plotted and can be added to the trip
- Smart categorization based on user interest patterns
- Proactive suggestions for route improvements and travel timing
- Context-aware recommendations that consider trip characteristics
- Personalized experiences that evolve with user preferences

USER REQUEST: "${userInput}"

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map(msg => `${msg.type}: ${msg.content}`).join('\\n')}

Create an amazing, personalized trip experience with intelligent suggestions tailored to this user's interests and travel style!`
  }

  /**
   * Plan personalized actions based on user preferences
   */
  planPersonalizedActions(intent, tripAnalysis, aiResponse, personalizedContext) {
    const actions = this.planActions(intent, tripAnalysis, aiResponse)
    
    // Enhance actions with personalization
    if (personalizedContext && personalizedContext.personalizedRecommendations) {
      personalizedContext.personalizedRecommendations.forEach(rec => {
        if (rec.type === 'priority_category') {
          // Modify existing actions to prioritize preferred categories
          actions.forEach(action => {
            if (action.type === ACTION_TYPES.SEARCH_ATTRACTIONS) {
              action.priorityCategory = rec.category
              action.personalizationReason = rec.reason
            }
          })
        }
      })
    }
    
    return actions
  }

  /**
   * Generate intelligent proactive suggestions
   */
  generateIntelligentProactiveActions(intent, tripAnalysis, personalizedContext) {
    const proactiveActions = this.generateProactiveActions(intent, tripAnalysis)
    
    // Add personalized proactive suggestions
    if (personalizedContext && personalizedContext.userInterests.length > 0) {
      const interests = personalizedContext.userInterests
      
      // Suggest interest-specific stops for routes with few waypoints
      if (tripAnalysis.hasRoute && tripAnalysis.waypointCount < 4) {
        if (interests.includes('dining')) {
          proactiveActions.push({
            type: ACTION_TYPES.SUGGEST_ACTIVITIES,
            category: 'restaurants',
            priority: 'medium',
            personalization: 'Based on your dining interests'
          })
        }
        
        if (interests.includes('nature')) {
          proactiveActions.push({
            type: ACTION_TYPES.SUGGEST_ACTIVITIES,
            category: 'scenic_spots',
            priority: 'medium',
            personalization: 'Based on your love for nature'
          })
        }
      }
    }
    
    return proactiveActions
  }

  /**
   * Extract learning data from interactions
   */
  extractLearningData(userInput, aiResponse) {
    return {
      inputComplexity: userInput.split(' ').length,
      responseRelevance: aiResponse ? 0.8 : 0.2,
      suggestedLocations: this.extractLocationsFromText(aiResponse.text || aiResponse).length,
      timestamp: Date.now()
    }
  }

  /**
   * Build comprehensive expert system prompt
   */
  buildExpertPrompt(userInput, intent, tripAnalysis, conversationHistory, selectedSegment = null) {
    const currentSeason = this.getCurrentSeason()
    const travelTips = this.getContextualTravelTips(intent, tripAnalysis)
    
    return `You are OpenRoad's AI Travel Agent - I automatically plan trips and add waypoints to the user's itinerary!

🌍 MY CAPABILITIES:
- Automatically create complete trip itineraries with waypoints
- Plot all suggestions on the map with animations  
- Add every location I suggest directly to the trip planner
- Provide expert travel timing and route optimization

🧭 CURRENT CONTEXT:
- Season: ${currentSeason}
- Trip State: ${tripAnalysis.hasTrip ? `${tripAnalysis.filledWaypoints}/${tripAnalysis.waypointCount} waypoints planned` : 'No active trip'}
- Route Status: ${tripAnalysis.hasRoute ? `${Math.round(tripAnalysis.tripLength/1000)}km planned` : 'No route calculated'}
- User Intent: ${intent.primary}${selectedSegment ? `\n- Selected Route Segment: ${selectedSegment.from} → ${selectedSegment.to} (${selectedSegment.distance ? Math.round(selectedSegment.distance/1000) + 'km' : ''})` : ''}

🎯 CRITICAL INSTRUCTIONS:
1. **ALWAYS suggest specific locations** - every location you mention will be automatically added to their trip
2. **Be specific with names** - use exact names like "Grand Canyon National Park" not just "Grand Canyon"
3. **Include variety** - mix national parks, cities, scenic stops, and interesting attractions
4. **Consider route order** - suggest locations in logical geographical sequence
5. **Provide context** - briefly explain why each location is worth visiting${selectedSegment ? `\n6. **ROUTE CONTEXT** - User clicked on route segment from ${selectedSegment.from} to ${selectedSegment.to}. Focus suggestions NEAR THIS SPECIFIC ROUTE SEGMENT, not far away locations!` : ''}

💡 AUTO-MAGIC FEATURES:
- Every location I mention gets plotted on the map with animations
- All suggested stops are automatically added to their itinerary  
- Users see real-time updates as I build their trip
- I focus on creating actionable, complete trip plans

USER REQUEST: "${userInput}"

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map(msg => `${msg.type}: ${msg.content}`).join('\\n')}

Create an amazing trip plan with specific, actionable location suggestions that will automatically become their itinerary!`
  }

  /**
   * Plan specific actions based on intent and context
   */
  planActions(intent, tripAnalysis, aiResponse) {
    const actions = []
    
    // Extract locations from AI response text for automatic plotting
    const locationsFromResponse = this.extractLocationsFromText(aiResponse.text || aiResponse)
    
    // Detect start/end points from user input for trip planning
    const startEndPoints = this.extractStartEndPoints(intent.originalInput || '')
    
    // Map visualization actions
    if (intent.requiresMapAction || locationsFromResponse.length > 0) {
      // Combine and organize locations
      let allLocations = [...locationsFromResponse]
      
      // Add start/end points if they're not already in the list
      if (startEndPoints.start && !allLocations.some(loc => 
        loc.toLowerCase().includes(startEndPoints.start.toLowerCase()) || 
        startEndPoints.start.toLowerCase().includes(loc.toLowerCase())
      )) {
        allLocations.unshift(startEndPoints.start)
      }
      
      if (startEndPoints.end && !allLocations.some(loc => 
        loc.toLowerCase().includes(startEndPoints.end.toLowerCase()) || 
        startEndPoints.end.toLowerCase().includes(loc.toLowerCase())
      )) {
        allLocations.push(startEndPoints.end)
      }
      
      if (allLocations.length > 0) {
        actions.push({
          type: ACTION_TYPES.PLOT_LOCATION,
          locations: allLocations,
          priority: 'high',
          startPoint: startEndPoints.start,
          endPoint: startEndPoints.end
        })
      }
      
      if (intent.primary === 'plan_trip' && !tripAnalysis.hasRoute) {
        actions.push({
          type: ACTION_TYPES.CREATE_ITINERARY,
          entities: intent.entities,
          priority: 'high'
        })
      }
      
      if (intent.primary === 'optimize_route' && tripAnalysis.hasRoute) {
        actions.push({
          type: ACTION_TYPES.OPTIMIZE_ROUTE,
          currentRoute: tripAnalysis,
          priority: 'medium'
        })
      }
    }

    // Discovery actions
    if (intent.primary === 'find_places' || intent.primary === 'discover') {
      actions.push({
        type: ACTION_TYPES.SEARCH_ATTRACTIONS,
        criteria: intent.entities,
        priority: 'medium'
      })
    }

    // Auto-plot for trip planning responses
    if (intent.primary === 'plan_trip' && locationsFromResponse.length > 0) {
      actions.push({
        type: ACTION_TYPES.HIGHLIGHT_AREA,
        locations: locationsFromResponse,
        priority: 'medium'
      })
    }

    return actions
  }

  /**
   * Extract location names from AI response text with improved precision
   */
  extractLocationsFromText(text) {
    if (!text) return []
    
    const locations = []
    
    // Very precise patterns - only match obvious location names
    const locationPatterns = [
      // Pattern 1: **LocationName** (bold markdown locations)
      /\*\*([A-Z][a-zA-Z\s]{3,30}(?:National Park|State Park|Monument|Wilderness|Historic Site|Memorial))\*\*/gi,
      
      // Pattern 2: National parks in natural text
      /(?:^|\.|!|\?)\s*([A-Z][a-zA-Z\s]{3,25}National Park)(?:[.,!?]|\s|$)/gm,
      
      // Pattern 3: Cities with state codes in bold
      /\*\*([A-Z][a-zA-Z\s]{2,20},\s*[A-Z]{2})\*\*/gi,
      
      // Pattern 4: Cities with state codes in natural text
      /(?:\s|^|\()([A-Z][a-zA-Z\s]{2,20},\s*[A-Z]{2})(?:[.,!?)]|\s|$)/gm,
      
      // Pattern 5: Well-known landmarks and destinations
      /\b(Grand Canyon|Mount Rushmore|Yellowstone|Yosemite|Zion|Bryce Canyon|Arches|Death Valley|Sequoia|Kings Canyon|Rocky Mountain|Great Smoky Mountains|Glacier|Everglades|Acadia|Olympic|Badlands|Capitol Reef|Mesa Verde|Carlsbad Caverns|Hot Springs|Mammoth Cave|Shenandoah|Great Sand Dunes|Black Canyon|Congaree|Dry Tortugas|Haleakala|Hawaii Volcanoes|Joshua Tree|Katmai|Kenai Fjords|Kobuk Valley|Lake Clark|Lassen Volcanic|North Cascades|Petrified Forest|Pinnacles|Redwood|Saguaro|Theodore Roosevelt|Virgin Islands|Voyageurs|Wind Cave)(?:\s+National\s+Park)?\b/gi,
      
      // Pattern 6: Major cities (only well-known ones)
      /\b(New York City|Los Angeles|San Francisco|Chicago|Las Vegas|Miami|Boston|Seattle|Denver|Phoenix|Atlanta|Dallas|Houston|Philadelphia|Detroit|Minneapolis|Portland|San Diego|Nashville|Austin|Charlotte|Columbus|Indianapolis|Jacksonville|Memphis|Baltimore|Milwaukee|Washington|Kansas City|Oklahoma City|Louisville|Virginia Beach|Tucson|Fresno|Sacramento|Long Beach|Mesa|Colorado Springs|Raleigh|Omaha|Tampa|Pittsburgh|Cincinnati|Cleveland|Wichita|Arlington|Bakersfield|New Orleans|Honolulu|Anaheim|Santa Ana|Riverside|Corpus Christi|Lexington|Stockton|Henderson|Saint Paul|St\. Paul|Newark|Buffalo|Plano|Lincoln|Greensboro|Chandler|Chula Vista|Norfolk|Orlando|Laredo|Madison|Lubbock|Baton Rouge|Reno|Akron|Hialeah|Chesapeake|Garland|Scottsdale|North Las Vegas|Irving|Fremont|Irvine|Birmingham|Rochester|San Bernardino|Spokane|Gilbert|Arlington|Montgomery|Boise|Richmond|Des Moines|Modesto|Fayetteville|Shreveport|Glendale|Tacoma|Augusta|Mobile|Little Rock|Amarillo|Moreno Valley|Fontana|Oxnard|Knoxville|Fort Lauderdale|Salt Lake City|Huntington Beach|Grand Rapids|Newport News|Worcester|Brownsville|Santa Clarita|Providence|Grand Prairie|Oceanside|Santa Rosa|Chattanooga|Springfield|Salem|Fort Wayne|Dayton|Lakewood|Eugene|Pomona|Corona|Alexandria|Joliet|Pembroke Pines|Paterson|Torrance|Bridgeport|Hayward|Lakewood|Hollywood|Sunnyvale|Pasadena|Killeen|Kansas City|Rockford|Escondido|Naperville|Bellevue|Syracuse|Mesquite|Savannah|Fullerton|McAllen|Columbia|Cedar Rapids|Sterling Heights|Sioux Falls|Concord|Kent|Coral Springs|Elizabeth|Carrollton|Topeka|Thousand Oaks|Simi Valley|Visalia|Roseville|Thornton|Gainesville|Cape Coral|Westminster|Santa Clara|Olathe|Stamford|Flint|Peoria|Evansville|Vancouver|Calgary|Toronto|Montreal|Ottawa|Edmonton|Winnipeg|Quebec City|Hamilton|Kitchener|London|Victoria|Halifax|Saskatoon|Regina|St\. John\'s|Whitehorse|Yellowknife|Iqaluit)\b/gi
    ]
    
    locationPatterns.forEach((pattern, index) => {
      const regex = new RegExp(pattern.source, pattern.flags)
      let match
      while ((match = regex.exec(text)) !== null) {
        let location = match[1] ? match[1].trim() : match[0].trim()
        
        // Clean up the location string
        location = location.replace(/^[.,!?\s*]+|[.,!?\s*]+$/g, '') // Remove leading/trailing punctuation
        location = location.replace(/\s+/g, ' ') // Normalize whitespace
        location = location.replace(/^\*\*|\*\*$/g, '') // Remove markdown bold
        
        // Strict filtering - only accept clearly valid locations
        if (location.length >= 3 && 
            location.length <= 60 && // Reasonable length
            !location.match(/^(Day|Days|Phase|The|And|Or|But|In|At|On|For|With|By|We|You|I|This|That|What|How|Why|When|Where|ll|re|ve|d|s|t|m|to|of|from|into|onto|upon|over|under|through|during|before|after|above|below|up|down|out|off|away|back|here|there|where|now|then|today|tomorrow|yesterday)$/i) &&
            !location.match(/^(seriously|epic|road|trip|fantastic|starting|point|better|idea|ideal|prefer|bustling|cities|various|points|added|map|stunning|ready|refine|route|based|answers|above|specific|hidden|gems|suggest|hotels|restaurants|number|vibrant|city|beautiful|amazing|incredible|wonderful|perfect|excellent|great|good|best|better|worse|worst|large|small|big|little|new|old|young|high|low|long|short|wide|narrow|thick|thin|heavy|light|fast|slow|hot|cold|warm|cool|dry|wet|clean|dirty|easy|hard|simple|complex|early|late|first|last|next|previous|other|another|same|different|similar|various|several|many|few|all|some|any|no|none|every|each|both|either|neither|more|most|less|least|much|little|enough|too|very|quite|rather|pretty|fairly|extremely|incredibly|absolutely|completely|totally|entirely|fully|partly|mostly|nearly|almost|hardly|barely|just|only|even|still|yet|already|soon|later|earlier|finally|eventually|immediately|suddenly|quickly|slowly|carefully|gently|quietly|loudly|clearly|obviously|apparently|probably|possibly|certainly|definitely|surely|perhaps|maybe|likely|unlikely|fortunately|unfortunately|hopefully|surprisingly|interestingly|importantly|basically|generally|specifically|particularly|especially|mainly|mostly|partly|slightly|somewhat|rather|quite|very|extremely|incredibly)$/i) &&
            !location.match(/\b(from|to|in|at|on|for|with|by|of|about|through|during|before|after|above|below|up|down|out|off|away|back|here|there|where|when|how|why|what|who|which|that|this|these|those|all|some|any|many|few|several|other|another|same|different|new|old|good|bad|best|worst|first|last|next|big|small|long|short|high|low|hot|cold|fast|slow)\s+(to|from|in|at|on|for|with|by|of)\b/i) && // Avoid phrases with prepositions
            !location.match(/\s+(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|can|must)\s/i) && // Avoid verb phrases
            !locations.some(loc => 
              loc.toLowerCase() === location.toLowerCase() || 
              loc.toLowerCase().includes(location.toLowerCase()) ||
              location.toLowerCase().includes(loc.toLowerCase())
            )) {
          locations.push(location)
          console.log(`✅ Extracted location (pattern ${index + 1}): "${location}"`)
        } else {
          console.log(`❌ Filtered out (pattern ${index + 1}): "${location}" - ${location.length < 3 ? 'too short' : location.length > 60 ? 'too long' : 'failed content filter'}`)
        }
      }
    })
    
    // Final cleanup and validation
    const cleanedLocations = locations
      .filter((location, index, self) => 
        self.findIndex(loc => loc.toLowerCase() === location.toLowerCase()) === index
      )
      .filter(location => {
        // Additional validation
        const words = location.split(' ')
        const isValidLength = words.length <= 8 && words.every(word => word.length <= 20)
        const hasCapitalLetter = /[A-Z]/.test(location)
        const isNotAllCaps = location !== location.toUpperCase() || location.split(' ').length === 1
        const containsLetter = /[a-zA-Z]/.test(location)
        
        return isValidLength && hasCapitalLetter && isNotAllCaps && containsLetter
      })
      .slice(0, 12) // Max 12 locations to avoid overwhelming
    
    console.log(`🗺️ Final extracted locations (${cleanedLocations.length}):`, cleanedLocations)
    return cleanedLocations
  }

  /**
   * Extract start and end points from user trip planning requests
   */
  extractStartEndPoints(userInput) {
    const startEndPoints = { start: null, end: null }
    
    // Patterns for "from X to Y" trip planning
    const patterns = [
      // "from X to Y" with cities/states
      /from\s+([A-Z][a-zA-Z\s,]+?(?:,\s*[A-Z]{2}|,\s*BC|,\s*AB)?)\s+to\s+([A-Z][a-zA-Z\s,]+?(?:,\s*[A-Z]{2}|,\s*BC|,\s*AB)?)(?:\s|[.,!]|$)/i,
      
      // "from X to Y" with abbreviations
      /from\s+([A-Z]{2,}(?:\s+[A-Z]+)*)\s+to\s+([A-Z]{2,}(?:\s+[A-Z]+)*)(?:\s|[.,!]|$)/i,
      
      // "trip from X to Y"
      /trip\s+from\s+([A-Z][a-zA-Z\s,]+?)\s+to\s+([A-Z][a-zA-Z\s,]+?)(?:\s|[.,!]|$)/i
    ]
    
    for (const pattern of patterns) {
      const match = userInput.match(pattern)
      if (match) {
        startEndPoints.start = match[1].trim()
        startEndPoints.end = match[2].trim()
        
        // Expand common abbreviations
        if (startEndPoints.start.length <= 3) {
          startEndPoints.start = this.expandLocationAbbreviation(startEndPoints.start)
        }
        if (startEndPoints.end.length <= 3) {
          startEndPoints.end = this.expandLocationAbbreviation(startEndPoints.end)
        }
        
        console.log('🗺️ Detected trip:', startEndPoints.start, '→', startEndPoints.end)
        break
      }
    }
    
    return startEndPoints
  }

  /**
   * Expand location abbreviations
   */
  expandLocationAbbreviation(abbr) {
    const expansions = {
      'NY': 'New York',
      'BC': 'Vancouver, BC', 
      'LA': 'Los Angeles, CA',
      'SF': 'San Francisco, CA',
      'NYC': 'New York City',
      'CHI': 'Chicago, IL',
      'DC': 'Washington, DC',
      'CA': 'California',
      'TX': 'Texas',
      'FL': 'Florida',
      'IL': 'Chicago, IL',
      'WA': 'Seattle, WA',
      'OR': 'Portland, OR',
      'CO': 'Denver, CO',
      'NV': 'Las Vegas, NV',
      'AZ': 'Phoenix, AZ',
      'UT': 'Salt Lake City, UT',
      'AB': 'Calgary, AB',
      'ON': 'Toronto, ON',
      'QC': 'Montreal, QC'
    }
    
    return expansions[abbr.toUpperCase()] || abbr
  }

  /**
   * Generate proactive suggestions
   */
  generateProactiveActions(intent, tripAnalysis) {
    const proactiveActions = []
    
    // Suggest route optimization for complex trips
    if (tripAnalysis.waypointCount > 3 && !tripAnalysis.needsOptimization) {
      proactiveActions.push({
        type: ACTION_TYPES.SUGGEST_IMPROVEMENTS,
        suggestion: 'route_optimization',
        priority: 'low'
      })
    }
    
    // Suggest nearby attractions for incomplete trips
    if (tripAnalysis.hasRoute && tripAnalysis.waypointCount < 5) {
      proactiveActions.push({
        type: ACTION_TYPES.SUGGEST_ACTIVITIES,
        context: 'route_enhancement',
        priority: 'low'
      })
    }
    
    return proactiveActions
  }

  /**
   * Execute planned actions
   */
  async executeActions(actions) {
    for (const action of actions) {
      try {
        await this.executeAction(action)
        this.actionHistory.push({
          ...action,
          executedAt: new Date(),
          status: 'completed'
        })
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error)
        this.actionHistory.push({
          ...action,
          executedAt: new Date(),
          status: 'failed',
          error: error.message
        })
      }
    }
  }

  /**
   * Execute individual action
   */
  async executeAction(action) {
    if (this.onAction) {
      await this.onAction(action)
    }
    
    switch (action.type) {
      case ACTION_TYPES.PLOT_LOCATION:
        return this.plotLocations(action.locations)
      case ACTION_TYPES.CREATE_ITINERARY:
        return this.createItinerary(action.entities)
      case ACTION_TYPES.OPTIMIZE_ROUTE:
        return this.optimizeRoute(action.currentRoute)
      default:
        console.log(`Action ${action.type} queued for execution`)
    }
  }

  /**
   * Plot locations on map
   */
  async plotLocations(locations) {
    if (!this.map || !locations.length) return
    
    const plotData = []
    
    for (const location of locations) {
      try {
        const results = await searchSuggestions(location, 1)
        if (results.length > 0) {
          const place = results[0]
          plotData.push({
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lng || place.lon),
            name: location,
            address: place.display_name
          })
        }
      } catch (error) {
        console.error(`Failed to geocode ${location}:`, error)
      }
    }
    
    return plotData
  }

  /**
   * Helper methods
   */
  getCurrentSeason() {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  calculateIntentConfidence(input, intent) {
    // Simple confidence scoring based on keyword matches
    const intentKeywords = {
      plan_trip: ['plan', 'trip', 'itinerary'],
      find_places: ['find', 'search', 'look'],
      optimize_route: ['optimize', 'improve', 'better'],
      visualize: ['show', 'map', 'plot']
    }
    
    const keywords = intentKeywords[intent] || []
    const matches = keywords.filter(keyword => 
      input.toLowerCase().includes(keyword)
    ).length
    
    return Math.min(matches / keywords.length + 0.3, 1.0)
  }

  calculateResponseConfidence(intent, tripAnalysis) {
    let confidence = 0.7 // Base confidence
    
    if (intent.confidence > 0.8) confidence += 0.1
    if (tripAnalysis.hasTrip) confidence += 0.1
    if (this.capabilities.canPlotOnMap) confidence += 0.1
    
    return Math.min(confidence, 1.0)
  }

  generateTripInsights(tripAnalysis) {
    const insights = []
    
    if (tripAnalysis.isEmpty) {
      insights.push("🆕 Ready to start planning a new adventure!")
    } else if (!tripAnalysis.isComplete) {
      insights.push(`🔄 Trip in progress: ${tripAnalysis.filledWaypoints} stops planned`)
    } else {
      insights.push(`✅ Complete trip: ${tripAnalysis.waypointCount} stops, ${Math.round(tripAnalysis.tripLength/1000)}km`)
    }
    
    if (tripAnalysis.needsOptimization) {
      insights.push("🎯 Route optimization opportunity detected")
    }
    
    return insights.join(' | ')
  }

  getContextualTravelTips(intent, tripAnalysis) {
    const tips = []
    
    if (intent.primary === 'plan_trip') {
      tips.push("💡 TIP: I'll plot your route on the map and suggest scenic alternatives")
    }
    
    if (tripAnalysis.waypointCount > 4) {
      tips.push("🛣️ TIP: For long trips, I recommend overnight stops every 6-8 hours of driving")
    }
    
    return tips.length > 0 ? `\\n\\n${tips.join('\\n')}` : ''
  }

  planMapUpdates(actions) {
    return actions
      .filter(action => [ACTION_TYPES.PLOT_LOCATION, ACTION_TYPES.PLOT_ROUTE, ACTION_TYPES.HIGHLIGHT_AREA].includes(action.type))
      .map(action => ({
        type: action.type,
        data: action.locations || action.route || action.area,
        animated: true
      }))
  }
}

// Export default instance creator
export const createAgenticAI = (mapInstance, tripContext, onAction) => {
  return new AgenticTravelAI(mapInstance, tripContext, onAction)
}

export default AgenticTravelAI