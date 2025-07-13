import { useEffect, useState, useRef, useCallback } from 'react'
import L from 'leaflet'
import { useTrip } from '../../contexts/TripContext'
import { calculateRoute } from '../../services/routing'
import { getPOIsForZoom, getCategoryStyle } from '../../data/roadTripPOIs'
import styles from './POIOverlay.module.css'

// Create custom icon for POIs
const createPOIIcon = (poi) => {
  const style = getCategoryStyle(poi.category)
  const sizeMap = {
    large: 40,
    medium: 32,
    small: 24
  }
  const iconSize = sizeMap[style.size] || 32

  return L.divIcon({
    html: `
      <div class="${styles.poiMarker}" 
           data-category="${poi.category}"
           style="
             width: ${iconSize}px;
             height: ${iconSize}px;
             background-color: ${style.color};
             font-size: ${iconSize * 0.5}px;
           ">
        <span class="${styles.poiEmoji}">${poi.emoji}</span>
        <div class="${styles.poiTooltip}">
          <span class="${styles.tooltipName}">${poi.name}</span>
          <span class="${styles.tooltipDesc}">${poi.description}</span>
        </div>
      </div>
    `,
    className: 'poi-marker-container',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, -iconSize / 2]
  })
}

const POIOverlay = ({ map }) => {
  const { state, addWaypoint } = useTrip()
  const [visiblePOIs, setVisiblePOIs] = useState([])
  const [selectedPOI, setSelectedPOI] = useState(null)
  const [routePreview, setRoutePreview] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const poiMarkersRef = useRef({})
  const popupRef = useRef(null)

  // Update visible POIs based on zoom and bounds
  const updateVisiblePOIs = useCallback(() => {
    if (!map) return
    
    const zoom = map.getZoom()
    const bounds = map.getBounds()
    const mapBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    }
    
    const pois = getPOIsForZoom(zoom, mapBounds)
    setVisiblePOIs(pois)
  }, [map])

  // Set up map event listeners
  useEffect(() => {
    if (!map) return

    const handleZoomEnd = () => updateVisiblePOIs()
    const handleMoveEnd = () => updateVisiblePOIs()

    map.on('zoomend', handleZoomEnd)
    map.on('moveend', handleMoveEnd)

    // Initial load
    updateVisiblePOIs()

    return () => {
      map.off('zoomend', handleZoomEnd)
      map.off('moveend', handleMoveEnd)
    }
  }, [map, updateVisiblePOIs])

  // Calculate route preview with POI
  const calculateRouteWithPOI = useCallback(async (poi) => {
    if (!state.currentTrip || state.currentTrip.waypoints.length < 2) return
    
    setIsCalculating(true)
    try {
      const waypoints = state.currentTrip.waypoints.filter(wp => wp.lat && wp.lng)
      const originalRoute = state.currentTrip.route
      const originalTotalTime = originalRoute ? originalRoute.legs.reduce((sum, leg) => sum + leg.duration, 0) : 0
      
      // Helper function to calculate distance between two points
      const getDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371 // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLng = (lng2 - lng1) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
      }
      
      // Find best position based on geographic proximity
      let bestPosition = 1
      let minTotalDistance = Infinity
      
      // For each possible position, calculate total distance impact
      for (let i = 1; i < waypoints.length; i++) {
        const prevWp = waypoints[i - 1]
        const nextWp = waypoints[i]
        
        // Calculate distances
        const originalDist = getDistance(prevWp.lat, prevWp.lng, nextWp.lat, nextWp.lng)
        const distToPOI = getDistance(prevWp.lat, prevWp.lng, poi.lat, poi.lng)
        const distFromPOI = getDistance(poi.lat, poi.lng, nextWp.lat, nextWp.lng)
        const newTotalDist = distToPOI + distFromPOI
        
        // Calculate how much extra distance this adds
        const extraDistance = newTotalDist - originalDist
        
        if (extraDistance < minTotalDistance) {
          minTotalDistance = extraDistance
          bestPosition = i
        }
      }
      
      // Calculate final route with POI at best position
      const finalWaypoints = [
        ...waypoints.slice(0, bestPosition),
        { lat: poi.lat, lng: poi.lng },
        ...waypoints.slice(bestPosition)
      ]
      
      const previewRoute = await calculateRoute(finalWaypoints)
      if (previewRoute) {
        const newTotalTime = previewRoute.legs.reduce((sum, leg) => sum + leg.duration, 0)
        const addedTime = newTotalTime - originalTotalTime
        
        setRoutePreview({
          poi,
          route: previewRoute,
          insertPosition: bestPosition,
          addedTime: Math.round(addedTime / 60), // Convert to minutes
          totalTime: Math.round(newTotalTime / 60)
        })
      }
    } catch (error) {
      console.error('Error calculating route with POI:', error)
    }
    setIsCalculating(false)
  }, [state.currentTrip])

  // Handle POI click
  const handlePOIClick = useCallback((poi) => {
    setSelectedPOI(poi)
    if (state.currentTrip && state.currentTrip.waypoints.length >= 2) {
      calculateRouteWithPOI(poi)
    }
  }, [state.currentTrip, calculateRouteWithPOI])

  // Add POI to trip
  const handleAddPOI = useCallback(() => {
    if (!selectedPOI || !routePreview) return
    
    // Use the context's addWaypoint method
    addWaypoint({
      location: selectedPOI.name,
      lat: selectedPOI.lat,
      lng: selectedPOI.lng,
      type: 'waypoint',
      notes: selectedPOI.description,
      isPOI: true,
      insertAt: routePreview.insertPosition
    })
    
    // Notify AI chatbot about the new POI
    const poiAddedEvent = new CustomEvent('poiAddedToRoute', {
      detail: {
        poi: selectedPOI,
        position: routePreview.insertPosition,
        addedTime: routePreview.addedTime
      }
    })
    window.dispatchEvent(poiAddedEvent)
    
    // Close popup
    if (popupRef.current) {
      popupRef.current.close()
    }
    
    // Clear selection
    setSelectedPOI(null)
    setRoutePreview(null)
  }, [selectedPOI, routePreview, addWaypoint])

  // Update POI markers
  useEffect(() => {
    if (!map) return

    // Clear existing POI markers
    Object.values(poiMarkersRef.current).forEach(marker => {
      map.removeLayer(marker)
    })
    poiMarkersRef.current = {}

    // Add markers for visible POIs
    visiblePOIs.forEach(poi => {
      const marker = L.marker([poi.lat, poi.lng], {
        icon: createPOIIcon(poi)
      })

      // Create enhanced popup content with action buttons
      const popupContent = `
        <div class="${styles.popupContent}">
          <div class="${styles.popupHeader}">
            <span class="${styles.popupEmoji}">${poi.emoji}</span>
            <div class="${styles.popupTitleSection}">
              <h3>${poi.name}</h3>
              <span class="${styles.popupCategory}">${poi.category.replace('-', ' ')}</span>
            </div>
          </div>
          <p class="${styles.popupDescription}">${poi.description}</p>
          
          <div class="${styles.popupActions}">
            <button 
              class="${styles.actionButton} ${styles.primaryAction}"
              id="add-to-route-${poi.id}"
            >
              ➕ Add to Route
            </button>
            <button 
              class="${styles.actionButton} ${styles.secondaryAction}"
              id="learn-more-${poi.id}"
            >
              📖 Learn More
            </button>
            <button 
              class="${styles.actionButton} ${styles.secondaryAction}"
              id="directions-${poi.id}"
            >
              🧭 Directions
            </button>
          </div>
          
          <div id="poi-popup-dynamic-${poi.id}"></div>
        </div>
      `

      // Bind popup directly to marker
      marker.bindPopup(popupContent, {
        className: styles.poiPopup,
        minWidth: 250,
        closeButton: true,
        autoPan: true
      })

      // Make marker more clickable
      marker.options.riseOnHover = true
      marker.options.autoPanOnFocus = true

      marker.on('popupopen', (e) => {
        popupRef.current = e.popup
        
        // Immediately trigger route calculation if we have a trip
        if (state.currentTrip && state.currentTrip.waypoints.length >= 2 && poi) {
          handlePOIClick(poi)
        }
        
        // Add event handlers for action buttons immediately
        requestAnimationFrame(() => {
          // Add to Route button
          const addToRouteBtn = document.getElementById(`add-to-route-${poi.id}`)
          if (addToRouteBtn) {
            addToRouteBtn.onclick = (event) => {
              event.preventDefault()
              event.stopPropagation()
              
              if (state.currentTrip && state.currentTrip.waypoints.length >= 2 && !routePreview) {
                // If we have a route but no preview yet, calculate it
                handlePOIClick(poi)
              } else if (routePreview && selectedPOI?.id === poi.id) {
                // If we already have a preview, add it
                handleAddPOI()
              } else {
                // Direct add if no route exists
                addWaypoint({
                  location: poi.name,
                  lat: poi.lat,
                  lng: poi.lng,
                  type: 'waypoint',
                  notes: poi.description,
                  isPOI: true
                })
                
                // Notify AI chatbot about the new POI
                const poiAddedEvent = new CustomEvent('poiAddedToRoute', {
                  detail: {
                    poi: poi,
                    position: null,
                    addedTime: 0
                  }
                })
                window.dispatchEvent(poiAddedEvent)
                
                popupRef.current?.close()
              }
            }
          }
          
          // Learn More button - opens Wikipedia search
          const learnMoreBtn = document.getElementById(`learn-more-${poi.id}`)
          if (learnMoreBtn) {
            learnMoreBtn.onclick = (event) => {
              event.preventDefault()
              event.stopPropagation()
              const searchQuery = encodeURIComponent(poi.name)
              const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`
              window.open(wikipediaUrl, '_blank', 'noopener,noreferrer')
            }
          }
          
          // Directions button - opens Google Maps directions
          const directionsBtn = document.getElementById(`directions-${poi.id}`)
          if (directionsBtn) {
            directionsBtn.onclick = (event) => {
              event.preventDefault()
              event.stopPropagation()
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`
              window.open(directionsUrl, '_blank', 'noopener,noreferrer')
            }
          }
          
          // Update dynamic content for route preview
          const dynamicContent = document.getElementById(`poi-popup-dynamic-${poi.id}`)
          if (dynamicContent) {
            if (isCalculating) {
              dynamicContent.innerHTML = `
                <div class="${styles.calculating}">
                  <span>⏳</span> Calculating route...
                </div>
              `
            } else if (routePreview && selectedPOI?.id === poi.id) {
              dynamicContent.innerHTML = `
                <div class="${styles.routeInfo}">
                  <div class="${styles.routePreviewHeader}">
                    <h4>Route Impact</h4>
                  </div>
                  <div class="${styles.timeInfo}">
                    <span class="${styles.addedTime}">
                      +${routePreview.addedTime} min
                    </span>
                    <span class="${styles.totalTime}">
                      Total: ${Math.floor(routePreview.totalTime / 60)}h ${routePreview.totalTime % 60}m
                    </span>
                  </div>
                  <button 
                    class="${styles.confirmAddButton}"
                    id="confirm-add-poi-btn-${poi.id}"
                  >
                    ✅ Confirm Add to Route
                  </button>
                </div>
              `
              // Add click handler to confirm button
              const confirmBtn = document.getElementById(`confirm-add-poi-btn-${poi.id}`)
              if (confirmBtn) {
                confirmBtn.onclick = (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setTimeout(() => handleAddPOI(), 0)
                }
              }
            } else if (!state.currentTrip) {
              dynamicContent.innerHTML = `
                <p class="${styles.noTrip}">Create a trip first to add destinations</p>
              `
            }
          }
        }, 10)
      })

      marker.addTo(map)
      poiMarkersRef.current[poi.id] = marker
    })
  }, [visiblePOIs, isCalculating, routePreview, selectedPOI, state.currentTrip, map, handlePOIClick, handleAddPOI, addWaypoint])

  // Debug zoom indicator
  return (
    <div className={styles.zoomIndicator}>
      Zoom: {map?.getZoom() || 0} | POIs: {visiblePOIs.length}
    </div>
  )
}

export default POIOverlay