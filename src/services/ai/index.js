import { OpenAIProvider } from './providers/openai.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { GeminiProvider } from './providers/gemini.js'
import { OllamaProvider } from './providers/ollama.js'

export class AIService {
  constructor() {
    this.providers = new Map()
    this.currentProvider = null
    this.settings = {
      temperature: 0.7,
      maxTokens: 1000,
      streaming: false
    }
  }

  // Initialize providers with API keys
  initializeProviders(config = {}) {
    if (config.openai?.apiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openai.apiKey, config.openai.baseUrl))
    }

    if (config.anthropic?.apiKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropic.apiKey, config.anthropic.baseUrl))
    }

    if (config.gemini?.apiKey) {
      this.providers.set('gemini', new GeminiProvider(config.gemini.apiKey, config.gemini.baseUrl))
    }

    if (config.ollama?.enabled) {
      this.providers.set('ollama', new OllamaProvider(null, config.ollama.baseUrl))
    }

    // Set default provider to first available
    const availableProviders = Array.from(this.providers.keys())
    if (availableProviders.length > 0) {
      this.currentProvider = availableProviders[0]
    }
  }

  // Get list of available providers
  getAvailableProviders() {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      id: key,
      name: provider.name,
      configured: provider.isConfigured()
    }))
  }

  // Set current provider
  setProvider(providerId) {
    if (this.providers.has(providerId)) {
      this.currentProvider = providerId
      return true
    }
    return false
  }

  // Get current provider
  getCurrentProvider() {
    return this.currentProvider ? this.providers.get(this.currentProvider) : null
  }

  // Get available models for current provider
  async getAvailableModels() {
    const provider = this.getCurrentProvider()
    if (!provider) return []

    if (typeof provider.getModels === 'function') {
      return await provider.getModels()
    }
    return []
  }

  // Generate response with current provider
  async generateResponse(messages, options = {}) {
    const provider = this.getCurrentProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const mergedOptions = { ...this.settings, ...options }
    return await provider.generateResponse(messages, mergedOptions)
  }

  // Generate streaming response with current provider
  async generateStreamingResponse(messages, options = {}, onChunk) {
    const provider = this.getCurrentProvider()
    if (!provider) {
      throw new Error('No AI provider configured')
    }

    const mergedOptions = { ...this.settings, ...options }
    return await provider.generateStreamingResponse(messages, mergedOptions, onChunk)
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
  }

  // Get current settings
  getSettings() {
    return { ...this.settings }
  }

  // Helper method to create travel-focused system message
  createTravelSystemMessage(routeSegment = null) {
    let systemMessage = `You are a knowledgeable travel assistant helping users plan their road trip. You have access to real-time information and can provide recommendations for:

- Points of interest (restaurants, attractions, scenic spots)
- Local events and activities
- Weather conditions and travel advisories
- Historical and cultural information
- Practical travel tips (parking, hours, reservations)

Always provide specific, actionable recommendations with addresses when possible. Be enthusiastic but practical in your suggestions.`

    if (routeSegment) {
      systemMessage += `\n\nThe user is currently planning for the route segment from ${routeSegment.from} to ${routeSegment.to}. Focus your recommendations on places along or near this route.`
    }

    return systemMessage
  }

  // Helper method to format location context
  formatLocationContext(waypoints, currentSegment = null) {
    let context = 'Current trip waypoints:\n'
    waypoints.forEach((wp, index) => {
      context += `${index + 1}. ${wp.name} (${wp.address || 'No address'})\n`
    })

    if (currentSegment) {
      context += `\nFocusing on segment: ${currentSegment.from} → ${currentSegment.to}`
    }

    return context
  }
}

// Create singleton instance
export const aiService = new AIService()

// Export provider classes for direct use if needed
export { OpenAIProvider, AnthropicProvider, GeminiProvider, OllamaProvider }