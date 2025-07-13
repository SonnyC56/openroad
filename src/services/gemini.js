import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
let genAI = null
let model = null

// Local storage key for API key
const API_KEY_STORAGE_KEY = 'openroad-gemini-api-key'

// Save API key to localStorage
export const saveApiKey = (apiKey) => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
    return true
  } catch (error) {
    console.error('Failed to save API key:', error)
    return false
  }
}

// Get API key from localStorage
export const getSavedApiKey = () => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to retrieve API key:', error)
    return null
  }
}

// Clear API key from localStorage
export const clearApiKey = () => {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY)
    // Also clear the current instance
    genAI = null
    model = null
    return true
  } catch (error) {
    console.error('Failed to clear API key:', error)
    return false
  }
}

// Initialize with API key (priority: provided > localStorage > environment)
export const initializeGemini = (apiKey = null) => {
  const key = apiKey || getSavedApiKey() || import.meta.env.VITE_GEMINI_API_KEY
  
  if (!key) {
    console.warn('No Gemini API key provided')
    return false
  }
  
  try {
    genAI = new GoogleGenerativeAI(key)
    
    // Define structured output schema for travel suggestions
    const travelSuggestionSchema = {
      type: "object",
      properties: {
        response: {
          type: "string",
          description: "Conversational response to the user"
        },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Exact name of the place or business"
              },
              location: {
                type: "string",
                description: "City, state or general area"
              },
              category: {
                type: "string",
                enum: ["restaurant", "attraction", "national-park", "state-park", "scenic-viewpoint", "museum", "historic-site", "accommodation", "entertainment", "shopping", "outdoor-activity"],
                description: "Category of the suggestion"
              },
              description: {
                type: "string",
                description: "Brief description of why it's worth visiting"
              },
              estimatedTime: {
                type: "string",
                description: "Estimated time to spend there (e.g., '1-2 hours', '30 minutes', 'half day')"
              },
              coordinates: {
                type: "object",
                properties: {
                  lat: { type: "number" },
                  lng: { type: "number" }
                },
                description: "Approximate coordinates if known, otherwise null"
              },
              isAlongRoute: {
                type: "boolean",
                description: "Whether this is along the current route or requires a detour"
              }
            },
            required: ["name", "location", "category", "description"]
          }
        },
        tripAdvice: {
          type: "object",
          properties: {
            bestTimeToVisit: {
              type: "string",
              description: "Best time of day/season to visit if applicable"
            },
            routeOptimization: {
              type: "string",
              description: "Advice on how to order the stops efficiently"
            },
            totalEstimatedTime: {
              type: "string",
              description: "Estimated total time for all suggestions"
            }
          }
        }
      },
      required: ["response", "suggestions"]
    }
    
    // Create two models - one for structured output, one for natural conversation
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    // Store structured model separately for when we need it
    model.structuredModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: travelSuggestionSchema
      }
    })
    
    // Save the API key to localStorage if it was provided directly
    if (apiKey) {
      saveApiKey(apiKey)
    }
    
    return true
  } catch (error) {
    console.error('Failed to initialize Gemini:', error)
    return false
  }
}

// Check if Gemini is available
export const isGeminiAvailable = () => {
  return model !== null
}

