import axios from 'axios'

const OSRM_BASE_URL = 'https://router.project-osrm.org'

// Calculate route between multiple waypoints
export const calculateRoute = async (waypoints) => {
  if (waypoints.length < 2) return null
  
  try {
    const coordinates = waypoints
      .filter(wp => wp.lat && wp.lng)
      .map(wp => `${wp.lng},${wp.lat}`)
      .join(';')
    
    const response = await axios.get(`${OSRM_BASE_URL}/route/v1/driving/${coordinates}`, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true,
        annotations: 'true'
      }
    })
    
    const route = response.data.routes[0]
    if (!route) return null
    
    return {
      geometry: route.geometry,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      legs: route.legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps?.map(step => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          geometry: step.geometry
        })) || []
      }))
    }
  } catch (error) {
    console.error('Routing error:', error)
    return null
  }
}

// Calculate distance matrix between multiple points
export const calculateDistanceMatrix = async (origins, destinations) => {
  try {
    const originCoords = origins.map(o => `${o.lng},${o.lat}`).join(';')
    const destCoords = destinations.map(d => `${d.lng},${d.lat}`).join(';')
    
    const response = await axios.get(`${OSRM_BASE_URL}/table/v1/driving/${originCoords};${destCoords}`, {
      params: {
        sources: Array.from({ length: origins.length }, (_, i) => i).join(';'),
        destinations: Array.from({ length: destinations.length }, (_, i) => i + origins.length).join(';')
      }
    })
    
    return {
      distances: response.data.distances, // in meters
      durations: response.data.durations  // in seconds
    }
  } catch (error) {
    console.error('Distance matrix error:', error)
    return null
  }
}

// Get nearest road point for a coordinate
export const getNearestRoad = async (lat, lng) => {
  try {
    const response = await axios.get(`${OSRM_BASE_URL}/nearest/v1/driving/${lng},${lat}`, {
      params: {
        number: 1
      }
    })
    
    const waypoint = response.data.waypoints[0]
    if (!waypoint) return null
    
    return {
      lat: waypoint.location[1],
      lng: waypoint.location[0],
      distance: waypoint.distance // distance to nearest road in meters
    }
  } catch (error) {
    console.error('Nearest road error:', error)
    return null
  }
}

// Utility functions for formatting
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  } else if (meters < 100000) {
    return `${(meters / 1000).toFixed(1)} km`
  } else {
    return `${Math.round(meters / 1000)} km`
  }
}

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

export const formatSpeed = (distanceMeters, durationSeconds) => {
  const kmh = (distanceMeters / 1000) / (durationSeconds / 3600)
  return `${Math.round(kmh)} km/h`
}

// Search for places along a route with maximum detour time
export async function searchAlongRoute({ route, query, maxDetourMinutes = 10, limit = 20 }) {
  if (!route || !query) return []
  
  try {
    // Get points along the route from the geojson geometry
    const routePoints = []
    if (route.geometry && route.geometry.coordinates) {
      const coords = route.geometry.coordinates
      const interval = Math.max(50, Math.floor(coords.length / 100)) // Sample every 50 points or 100 samples max
      
      for (let i = 0; i < coords.length; i += interval) {
        routePoints.push(coords[i])
      }
    }
    
    // Mock search results - in production, this would call a Places API
    const mockResults = []
    const categories = {
      restaurant: ['McDonald\'s', 'Subway', 'Chipotle', 'Olive Garden', 'Denny\'s'],
      'gas station': ['Shell', 'Chevron', 'BP', 'ExxonMobil', 'Texaco'],
      hotel: ['Holiday Inn', 'Hampton Inn', 'Best Western', 'Motel 6', 'Marriott'],
      coffee: ['Starbucks', 'Dunkin\'', 'Tim Hortons', 'Peet\'s Coffee', 'Dutch Bros'],
      shopping: ['Target', 'Walmart', 'Mall', 'Outlet Store', 'Best Buy'],
      attraction: ['Museum', 'Park', 'Monument', 'Viewpoint', 'Historic Site']
    }
    
    // Find appropriate category
    let selectedCategory = 'restaurant'
    for (const [cat, keywords] of Object.entries(categories)) {
      if (query.toLowerCase().includes(cat) || keywords.some(k => query.toLowerCase().includes(k.toLowerCase()))) {
        selectedCategory = cat
        break
      }
    }
    
    // Generate mock results along the route
    const numResults = Math.min(limit, Math.floor(Math.random() * 10) + 5)
    for (let i = 0; i < numResults; i++) {
      const pointIndex = Math.floor(Math.random() * routePoints.length)
      const point = routePoints[pointIndex]
      const names = categories[selectedCategory]
      const name = names[Math.floor(Math.random() * names.length)]
      
      mockResults.push({
        name: `${name} - Location ${i + 1}`,
        address: `${Math.floor(Math.random() * 9999) + 1} Highway ${Math.floor(Math.random() * 99) + 1}`,
        lat: point[1] + (Math.random() - 0.5) * 0.01,
        lng: point[0] + (Math.random() - 0.5) * 0.01,
        rating: (Math.random() * 2 + 3).toFixed(1),
        detourMinutes: Math.floor(Math.random() * maxDetourMinutes) + 1,
        category: selectedCategory
      })
    }
    
    // Sort by detour time
    mockResults.sort((a, b) => a.detourMinutes - b.detourMinutes)
    
    return mockResults
  } catch (error) {
    console.error('Search along route error:', error)
    return []
  }
}