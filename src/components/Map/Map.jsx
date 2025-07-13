import { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import L from 'leaflet'
// Import only specific icons to reduce bundle size
import Navigation from 'lucide-react/dist/esm/icons/navigation'
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2'
import Minimize2 from 'lucide-react/dist/esm/icons/minimize-2'
import Layers from 'lucide-react/dist/esm/icons/layers'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Route from 'lucide-react/dist/esm/icons/route'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Eye from 'lucide-react/dist/esm/icons/eye'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Star from 'lucide-react/dist/esm/icons/star'
import { useTrip } from '../../contexts/TripContext'
import POIOverlay from './POIOverlay'
import SearchOverlay from './SearchOverlay'
import TrafficOverlay from '../Traffic/TrafficOverlay'
import styles from './Map.module.css'

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const Map = memo(() => {
  const { state, setSelectedLeg } = useTrip()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const routeLineRef = useRef(null)
  const routeSegmentsRef = useRef([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTileLayer, setCurrentTileLayer] = useState('osm')
  const [showTraffic, setShowTraffic] = useState(false)
  const [showPOIs, setShowPOIs] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  
  const trip = state.currentTrip
  const waypoints = useMemo(() => trip?.waypoints || [], [trip?.waypoints])
  const selectedLeg = state.selectedLeg

  // Handle segment click for AI interaction - memoized to prevent unnecessary re-renders
  const handleSegmentClick = useCallback((segmentInfo) => {
    // Set the selected leg in context
    setSelectedLeg(segmentInfo.legIndex)
    
    // Create a custom event to notify AI overlay about segment selection (without auto-message)
    const segmentClickEvent = new CustomEvent('routeSegmentSelect', {
      detail: {
        segmentInfo
      }
    })
    window.dispatchEvent(segmentClickEvent)
  }, [setSelectedLeg])

  // Memoize tile layers config to prevent recreation on every render
  const tileLayers = useMemo(() => ({
    osm: {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    satellite: {
      name: 'Satellite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri'
    },
    terrain: {
      name: 'Terrain',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap contributors'
    }
  }), [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map with better styling
    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,  // Re-enable attribution
      // Ensure proper initial rendering
      preferCanvas: true,
      renderer: L.canvas(),
      // Prevent any automatic adjustments
      keyboard: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      tap: true,
      tapTolerance: 15,
      trackResize: false  // We'll handle resizing manually
    }).setView([39.8283, -98.5795], 4)

    // Add initial tile layer
    L.tileLayer(tileLayers[currentTileLayer].url, {
      attribution: tileLayers[currentTileLayer].attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current)

    // Make map instance available globally for agentic AI
    window.mapInstance = mapInstanceRef.current

    // Ensure map is properly sized when ready
    mapInstanceRef.current.whenReady(() => {
      // Double invalidate to ensure proper sizing
      mapInstanceRef.current.invalidateSize();
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 100);
    });

    // Map click functionality removed - use the trip planner or AI assistant to add waypoints

    // Handle container resize and ensure proper initial size
    const resizeObserver = new ResizeObserver((entries) => {
      if (mapInstanceRef.current && entries[0]) {
        // Only invalidate if the container has actual dimensions
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          mapInstanceRef.current.invalidateSize();
        }
      }
    });
    
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
      
      // Initial size check after a brief delay to ensure DOM is ready
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
    }

    // Cleanup function
    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update waypoint markers when waypoints change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = {}

    // Add new markers for waypoints with coordinates
    waypoints.forEach((waypoint, index) => {
      if (waypoint.lat && waypoint.lng) {
        const markerColor = waypoint.type === 'start' ? '#10b981' : 
                           waypoint.type === 'end' ? '#ef4444' : '#6366f1'
        
        // Create beautiful modern icon with gradients and glassmorphism
        const markerGradient = waypoint.type === 'start' ? 'linear-gradient(135deg, #10b981, #059669, #047857)' : 
                               waypoint.type === 'end' ? 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)' : 
                               'linear-gradient(135deg, #6366f1, #4f46e5, #4338ca)'
        
        const markerShadow = waypoint.type === 'start' ? 'rgba(16, 185, 129, 0.4)' : 
                             waypoint.type === 'end' ? 'rgba(239, 68, 68, 0.4)' : 
                             'rgba(99, 102, 241, 0.4)'
        
        const customIcon = L.divIcon({
          className: styles.waypointMarker,
          html: `
            <div class="${styles.modernMarkerWrapper}">
              <div class="${styles.modernMarkerIcon}" style="
                background: ${markerGradient};
                box-shadow: 0 8px 32px ${markerShadow}, 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3);
              ">
                <div class="${styles.markerInnerGlow}"></div>
                <span class="${styles.modernMarkerLabel}">
                  ${waypoint.type === 'start' ? 'A' : 
                    waypoint.type === 'end' ? String.fromCharCode(65 + waypoints.length - 1) : 
                    String.fromCharCode(65 + index)}
                </span>
                <div class="${styles.modernSparkleContainer}">
                  <div class="${styles.modernSparkle}"></div>
                  <div class="${styles.modernSparkle}"></div>
                  <div class="${styles.modernSparkle}"></div>
                  <div class="${styles.modernSparkle}"></div>
                </div>
              </div>
              <div class="${styles.markerTail}" style="background: ${markerGradient};"></div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 50]
        })

        const marker = L.marker([waypoint.lat, waypoint.lng], { icon: customIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div class="${styles.waypointPopup}">
              <strong>${waypoint.location || 'Waypoint'}</strong>
              ${waypoint.address ? `<br/><small>${waypoint.address}</small>` : ''}
              ${waypoint.notes ? `<br/><br/>${waypoint.notes}` : ''}
            </div>
          `)

        markersRef.current[waypoint.id] = marker
      }
    })

    // Fit map to show all waypoints
    const validWaypoints = waypoints.filter(wp => wp.lat && wp.lng)
    if (validWaypoints.length > 0) {
      const bounds = L.latLngBounds(validWaypoints.map(wp => [wp.lat, wp.lng]))
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [waypoints])

  // Update route line when trip route changes
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing route line and segments
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }

    // Clear any existing route segments
    routeSegmentsRef.current.forEach(segment => {
      mapInstanceRef.current.removeLayer(segment)
    })
    routeSegmentsRef.current = []

    // Add new route with interactive segments
    if (trip?.route?.geometry && trip?.route?.legs) {
      const fullRouteCoordinates = trip.route.geometry.coordinates.map(coord => [coord[1], coord[0]])
      
      // Create the full route line (lighter/background)
      routeLineRef.current = L.polyline(fullRouteCoordinates, {
        color: '#e5e7eb',
        weight: 6,
        opacity: 0.4,
        smoothFactor: 1
      }).addTo(mapInstanceRef.current)

      // Create interactive segments for each leg
      const validWaypoints = waypoints.filter(wp => wp.lat && wp.lng)
      if (validWaypoints.length >= 2 && trip.route.legs) {
        // Calculate cumulative distances to accurately split the route
        let cumulativeDistance = 0
        const legDistances = trip.route.legs.map(leg => {
          const start = cumulativeDistance
          cumulativeDistance += leg.distance || 0
          return { start, end: cumulativeDistance }
        })
        const totalDistance = cumulativeDistance
        
        trip.route.legs.forEach((leg, legIndex) => {
          if (legIndex < validWaypoints.length - 1) {
            // Get waypoints for this leg
            const startWaypoint = validWaypoints[legIndex]
            const endWaypoint = validWaypoints[legIndex + 1]
            
            // Extract coordinates for this leg segment
            const legCoordinates = []
            
            // Calculate which portion of the full route this leg represents
            const legStartRatio = totalDistance > 0 ? legDistances[legIndex].start / totalDistance : 0
            const legEndRatio = totalDistance > 0 ? legDistances[legIndex].end / totalDistance : 1
            
            // Find the segment of coordinates that corresponds to this leg
            const totalCoords = fullRouteCoordinates.length
            const segmentStart = Math.floor(legStartRatio * totalCoords)
            const segmentEnd = Math.min(Math.floor(legEndRatio * totalCoords), totalCoords - 1)
            
            // Add coordinates for this leg (without duplicating start/end points)
            for (let i = segmentStart; i <= segmentEnd; i++) {
              legCoordinates.push(fullRouteCoordinates[i])
            }
            
            // Ensure we have at least 2 points for a valid polyline
            if (legCoordinates.length < 2) {
              legCoordinates.push([startWaypoint.lat, startWaypoint.lng])
              legCoordinates.push([endWaypoint.lat, endWaypoint.lng])
            }
            
            // Create interactive segment with highlighting for selected leg
            const isSelected = selectedLeg === legIndex
            const segment = L.polyline(legCoordinates, {
              color: isSelected ? '#4f46e5' : '#6366f1',
              weight: isSelected ? 6 : 4,
              opacity: isSelected ? 1 : 0.8,
              smoothFactor: 1,
              interactive: true
            })
            
            // Add hover effects (only if not selected)
            segment.on('mouseover', function(e) {
              if (!isSelected) {
                this.setStyle({
                  color: '#4f46e5',
                  weight: 6,
                  opacity: 1
                })
              }
            })
            
            segment.on('mouseout', function(e) {
              if (!isSelected) {
                this.setStyle({
                  color: '#6366f1',
                  weight: 4,
                  opacity: 0.8
                })
              }
            })
            
            // Add click handler for AI interaction
            segment.on('click', function(e) {
              const fromLocation = startWaypoint.location || `Waypoint ${legIndex + 1}`
              const toLocation = endWaypoint.location || `Waypoint ${legIndex + 2}`
              const distance = leg.distance ? Math.round(leg.distance / 1000) : 0
              const duration = leg.duration ? Math.round(leg.duration / 60) : 0
              
              // Trigger AI chat about this segment
              handleSegmentClick({
                legIndex,
                from: fromLocation,
                to: toLocation,
                distance: `${distance} km`,
                duration: `${duration} min`,
                coordinates: legCoordinates
              })
            })
            
            // Bind popup with segment info
            const popupContent = `
              <div style="font-size: 14px; line-height: 1.4;">
                <strong>${startWaypoint.location || `Stop ${legIndex + 1}`}</strong><br/>
                <span style="color: #666;">to</span><br/>
                <strong>${endWaypoint.location || `Stop ${legIndex + 2}`}</strong><br/>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                  📏 ${Math.round(leg.distance / 1000)} km &nbsp;•&nbsp; 🕒 ${Math.round(leg.duration / 60)} min<br/>
                  <em>Click to discuss this segment with AI</em>
                </div>
              </div>
            `
            segment.bindPopup(popupContent)
            
            segment.addTo(mapInstanceRef.current)
            routeSegmentsRef.current.push(segment)
          }
        })
      }
    }
  }, [trip?.route, waypoints, selectedLeg])

  // Handle fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleLocate = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setIsLocating(true)
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      const { latitude, longitude } = position.coords
      mapInstanceRef.current?.setView([latitude, longitude], 15)
      
      // Create custom location marker
      const locationIcon = L.divIcon({
        className: styles.locationMarker,
        html: `<div class="${styles.locationIcon}"><div class="${styles.locationPulse}"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      L.marker([latitude, longitude], { icon: locationIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div class="${styles.popupContent}"><strong>📍 You are here!</strong><br/>Accuracy: ±${Math.round(position.coords.accuracy)}m</div>`)
        .openPopup()

    } catch (error) {
      console.error('Geolocation error:', error)
      alert('Unable to retrieve your location. Please check your permissions.')
    } finally {
      setIsLocating(false)
    }
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const switchTileLayer = () => {
    const layers = Object.keys(tileLayers)
    const currentIndex = layers.indexOf(currentTileLayer)
    const nextIndex = (currentIndex + 1) % layers.length
    const nextLayer = layers[nextIndex]
    
    setCurrentTileLayer(nextLayer)
    
    // Remove current tiles and add new ones
    mapInstanceRef.current?.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer)
      }
    })
    
    L.tileLayer(tileLayers[nextLayer].url, {
      attribution: tileLayers[nextLayer].attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current)
  }

  const mapVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const controlsVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        delay: 0.2,
        staggerChildren: 0.1
      }
    }
  }

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }

  return (
    <motion.div 
      className={styles.mapContainer}
      variants={mapVariants}
      initial="hidden"
      animate="visible"
    >
      <div ref={mapRef} className={styles.map} />
      
      {/* POI Overlay for clickable road trip destinations */}
      {showPOIs && mapInstanceRef.current && (
        <POIOverlay map={mapInstanceRef.current} />
      )}
      
      {/* Traffic Overlay */}
      {showTraffic && mapInstanceRef.current && state.currentTrip?.waypoints && (
        <TrafficOverlay 
          waypoints={state.currentTrip.waypoints} 
          visible={showTraffic}
          map={mapInstanceRef.current} 
        />
      )}
      
      {/* Search Overlay for adding new stops */}
      <SearchOverlay />
      
      <motion.div 
        className={styles.mapControls}
        variants={controlsVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon`}
          onClick={handleLocate}
          disabled={isLocating}
          title="Find my location"
          variants={buttonVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isLocating ? (
            <div className="loading-spinner" />
          ) : (
            <Navigation size={18} />
          )}
        </motion.button>

        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon`}
          onClick={switchTileLayer}
          title={`Switch to ${tileLayers[Object.keys(tileLayers)[(Object.keys(tileLayers).indexOf(currentTileLayer) + 1) % Object.keys(tileLayers).length]].name}`}
          variants={buttonVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Layers size={18} />
        </motion.button>

        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon`}
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? "Hide traffic" : "Show traffic"}
          variants={buttonVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {showTraffic ? <EyeOff size={18} /> : <Eye size={18} />}
        </motion.button>

        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon ${showPOIs ? 'active' : ''}`}
          onClick={() => setShowPOIs(!showPOIs)}
          title={showPOIs ? "Hide points of interest" : "Show points of interest"}
          variants={buttonVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Star size={18} />
        </motion.button>

        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon ${showTraffic ? 'active' : ''}`}
          onClick={() => setShowTraffic(!showTraffic)}
          title={showTraffic ? "Hide traffic" : "Show traffic"}
          variants={buttonVariants}
          initial="rest"
          animate="rest"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span style={{ fontSize: '18px' }}>🚦</span>
        </motion.button>

        <motion.button
          className={`${styles.mapBtn} btn btn-secondary btn-icon`}
          onClick={handleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          variants={buttonVariants}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </motion.button>
      </motion.div>


    </motion.div>
  )
})

// Display name for debugging
Map.displayName = 'Map'

export default Map