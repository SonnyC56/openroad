// Advanced Map Agent for Agentic AI Integration
// Handles intelligent map plotting, visualization, and interaction

import L from 'leaflet'
import { searchSuggestions } from './geocoding'
import { calculateRoute } from './routing'

/**
 * Map visualization types and styles
 */
export const MAP_VIZ_TYPES = {
  LOCATION_MARKER: 'location_marker',
  ROUTE_LINE: 'route_line',
  AREA_HIGHLIGHT: 'area_highlight',
  SUGGESTION_CLUSTER: 'suggestion_cluster',
  ANIMATED_PATH: 'animated_path',
  HEAT_MAP: 'heat_map',
  INSIGHT_OVERLAY: 'insight_overlay'
}

export const MARKER_STYLES = {
  AI_SUGGESTION: {
    icon: '🤖',
    color: '#6366f1',
    pulse: true,
    size: 'large'
  },
  WAYPOINT: {
    icon: '📍',
    color: '#ef4444',
    pulse: false,
    size: 'medium'
  },
  POI: {
    icon: '⭐',
    color: '#f59e0b',
    pulse: false,
    size: 'small'
  },
  DISCOVERY: {
    icon: '✨',
    color: '#10b981',
    pulse: true,
    size: 'medium'
  }
}

/**
 * Advanced Map Agent Class
 */
export class MapAgent {
  constructor(mapInstance) {
    this.map = mapInstance
    this.visualizations = new Map()
    this.animationQueue = []
    this.isAnimating = false
    this.layerGroups = {
      aiSuggestions: L.layerGroup(),
      routeAnalysis: L.layerGroup(),
      discoveries: L.layerGroup(),
      insights: L.layerGroup()
    }
    
    // Add layer groups to map
    Object.values(this.layerGroups).forEach(group => {
      if (this.map) group.addTo(this.map)
    })
  }

  /**
   * Plot AI suggestions with intelligent clustering and animation
   */
  async plotAISuggestions(suggestions, options = {}) {
    const {
      animate = true,
      cluster = true,
      showRoutes = false,
      highlightBest = true
    } = options

    console.log('🗺️ Plotting AI suggestions:', suggestions.length)
    
    // Clear previous AI suggestions
    this.layerGroups.aiSuggestions.clearLayers()
    
    // Process suggestions with rate limiting to avoid API errors
    const plottedSuggestions = []
    
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i]
      
