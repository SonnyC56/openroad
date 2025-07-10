import axios from 'axios'

// Web search service for AI-powered recommendations
export class SearchService {
  constructor() {
    this.searchEngines = {
      serp: {
        baseUrl: 'https://serpapi.com/search',
        enabled: false,
        apiKey: null
      },
      tavily: {
        baseUrl: 'https://api.tavily.com/search',
        enabled: false,
        apiKey: null
      },
      // Fallback to a free search API or web scraping
      duckduckgo: {
        baseUrl: 'https://api.duckduckgo.com/',
        enabled: true,
        apiKey: null // No API key needed
      }
    }
  }

  // Initialize search engines with API keys
  initialize(config = {}) {
    if (config.serp?.apiKey) {
      this.searchEngines.serp.apiKey = config.serp.apiKey
      this.searchEngines.serp.enabled = true
    }

    if (config.tavily?.apiKey) {
      this.searchEngines.tavily.apiKey = config.tavily.apiKey
      this.searchEngines.tavily.enabled = true
    }
  }

  // Search for travel-related information
  async searchTravel(query, location = null, options = {}) {
    const {
      maxResults = 5,
      searchType = 'general', // 'general', 'places', 'events', 'weather'
      radius = 50 // km radius for location-based searches
    } = options

    // Enhance query with location context
    let enhancedQuery = query
    if (location) {
      enhancedQuery = `${query} near ${location}`
    }

    // Add travel-specific terms based on search type
    switch (searchType) {
      case 'places':
        enhancedQuery += ' attractions restaurants things to do'
        break
      case 'events':
        enhancedQuery += ' events activities festivals'
        break
      case 'weather':
        enhancedQuery += ' weather forecast conditions'
        break
    }

    try {
      // Try premium search engines first
      if (this.searchEngines.serp.enabled) {
        return await this.searchWithSerpAPI(enhancedQuery, maxResults)
      }

      if (this.searchEngines.tavily.enabled) {
        return await this.searchWithTavily(enhancedQuery, maxResults)
      }

      // Fallback to DuckDuckGo
      return await this.searchWithDuckDuckGo(enhancedQuery, maxResults)
    } catch (error) {
      console.error('Search error:', error)
      return []
    }
  }

  // Search with SerpAPI (Google Search)
  async searchWithSerpAPI(query, maxResults) {
    const response = await axios.get(this.searchEngines.serp.baseUrl, {
      params: {
        q: query,
        api_key: this.searchEngines.serp.apiKey,
        engine: 'google',
        num: maxResults
      }
    })

    return response.data.organic_results?.map(result => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: 'Google'
    })) || []
  }

  // Search with Tavily AI
  async searchWithTavily(query, maxResults) {
    const response = await axios.post(this.searchEngines.tavily.baseUrl, {
      api_key: this.searchEngines.tavily.apiKey,
      query,
      max_results: maxResults,
      search_depth: 'advanced',
      include_answer: true,
      include_domains: [
        'tripadvisor.com',
        'yelp.com',
        'google.com',
        'wikipedia.org',
        'lonelyplanet.com'
      ]
    })

    return response.data.results?.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      source: 'Tavily'
    })) || []
  }

  // Search with DuckDuckGo (free fallback)
  async searchWithDuckDuckGo(query, maxResults) {
    try {
      // DuckDuckGo Instant Answer API
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1
        }
      })

      const results = []
      
      // Add abstract if available
      if (response.data.Abstract) {
        results.push({
          title: response.data.Heading || 'DuckDuckGo Result',
          url: response.data.AbstractURL,
          snippet: response.data.Abstract,
          source: 'DuckDuckGo'
        })
      }

      // Add related topics
      if (response.data.RelatedTopics) {
        response.data.RelatedTopics.slice(0, maxResults - 1).forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0],
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo'
            })
          }
        })
      }

      return results
    } catch (error) {
      console.error('DuckDuckGo search error:', error)
      return []
    }
  }

  // Search for places near a location
  async searchPlacesNearby(location, type = 'tourist_attraction', radius = 25) {
    const query = `${type} near ${location} within ${radius}km`
    return await this.searchTravel(query, location, { 
      searchType: 'places',
      maxResults: 10 
    })
  }

  // Search for events in a location
  async searchEvents(location, dateRange = null) {
    let query = `events activities ${location}`
    if (dateRange) {
      query += ` ${dateRange}`
    }
    
    return await this.searchTravel(query, location, { 
      searchType: 'events',
      maxResults: 8 
    })
  }

  // Search for weather and travel conditions
  async searchWeatherInfo(location, date = null) {
    let query = `weather forecast ${location}`
    if (date) {
      query += ` ${date}`
    }
    
    return await this.searchTravel(query, location, { 
      searchType: 'weather',
      maxResults: 3 
    })
  }

  // Format search results for AI context
  formatResultsForAI(results, query) {
    if (!results || results.length === 0) {
      return `No search results found for "${query}"`
    }

    let formatted = `Search results for "${query}":\n\n`
    results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`
      formatted += `   ${result.snippet}\n`
      formatted += `   Source: ${result.source}\n`
      formatted += `   URL: ${result.url}\n\n`
    })

    return formatted
  }

  // Check if any search engine is configured
  isConfigured() {
    return Object.values(this.searchEngines).some(engine => engine.enabled)
  }
}

// Create singleton instance
export const searchService = new SearchService()