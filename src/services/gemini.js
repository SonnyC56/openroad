import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
let genAI = null
let model = null

// Initialize with API key (either from environment or user input)
export const initializeGemini = (apiKey = null) => {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY
  
  if (!key) {
    console.warn('No Gemini API key provided')
    return false
  }
  
  try {
    genAI = new GoogleGenerativeAI(key)
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
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

// Generate AI response for trip planning
export const generateTripResponse = async (userInput, tripContext = {}) => {
  if (!model) {
    throw new Error('Gemini not initialized. Please provide an API key.')
  }

  const { waypoints = [], currentLocation = null } = tripContext
  
  // Build context about the current trip
  let contextPrompt = `You are a helpful AI travel assistant for a road trip planning app called OpenRoad. `
  
  if (waypoints.length > 0) {
    const startPoint = waypoints.find(wp => wp.type === 'start')
    const endPoint = waypoints.find(wp => wp.type === 'end')
    const stops = waypoints.filter(wp => wp.type === 'waypoint')
    
    contextPrompt += `Current trip context:
- Start: ${startPoint?.location || 'Not set'}
- End: ${endPoint?.location || 'Not set'}
- Current stops: ${stops.length > 0 ? stops.map(s => s.location).join(', ') : 'None'}
`
  }
  
  contextPrompt += `
Your job is to:
1. Suggest specific places to visit (restaurants, attractions, scenic viewpoints, etc.)
2. Provide the exact location name that can be searched for
3. Be enthusiastic and helpful
4. Focus on places that are practical for road trips

User request: "${userInput}"

When suggesting places, always provide:
- The exact name of the place/business
- The city/location where it's found
- A brief description of why it's worth visiting

Format your response in a conversational way, but be specific about place names and locations.`

  try {
    const result = await model.generateContent(contextPrompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

// Extract location suggestions from AI response
export const extractLocationSuggestions = (aiResponse) => {
  // Simple regex patterns to extract location information
  // This could be improved with more sophisticated NLP
  const patterns = [
    /(?:visit|try|check out|go to)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in\s+([A-Z][a-zA-Z\s]+?))?(?:[.,!]|\s|$)/gi,
    /([A-Z][a-zA-Z\s&']+?)\s+(?:in|at|near)\s+([A-Z][a-zA-Z\s]+?)(?:[.,!]|\s|$)/gi,
    /([A-Z][a-zA-Z\s&']+?)\s+(?:Restaurant|Cafe|Park|Museum|Gallery|Center|Point|Trail|Beach|Lake|Mountain|Bridge|Tower|Building)/gi
  ]
  
  const suggestions = []
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(aiResponse)) !== null) {
      const placeName = match[1]?.trim()
      const location = match[2]?.trim()
      
      if (placeName && placeName.length > 3) {
        suggestions.push({
          name: placeName,
          location: location || null,
          fullText: match[0].trim()
        })
      }
    }
  })
  
  // Remove duplicates and return unique suggestions
  const unique = suggestions.filter((suggestion, index, self) =>
    index === self.findIndex(s => 
      s.name.toLowerCase() === suggestion.name.toLowerCase()
    )
  )
  
  return unique.slice(0, 3) // Return max 3 suggestions
}

// Initialize Gemini on module load if API key is available
if (import.meta.env.VITE_GEMINI_API_KEY) {
  initializeGemini()
}