      try {
        // Add delay to prevent rate limiting (200ms between requests)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        // Geocode suggestion if needed
        let coords = suggestion.coordinates
        if (!coords && suggestion.location) {
          console.log(`🔍 Geocoding: ${suggestion.location}`)
          
          try {
            const geoResults = await this.geocodeWithRetry(suggestion.location, 3)
            if (geoResults.length > 0) {
              coords = {
                lat: parseFloat(geoResults[0].lat),
                lng: parseFloat(geoResults[0].lng || geoResults[0].lon)
              }
              console.log(`✅ Geocoded: ${suggestion.location} -> ${coords.lat}, ${coords.lng}`)
            } else {
              console.log(`⚠️ No results for: ${suggestion.location}`)
            }
          } catch (geoError) {
            console.error(`❌ Geocoding failed for ${suggestion.location}:`, geoError.message)
            // Try fallback coordinates for common places
            coords = this.getFallbackCoordinates(suggestion.location)
          }
        }
        
        if (!coords) {
          console.log(`⏭️ Skipping ${suggestion.location} - no coordinates`)
          continue
        }
        
        // Create enhanced marker
        const marker = this.createEnhancedMarker(coords, {
          ...MARKER_STYLES.AI_SUGGESTION,
          title: suggestion.name || suggestion.location,
          description: suggestion.description,
          category: suggestion.category,
          confidence: suggestion.confidence || 0.8,
          index: i
        })
        
        // Add to AI suggestions layer
        marker.addTo(this.layerGroups.aiSuggestions)
        
        // Animate marker appearance
        if (animate) {
          this.animateMarkerAppearance(marker, i * 300)
        }
        
        plottedSuggestions.push({ marker, coords, suggestion })
        
      } catch (error) {
        console.error(`Error plotting suggestion ${suggestion.location}:`, error)
      }
    }
    
    // Fit map bounds to show all suggestions
    if (plottedSuggestions.length > 0) {
      const group = new L.featureGroup(plottedSuggestions.map(p => p.marker))
      this.map.fitBounds(group.getBounds().pad(0.1))
    }
    
    // Draw connecting routes if requested
    if (showRoutes && plottedSuggestions.length > 1) {
      await this.drawSuggestionRoutes(plottedSuggestions)
    }
    
    return plottedSuggestions
  }

  /**
   * Create enhanced markers with custom styling and interactions
   */
  createEnhancedMarker(coords, options = {}) {
    const {
      icon = '📍',
      color = '#3b82f6',
      size = 'medium',
      pulse = false,
      title = '',
      description = '',
      confidence = 1.0
    } = options
    
    // Create custom icon HTML
    const iconHtml = `
      <div class="enhanced-marker ${pulse ? 'pulse' : ''}" 
           style="
             background: ${color};
             border: 3px solid white;
             border-radius: 50%;
             width: ${size === 'large' ? '40px' : size === 'medium' ? '32px' : '24px'};
             height: ${size === 'large' ? '40px' : size === 'medium' ? '32px' : '24px'};
             display: flex;
             align-items: center;
             justify-content: center;
             font-size: ${size === 'large' ? '20px' : size === 'medium' ? '16px' : '12px'};
             box-shadow: 0 4px 12px rgba(0,0,0,0.3);
             opacity: ${confidence};
             cursor: pointer;
             transition: all 0.3s ease;
           ">
        ${icon}
      </div>
    `
    
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [size === 'large' ? 40 : size === 'medium' ? 32 : 24, size === 'large' ? 40 : size === 'medium' ? 32 : 24],
      iconAnchor: [size === 'large' ? 20 : size === 'medium' ? 16 : 12, size === 'large' ? 20 : size === 'medium' ? 16 : 12]
    })
    
    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
    
    // Add enhanced popup
    if (title || description) {
      const popupContent = `
        <div class="ai-marker-popup">
          <div class="popup-header">
            <span class="popup-icon">${icon}</span>
            <h3>${title}</h3>
          </div>
          ${description ? `<p class="popup-description">${description}</p>` : ''}
          <div class="popup-actions">
            <button class="btn-add-to-trip" onclick="window.mapAgent?.addToTrip('${title}', ${coords.lat}, ${coords.lng})">
              ➕ Add to Trip
            </button>
            <button class="btn-learn-more" onclick="window.mapAgent?.showDetails('${title}')">
              ℹ️ Learn More
            </button>
          </div>
          <div class="confidence-indicator">
            <span>AI Confidence: ${Math.round(confidence * 100)}%</span>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${confidence * 100}%"></div>
            </div>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'ai-enhanced-popup'
      })
    }
    
    // Add hover effects
    marker.on('mouseover', () => {
      marker.getElement().style.transform = 'scale(1.2)'
    })
    
    marker.on('mouseout', () => {
      marker.getElement().style.transform = 'scale(1.0)'
    })
    
    return marker
  }

  /**
   * Draw intelligent route connections between suggestions
   */
  async drawSuggestionRoutes(suggestions) {
    console.log('🛣️ Drawing suggestion routes')
    
    // Clear previous routes
    this.layerGroups.routeAnalysis.clearLayers()
    
    for (let i = 0; i < suggestions.length - 1; i++) {
      const from = suggestions[i].coords
      const to = suggestions[i + 1].coords
      
      try {
        const route = await calculateRoute([from, to])
        
        if (route && route.coordinates) {
          // Create animated route line
          const routeLine = L.polyline(route.coordinates, {
            color: '#6366f1',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            className: 'ai-route-line'
          })
          
          routeLine.addTo(this.layerGroups.routeAnalysis)
          
          // Animate the route drawing
          this.animateRouteLine(routeLine, i * 500)
          
          // Add route info popup
          const midpoint = this.getRouteMiddlePoint(route.coordinates)
          const routeInfo = L.marker(midpoint, {
            icon: L.divIcon({
              html: `
                <div class="route-info-marker">
                  <span class="route-distance">${Math.round(route.distance / 1000)}km</span>
                  <span class="route-time">${Math.round(route.duration / 60)}min</span>
                </div>
              `,
              className: 'route-info-icon',
              iconSize: [60, 30]
            })
          })
          
          routeInfo.addTo(this.layerGroups.routeAnalysis)
        }
        
      } catch (error) {
        console.error('Error drawing route:', error)
      }
    }
  }

  /**
   * Highlight geographic areas of interest
   */
  highlightArea(bounds, options = {}) {
    const {
      color = '#10b981',
      fillOpacity = 0.2,
      strokeOpacity = 0.8,
      label = '',
      insights = []
    } = options
    
    const rectangle = L.rectangle(bounds, {
      color,
      fillOpacity,
      opacity: strokeOpacity,
      weight: 2,
      dashArray: '5, 5'
    })
    
    rectangle.addTo(this.layerGroups.insights)
    
    // Add area label if provided
    if (label) {
      const center = rectangle.getBounds().getCenter()
      const labelMarker = L.marker(center, {
        icon: L.divIcon({
          html: `<div class="area-label">${label}</div>`,
          className: 'area-label-icon',
          iconSize: [100, 20]
        })
      })
      labelMarker.addTo(this.layerGroups.insights)
    }
    
    return rectangle
  }

  /**
   * Create animated path visualization
   */
  createAnimatedPath(coordinates, options = {}) {
    const {
      color = '#f59e0b',
      speed = 50, // pixels per second
      repeat = false,
      onComplete = null
    } = options
    
    const path = L.polyline(coordinates, {
      color,
      weight: 4,
      opacity: 0
    })
    
    path.addTo(this.layerGroups.discoveries)
    
    // Animate path drawing
    let progress = 0
    const totalLength = this.calculatePathLength(coordinates)
    
    const animate = () => {
      progress += speed / 1000 * 16 // 60fps
      const currentLength = (progress / 100) * totalLength
      
      // Update path opacity based on progress
      path.setStyle({ opacity: Math.min(progress / 100, 0.8) })
      
      if (progress < 100) {
        requestAnimationFrame(animate)
      } else if (onComplete) {
        onComplete(path)
      }
    }
    
    requestAnimationFrame(animate)
    
    return path
  }

  /**
   * Show travel insights overlay
   */
  showTravelInsights(location, insights) {
    const insightIcon = L.divIcon({
      html: `
        <div class="travel-insights-marker">
          <div class="insights-icon">💡</div>
          <div class="insights-popup">
            <h4>Travel Insights</h4>
            ${insights.map(insight => `<p>• ${insight}</p>`).join('')}
          </div>
        </div>
      `,
      className: 'travel-insights-icon',
      iconSize: [40, 40]
    })
    
    const insightMarker = L.marker([location.lat, location.lng], { icon: insightIcon })
    insightMarker.addTo(this.layerGroups.insights)
    
    return insightMarker
  }

  /**
   * Animation methods
   */
  animateMarkerAppearance(marker, delay = 0) {
    setTimeout(() => {
      const element = marker.getElement()
      if (element) {
        element.style.transform = 'scale(0)'
        element.style.opacity = '0'
        
        setTimeout(() => {
          element.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          element.style.transform = 'scale(1)'
          element.style.opacity = '1'
        }, 50)
      }
    }, delay)
  }

  animateRouteLine(polyline, delay = 0) {
    setTimeout(() => {
      let opacity = 0
      const fadeIn = () => {
        opacity += 0.05
        polyline.setStyle({ opacity: Math.min(opacity, 0.7) })
        
        if (opacity < 0.7) {
          requestAnimationFrame(fadeIn)
        }
      }
      fadeIn()
    }, delay)
  }

  /**
   * Geocode with retry logic and exponential backoff
   */
  async geocodeWithRetry(location, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const results = await searchSuggestions(location, 1)
        return results
      } catch (error) {
        console.log(`Geocoding attempt ${attempt}/${maxRetries} failed for ${location}`)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff: wait 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Get fallback coordinates for common locations when geocoding fails
   */
  getFallbackCoordinates(location) {
    const fallbackCoords = {
      // Major US Cities
      'New York': { lat: 40.7128, lng: -74.0060 },
      'New York City': { lat: 40.7128, lng: -74.0060 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      'Chicago': { lat: 41.8781, lng: -87.6298 },
      'Houston': { lat: 29.7604, lng: -95.3698 },
      'Phoenix': { lat: 33.4484, lng: -112.0740 },
      'Philadelphia': { lat: 39.9526, lng: -75.1652 },
      'San Antonio': { lat: 29.4241, lng: -98.4936 },
      'San Diego': { lat: 32.7157, lng: -117.1611 },
      'Dallas': { lat: 32.7767, lng: -96.7970 },
      'San Francisco': { lat: 37.7749, lng: -122.4194 },
      'Austin': { lat: 30.2672, lng: -97.7431 },
      'Denver': { lat: 39.7392, lng: -104.9903 },
      'Las Vegas': { lat: 36.1699, lng: -115.1398 },
      'Kansas City': { lat: 39.0997, lng: -94.5786 },
      'Oklahoma City': { lat: 35.4676, lng: -97.5164 },
      
      // National Parks
      'Grand Canyon National Park': { lat: 36.1069, lng: -112.1129 },
      'Yellowstone National Park': { lat: 44.4280, lng: -110.5885 },
      'Yosemite National Park': { lat: 37.8651, lng: -119.5383 },
      'Zion National Park': { lat: 37.2982, lng: -113.0263 },
      'Bryce Canyon National Park': { lat: 37.5930, lng: -112.1871 },
      'Arches National Park': { lat: 38.7331, lng: -109.5925 },
      'Canyonlands National Park': { lat: 38.2619, lng: -109.8782 },
      'Rocky Mountain National Park': { lat: 40.3428, lng: -105.6836 },
      'Great Smoky Mountains National Park': { lat: 35.6118, lng: -83.4895 },
      'Death Valley National Park': { lat: 36.5054, lng: -117.0794 },
      'Glacier National Park': { lat: 48.7596, lng: -113.7870 },
      'Olympic National Park': { lat: 47.8021, lng: -123.6044 },
      'Everglades National Park': { lat: 25.2866, lng: -80.8987 },
      'Acadia National Park': { lat: 44.3386, lng: -68.2733 },
      'Mammoth Cave National Park': { lat: 37.1861, lng: -86.1000 },
      'Shenandoah National Park': { lat: 38.5324, lng: -78.4527 },
      'Cuyahoga Valley National Park': { lat: 41.2808, lng: -81.5678 },
      'Petrified Forest National Park': { lat: 34.9099, lng: -109.8068 }
    }
    
    // Try exact match first
    if (fallbackCoords[location]) {
      console.log(`📍 Using fallback coordinates for: ${location}`)
      return fallbackCoords[location]
    }
    
    // Try partial match for common patterns
    const locationLower = location.toLowerCase()
    for (const [key, coords] of Object.entries(fallbackCoords)) {
      if (locationLower.includes(key.toLowerCase()) || key.toLowerCase().includes(locationLower)) {
        console.log(`📍 Using partial fallback coordinates for: ${location} -> ${key}`)
        return coords
      }
    }
    
    return null
  }

  /**
   * Utility methods
   */
  getRouteMiddlePoint(coordinates) {
    const midIndex = Math.floor(coordinates.length / 2)
    return coordinates[midIndex]
  }

  calculatePathLength(coordinates) {
    let length = 0
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1]
      const curr = coordinates[i]
      length += this.calculateDistance(prev[0], prev[1], curr[0], curr[1])
    }
    return length
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180
    const φ2 = lat2 * Math.PI/180
    const Δφ = (lat2-lat1) * Math.PI/180
    const Δλ = (lon2-lon1) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  /**
   * Clear all visualizations
   */
  clearAll() {
    Object.values(this.layerGroups).forEach(group => {
      group.clearLayers()
    })
  }

  clearLayer(layerName) {
    if (this.layerGroups[layerName]) {
      this.layerGroups[layerName].clearLayers()
    }
  }

  /**
   * Export methods for global access
   */
  addToTrip(name, lat, lng) {
    // This will be connected to the trip context
    console.log('Adding to trip:', { name, lat, lng })
    // Trigger event for AI overlay to handle
    window.dispatchEvent(new CustomEvent('aiMapAction', {
      detail: { action: 'addToTrip', data: { name, lat, lng } }
    }))
  }

  showDetails(name) {
    console.log('Showing details for:', name)
    // Trigger event for AI overlay to handle
    window.dispatchEvent(new CustomEvent('aiMapAction', {
      detail: { action: 'showDetails', data: { name } }
    }))
  }
}

// Global instance for window access
if (typeof window !== 'undefined') {
  window.mapAgent = null
}

export default MapAgent