import axios from 'axios'

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

// Geocoding service for converting addresses to coordinates
export const geocodeAddress = async (address, limit = 5) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        format: 'json',
        q: address,
        limit,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1
      }
    })
    
    return response.data.map(item => ({
      id: item.place_id,
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: {
        house_number: item.address?.house_number,
        road: item.address?.road,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        postcode: item.address?.postcode
      },
      type: item.type,
      class: item.class,
      importance: item.importance
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

// Reverse geocoding service for converting coordinates to addresses
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        format: 'json',
        lat,
        lon: lng,
        addressdetails: 1
      }
    })
    
    const data = response.data
    return {
      display_name: data.display_name,
      address: {
        house_number: data.address?.house_number,
        road: data.address?.road,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        postcode: data.address?.postcode
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

// Search suggestions with debouncing
export const searchSuggestions = async (query, limit = 5) => {
  if (!query || query.length < 2) return []
  
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        format: 'json',
        q: query,
        limit,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        countrycodes: 'us,ca', // Focus on US and Canada for road trips
        featuretype: 'city,settlement,administrative' // Focus on cities and settlements
      }
    })
    
    return response.data.map(item => ({
      id: item.place_id,
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      class: item.class,
      importance: item.importance,
      relevance: calculateRelevance(item, query)
    })).sort((a, b) => b.relevance - a.relevance)
  } catch (error) {
    console.error('Search suggestions error:', error)
    return []
  }
}

// Calculate relevance score for search results
const calculateRelevance = (item, query) => {
  const queryLower = query.toLowerCase()
  const nameLower = item.display_name.toLowerCase()
  
  let score = 0
  
  // Exact match at the beginning gets highest score
  if (nameLower.startsWith(queryLower)) {
    score += 100
  }
  
  // Partial match gets medium score
  if (nameLower.includes(queryLower)) {
    score += 50
  }
  
  // Boost cities and towns
  if (item.type === 'city' || item.type === 'town') {
    score += 20
  }
  
  // Boost places with higher importance
  if (item.importance) {
    score += item.importance * 10
  }
  
  return score
}