import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import L from 'leaflet'
import { 
  Navigation, 
  Maximize2, 
  Minimize2, 
  Layers, 
  MapPin, 
  Route,
  Zap,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import styles from './Map.module.css'

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const Map = () => {
  const { state } = useTrip()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const routeLineRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTileLayer, setCurrentTileLayer] = useState('osm')
  const [showTraffic, setShowTraffic] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  
  const trip = state.currentTrip
  const waypoints = trip?.waypoints || []

  const tileLayers = {
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
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map with better styling
    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([39.8283, -98.5795], 4)

    // Add initial tile layer
    L.tileLayer(tileLayers[currentTileLayer].url, {
      attribution: tileLayers[currentTileLayer].attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current)

    // Add click handler with better UX
    mapInstanceRef.current.on('click', (e) => {
      console.log('Map clicked at:', e.latlng)
      
      // Create beautiful custom marker
      const customIcon = L.divIcon({
        className: styles.customMarker,
        html: `<div class="${styles.markerIcon}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      })

      L.marker([e.latlng.lat, e.latlng.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<div class="${styles.popupContent}"><strong>Waypoint Added</strong><br/>Lat: ${e.latlng.lat.toFixed(4)}<br/>Lng: ${e.latlng.lng.toFixed(4)}</div>`)
    })

    // Cleanup function
    return () => {
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
        
        const customIcon = L.divIcon({
          className: styles.waypointMarker,
          html: `<div class="${styles.markerIcon}" style="background: ${markerColor};">
                   <span class="${styles.markerLabel}">
                     ${waypoint.type === 'start' ? 'A' : 
                       waypoint.type === 'end' ? String.fromCharCode(65 + waypoints.length - 1) : 
                       String.fromCharCode(65 + index)}
                   </span>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
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

    // Clear existing route line
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }

    // Add new route line if route exists
    if (trip?.route?.geometry) {
      const routeCoordinates = trip.route.geometry.coordinates.map(coord => [coord[1], coord[0]])
      
      routeLineRef.current = L.polyline(routeCoordinates, {
        color: '#6366f1',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(mapInstanceRef.current)
    }
  }, [trip?.route])

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
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
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
      className={`${styles.mapContainer} glass-card`}
      variants={mapVariants}
      initial="hidden"
      animate="visible"
    >
      <div ref={mapRef} className={styles.map} />
      
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

      <motion.div 
        className={styles.mapInfo}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className={styles.currentLayer}>
          <Layers size={14} />
          <span>{tileLayers[currentTileLayer].name}</span>
        </div>
      </motion.div>

      <motion.div 
        className={styles.mapInstructions}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 3 }}
      >
        <MapPin size={16} />
        <span>Click anywhere on the map to add waypoints</span>
      </motion.div>
    </motion.div>
  )
}

export default Map