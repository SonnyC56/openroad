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