// Generate AI response for trip planning with intelligent structured/natural output
export const generateTripResponse = async (userInput, tripContext = {}) => {
  if (!model) {
    throw new Error('Gemini not initialized. Please provide an API key.')
  }

  const { waypoints = [], currentLocation = null, selectedLegInfo = null } = tripContext
  
  // Determine if this needs structured output or natural conversation
  const needsStructuredOutput = isLocationRequest(userInput)
  
  // Build context about the current trip
  let contextPrompt = `You are a helpful AI travel assistant for a road trip planning app called OpenRoad.`
  
  if (waypoints.length > 0) {
    const startPoint = waypoints.find(wp => wp.type === 'start')
    const endPoint = waypoints.find(wp => wp.type === 'end')
    const stops = waypoints.filter(wp => wp.type === 'waypoint')
    
    contextPrompt += `

Current trip context:
- Start: ${startPoint?.location || 'Not set'}
- End: ${endPoint?.location || 'Not set'}
- Current stops: ${stops.length > 0 ? stops.map(s => s.location).join(', ') : 'None'}`
    
    if (selectedLegInfo) {
      contextPrompt += `
- FOCUSED SEGMENT: ${selectedLegInfo.from} → ${selectedLegInfo.to} (${selectedLegInfo.distance}, ${selectedLegInfo.duration})`
    }
  }
  
  contextPrompt += `

User request: "${userInput}"`

  if (needsStructuredOutput) {
    // Use structured output for location requests
    contextPrompt += `

INSTRUCTIONS:
1. Provide a conversational response in the "response" field
2. Include 3-5 specific location suggestions in the "suggestions" array
3. For each suggestion, provide:
   - Exact name that can be geocoded
   - City/state location
   - Appropriate category from the enum
   - Compelling description
   - Estimated visit time
   - Whether it's along the route or a detour
4. Focus on places practical for road trips
5. Be enthusiastic but concise
6. Use exact business/location names that can be found on maps

IMPORTANT: Respond with a JSON object containing a conversational response and structured suggestions.`

    try {
      const result = await model.structuredModel.generateContent(contextPrompt)
      const response = await result.response
      const jsonResponse = JSON.parse(response.text())
      
      return {
        text: jsonResponse.response,
        structured: jsonResponse
      }
    } catch (error) {
      console.error('Structured output failed, falling back to natural conversation:', error)
      // Fall through to natural conversation
    }
  }

  // Use natural conversation for general queries, multi-step planning, or fallback
  contextPrompt += `

Your job is to:
1. Be conversational and helpful
2. When suggesting specific places, provide clear names and locations
3. Focus on places that are practical for road trips
4. Be enthusiastic and informative
5. For multi-step trips, suggest a logical route progression

Format your response naturally - no need for JSON structure.`

  try {
    const result = await model.generateContent(contextPrompt)
    const response = await result.response
    return {
      text: response.text(),
      structured: null
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

// Helper function to determine if a request needs structured output
function isLocationRequest(userInput) {
  const locationKeywords = [
    'find restaurants', 'find places', 'suggest restaurants', 'recommend places',
    'show me restaurants', 'where can i eat', 'good restaurants',
    'places to eat', 'attractions near', 'things to do in',
    'museums in', 'parks near', 'beaches near', 'stops between'
  ]
  
  const conversationKeywords = [
    'tell me about', 'explain', 'how do i', 'what is', 'why',
    'plan a trip', 'help me plan', 'itinerary from', 'route from',
    'day trip', 'road trip', 'how long', 'best time', 'should i',
    'what\'s the', 'can you help', 'i want to', 'thinking about'
  ]
  
  const lowerInput = userInput.toLowerCase()
  
  // Multi-word trip planning requests should use natural conversation
  if (conversationKeywords.some(keyword => lowerInput.includes(keyword))) {
    return false
  }
  
  // Long requests (>10 words) are likely conversational
  if (userInput.split(' ').length > 10) {
    return false
  }
  
  // Short, specific location requests should use structured output
  return locationKeywords.some(keyword => lowerInput.includes(keyword))
}

// Extract location suggestions from structured AI response
export const extractStructuredSuggestions = (structuredResponse) => {
  if (!structuredResponse || !structuredResponse.suggestions) {
    return []
  }
  
  return structuredResponse.suggestions.map(suggestion => ({
    name: suggestion.name,
    location: suggestion.location,
    category: suggestion.category,
    description: suggestion.description,
    estimatedTime: suggestion.estimatedTime,
    coordinates: suggestion.coordinates,
    isAlongRoute: suggestion.isAlongRoute || false,
    fullText: `${suggestion.name} in ${suggestion.location}`,
    patternIndex: -1 // Mark as structured suggestion
  }))
}

// Extract location suggestions from AI response (enhanced for natural language)
export const extractLocationSuggestions = (aiResponse) => {
  console.log('Extracting suggestions from natural language response')
  
  const suggestions = []
  
  // Enhanced patterns to match specific location types mentioned in AI responses
  const patterns = [
    // National Parks (with variations)
    /(\b[A-Z][a-zA-Z\s]+(?:National|State)\s+Park\b)/gi,
    
    // Cities and locations with state context
    /(?:visit|stop\s+(?:at|in|by)|check\s+out|explore)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][A-Z]|,\s*[A-Z][a-zA-Z]+))/gi,
    
    // Numbered or bulleted suggestions
    /(?:^\d+[\.\)]\s*|^[-*•]\s*)([A-Z][a-zA-Z\s&'.-]+?)(?:\s*[-–—]\s*(.+?))?(?:\n|$)/gm,
    
    // Places with specific keywords that indicate attractions
    /\*\*([^*]+?)\*\*(?:\s*[-–—]\s*(.+?))?/gi, // Bold formatting
    
    // Restaurant/food patterns
    /([A-Z][a-zA-Z\s&'.-]+?)\s+(?:Restaurant|Cafe|Diner|Grill|Kitchen|House|Tavern|Bar|Brewery|Eatery|Pizzeria|Steakhouse)/gi,
    
    // Landmarks and attractions with descriptive text
    /([A-Z][a-zA-Z\s&'.-]{3,}?)\s+(?:Museum|Gallery|Center|Observatory|Theater|Theatre|Cathedral|Bridge|Tower|Trail|Falls|Lake|River|Canyon|Valley|Monument|Memorial|Park|Gardens?|Zoo|Aquarium)/gi,
    
    // Specific recommendation patterns
    /(?:I'd\s+recommend|I\s+suggest|consider\s+visiting|don't\s+miss|must-see|worth\s+(?:visiting|checking\s+out))\s+([A-Z][a-zA-Z\s&'.-]+?)(?:\s+in\s+([A-Z][a-zA-Z\s,]+?))?(?=[.,!;\n]|\s+(?:for|which|that|where))/gi,
    
    // Location patterns with context
    /(?:stop\s+at|visit|explore|see)\s+(?:the\s+)?([A-Z][a-zA-Z\s&'.-]+?)(?:\s+in\s+([A-Z][a-zA-Z\s,]+?))?(?=[.,!;\n]|\s+(?:for|which|that|where|is|are))/gi
  ]
  
  patterns.forEach((pattern, index) => {
    let match
    // Reset regex lastIndex to avoid issues with global flag
    pattern.lastIndex = 0
    
    while ((match = pattern.exec(aiResponse)) !== null) {
      let placeName = match[1]?.trim()
      let location = match[2]?.trim()
      
      // Clean up common issues
      if (placeName) {
        // Remove trailing punctuation and clean up
        placeName = placeName.replace(/[.,!?]+$/, '').trim()
        
        // Skip if too short or contains unwanted words
        if (placeName.length < 3 || 
            placeName.match(/^(the|and|or|but|in|at|on|for|with|by)$/i) ||
            placeName.match(/^(road|street|avenue|way|drive|lane|boulevard)$/i)) {
          continue
        }
        
        suggestions.push({
          name: placeName,
          location: location || null,
          fullText: match[0].trim(),
          patternIndex: index,
          description: `Visit ${placeName}${location ? ` in ${location}` : ''}`
        })
        
        console.log(`Found suggestion: "${placeName}"${location ? ` in ${location}` : ''} (pattern ${index})`)
      }
    }
  })
  
  // Remove duplicates and filter out low-quality matches
  const unique = suggestions.filter((suggestion, index, self) => {
    const isDuplicate = index !== self.findIndex(s => 
      s.name.toLowerCase() === suggestion.name.toLowerCase()
    )
    
    // Filter out obvious false positives
    const isBadMatch = suggestion.name.match(/^(road|street|avenue|drive|lane|path|way|route|highway)$/i) ||
                       suggestion.name.length < 3
    
    return !isDuplicate && !isBadMatch
  })
  
  console.log('Final unique suggestions:', unique.map(s => s.name))
  
  return unique.slice(0, 5) // Return max 5 suggestions
}

// Initialize Gemini on module load if API key is available (check localStorage first)
const savedKey = getSavedApiKey()
const envKey = import.meta.env.VITE_GEMINI_API_KEY

if (savedKey || envKey) {
  initializeGemini()
}