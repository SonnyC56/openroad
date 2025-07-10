import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  MapPin, 
  Flag, 
  X, 
  Calendar,
  Route,
  Save,
  Sparkles,
  Clock,
  Navigation,
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  ExternalLink
} from 'lucide-react'
import { geocodeAddress } from '../../services/geocoding'
import { calculateRoute, formatDistance, formatDuration } from '../../services/routing'
import { 
  exportToGPX, 
  exportToKML, 
  exportToGoogleMaps, 
  exportToPDF, 
  exportToCSV, 
  downloadFile 
} from '../../services/export'
import { useTrip } from '../../contexts/TripContext'
import { LocationInput } from './LocationInput'
import { RichNotes } from './RichNotes'
import styles from './TripPlanner.module.css'

// Sortable waypoint item component
const SortableWaypointItem = ({ waypoint, index, onUpdate, onRemove, getWaypointLabel, getWaypointIcon }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: waypoint.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = getWaypointIcon(waypoint.type)

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`${styles.waypointItem} ${styles[waypoint.type]} ${isDragging ? styles.dragging : ''}`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: -100 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      layout
    >
      <div className={styles.waypointHandle} {...attributes} {...listeners}>
        <GripVertical size={16} className={styles.gripIcon} />
      </div>
      
      <div className={styles.waypointMarker}>
        <Icon size={16} />
        <span className={styles.waypointLabel}>
          {getWaypointLabel(index, waypoint.type)}
        </span>
      </div>

      <div className={styles.waypointContent}>
        <div className={styles.locationGroup}>
          <LocationInput
            value={waypoint.location}
            onChange={(value) => onUpdate(waypoint.id, 'location', value)}
            onLocationSelect={(location) => onUpdate(waypoint.id, 'locationData', location)}
            placeholder={waypoint.type === 'start' ? 'Where are you starting from?' : 
                       waypoint.type === 'end' ? 'Where are you going?' : 'Add a stop along the way'}
            className={styles.locationInputField}
          />
        </div>

        <div className={styles.waypointDetails}>
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <Calendar size={14} />
              <input
                type="date"
                className={`${styles.dateInput} input`}
                value={waypoint.date}
                onChange={(e) => onUpdate(waypoint.id, 'date', e.target.value)}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <Clock size={14} />
              <input
                type="time"
                className={`${styles.timeInput} input`}
                value={waypoint.time}
                onChange={(e) => onUpdate(waypoint.id, 'time', e.target.value)}
              />
            </div>
          </div>

          {waypoint.type === 'waypoint' && (
            <motion.button
              className={`${styles.removeBtn} btn btn-ghost btn-sm`}
              onClick={() => onRemove(waypoint.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        {/* Expandable Notes Section */}
        <div className={styles.expandableSection}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            <span>Notes</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.expandedContent}
              >
                {/* Rich Notes */}
                <RichNotes
                  notes={waypoint.notes || ''}
                  onNotesChange={(notes) => onUpdate(waypoint.id, 'notes', notes)}
                  placeholder={`Add notes for ${waypoint.location || 'this location'}...`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

const TripPlanner = () => {
  const { state, setCurrentTrip, addWaypoint, updateWaypoint: updateWaypointContext, removeWaypoint: removeWaypointContext } = useTrip()
  const [routeCalculating, setRouteCalculating] = useState(false)
  const [routeError, setRouteError] = useState(null)

  const trip = state.currentTrip
  const waypoints = trip?.waypoints || []

  // Initialize current trip and waypoints if empty
  useEffect(() => {
    if (!trip) {
      setCurrentTrip({
        id: 'temp-trip',
        name: 'New Trip',
        created: new Date().toISOString(),
        waypoints: [
          { id: 'start-1', location: '', date: '', type: 'start', time: '', lat: null, lng: null, address: '', notes: '' },
          { id: 'end-1', location: '', date: '', type: 'end', time: '', lat: null, lng: null, address: '', notes: '' }
        ]
      })
    }
  }, [trip, setCurrentTrip])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addWaypointToTrip = (locationData = null) => {
    const newWaypoint = {
      id: `waypoint-${Date.now()}`,
      location: locationData?.name || '',
      date: '',
      time: '',
      type: 'waypoint',
      lat: locationData?.lat || null,
      lng: locationData?.lng || null,
      address: locationData?.address || '',
      notes: ''
    }
    
    // Insert before the last waypoint (end)
    const newWaypoints = [...waypoints.slice(0, -1), newWaypoint, waypoints[waypoints.length - 1]]
    const updatedTrip = {
      ...trip,
      waypoints: newWaypoints,
      route: null, // Reset route when adding waypoints
      distance: null,
      duration: null
    }
    setCurrentTrip(updatedTrip)
    
    // Auto-recalculate route if we have valid waypoints
    if (locationData?.lat && locationData?.lng) {
      setTimeout(() => {
        const validWaypoints = newWaypoints.filter(wp => wp.lat && wp.lng)
        if (validWaypoints.length >= 2) {
          calculateRouteForTrip()
        }
      }, 500)
    }
    
    return newWaypoint.id // Return the ID so AI can reference it
  }

  const removeWaypointFromTrip = (id) => {
    if (waypoints) {
      const newWaypoints = waypoints.filter(wp => wp.id !== id)
      setCurrentTrip({
        ...trip,
        waypoints: newWaypoints
      })
    }
  }

  const updateWaypointInTrip = async (id, field, value) => {
    if (!waypoints) return
    
    let updatedWaypoints
    
    if (field === 'locationData' && value) {
      // Handle location selection from autocomplete
      updatedWaypoints = waypoints.map(wp => 
        wp.id === id ? { 
          ...wp, 
          location: value.name,
          lat: value.lat, 
          lng: value.lng, 
          address: value.address 
        } : wp
      )
    } else {
      updatedWaypoints = waypoints.map(wp => 
        wp.id === id ? { ...wp, [field]: value } : wp
      )

      // If location is being updated manually, geocode it
      if (field === 'location' && value.trim()) {
        try {
          const results = await geocodeAddress(value)
          if (results.length > 0) {
            const { lat, lng, display_name } = results[0]
            updatedWaypoints = waypoints.map(wp => 
              wp.id === id ? { 
                ...wp, 
                lat: parseFloat(lat), 
                lng: parseFloat(lng), 
                address: display_name 
              } : wp
            )
          }
        } catch (error) {
          console.error('Geocoding error:', error)
        }
      }
    }
    
    // Update trip with new waypoints
    const updatedTrip = {
      ...trip,
      waypoints: updatedWaypoints,
      route: null, // Reset route when locations change
      distance: null,
      duration: null
    }
    setCurrentTrip(updatedTrip)
    
    // Auto-recalculate route if we have valid waypoints
    if (field === 'locationData' || (field === 'location' && value.trim())) {
      setTimeout(() => {
        const validWaypoints = updatedWaypoints.filter(wp => wp.lat && wp.lng)
        if (validWaypoints.length >= 2) {
          calculateRouteForTrip()
        }
      }, 500) // Small delay to ensure state is updated
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = waypoints.findIndex(item => item.id === active.id)
      const newIndex = waypoints.findIndex(item => item.id === over.id)
      
      // Don't allow moving start/end waypoints
      if (waypoints[oldIndex].type === 'start' || waypoints[oldIndex].type === 'end') {
        return
      }
      
      // Don't allow moving waypoints to start/end positions
      if (newIndex === 0 || newIndex === waypoints.length - 1) {
        return
      }
      
      const newWaypoints = arrayMove(waypoints, oldIndex, newIndex)
      setCurrentTrip({
        ...trip,
        waypoints: newWaypoints
      })
    }
  }

  const getWaypointLabel = (index, type) => {
    if (type === 'start') return 'A'
    if (type === 'end') return String.fromCharCode(65 + waypoints.length - 1)
    return String.fromCharCode(65 + index)
  }

  const getWaypointIcon = (type) => {
    switch (type) {
      case 'start': return MapPin
      case 'end': return Flag
      default: return Navigation
    }
  }

  const calculateRouteForTrip = async () => {
    setRouteCalculating(true)
    setRouteError(null)

    try {
      // Filter waypoints with valid coordinates
      const validWaypoints = waypoints.filter(wp => wp.lat && wp.lng)
      
      if (validWaypoints.length < 2) {
        setRouteError('Please add at least 2 locations with valid addresses')
        return
      }

      const routeData = await calculateRoute(validWaypoints)
      
      if (routeData) {
        setCurrentTrip({
          ...trip,
          route: routeData,
          distance: routeData.distance,
          duration: routeData.duration
        })
      } else {
        setRouteError('Could not calculate route. Please check your locations.')
      }
    } catch (error) {
      console.error('Route calculation error:', error)
      setRouteError('Error calculating route. Please try again.')
    } finally {
      setRouteCalculating(false)
    }
  }

  const handleExportGPX = () => {
    if (waypoints.length === 0) {
      alert('Please add waypoints to export')
      return
    }
    
    const gpxContent = exportToGPX(trip, waypoints)
    downloadFile(gpxContent, `${trip.name || 'trip'}.gpx`, 'application/gpx+xml')
  }

  const handleExportKML = () => {
    if (waypoints.length === 0) {
      alert('Please add waypoints to export')
      return
    }
    
    const kmlContent = exportToKML(trip, waypoints)
    downloadFile(kmlContent, `${trip.name || 'trip'}.kml`, 'application/vnd.google-earth.kml+xml')
  }

  const handleExportPDF = async () => {
    if (waypoints.length === 0) {
      alert('Please add waypoints to export')
      return
    }
    
    const pdfContent = await exportToPDF(trip, waypoints)
    downloadFile(pdfContent, `${trip.name || 'trip'}.txt`, 'text/plain')
  }

  const handleExportCSV = () => {
    if (waypoints.length === 0) {
      alert('Please add waypoints to export')
      return
    }
    
    const csvContent = exportToCSV(trip, waypoints)
    downloadFile(csvContent, `${trip.name || 'trip'}.csv`, 'text/csv')
  }

  const handleOpenInGoogleMaps = () => {
    const validWaypoints = waypoints.filter(wp => wp.lat && wp.lng)
    if (validWaypoints.length < 2) {
      alert('Please add at least 2 locations with coordinates')
      return
    }
    
    const googleMapsUrl = exportToGoogleMaps(validWaypoints)
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank')
    } else {
      alert('Could not create Google Maps URL')
    }
  }

  const waypointVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      x: -100,
      transition: {
        duration: 0.2
      }
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <motion.div 
      className={styles.tripPlanner}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.tripHeader}>
        <div className={styles.headerContent}>
          <Route size={24} className={styles.headerIcon} />
          <div>
            <h2>Plan Your Trip</h2>
            <p className={styles.headerSubtext}>Create amazing road trip itineraries</p>
          </div>
        </div>
        <motion.button 
          className="btn btn-primary btn-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => console.log('New trip')}
        >
          <Sparkles size={16} />
          <span>New Trip</span>
        </motion.button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <motion.div className={styles.itinerary}>
          <SortableContext items={waypoints || []} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {waypoints && waypoints.map((waypoint, index) => (
                <SortableWaypointItem
                  key={waypoint.id}
                  waypoint={waypoint}
                  index={index}
                  onUpdate={updateWaypointInTrip}
                  onRemove={removeWaypointFromTrip}
                  getWaypointLabel={getWaypointLabel}
                  getWaypointIcon={getWaypointIcon}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </motion.div>
      </DndContext>


      <motion.div 
        className={styles.tripActions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className={styles.mainActions}>
          <motion.button 
            className="btn btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={calculateRouteForTrip}
            disabled={routeCalculating}
          >
            {routeCalculating ? <Loader2 size={18} className="animate-spin" /> : <Route size={18} />}
            <span>{routeCalculating ? 'Calculating...' : 'Plan Route'}</span>
          </motion.button>
          
          <motion.button 
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Save size={18} />
            <span>Save Trip</span>
          </motion.button>
        </div>
        
        <div className={styles.exportActions}>
          <motion.button 
            className="btn btn-ghost btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportGPX}
            title="Export as GPX"
          >
            <Download size={16} />
            <span>GPX</span>
          </motion.button>
          
          <motion.button 
            className="btn btn-ghost btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportKML}
            title="Export as KML"
          >
            <Download size={16} />
            <span>KML</span>
          </motion.button>
          
          <motion.button 
            className="btn btn-ghost btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            title="Export as CSV"
          >
            <FileText size={16} />
            <span>CSV</span>
          </motion.button>
          
          <motion.button 
            className="btn btn-ghost btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenInGoogleMaps}
            title="Open in Google Maps"
          >
            <ExternalLink size={16} />
            <span>Maps</span>
          </motion.button>
        </div>
      </motion.div>

      {waypoints && waypoints.some(wp => wp.location) && (
        <motion.div 
          className={styles.tripSummary}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.5 }}
        >
          <h4>Trip Summary</h4>
          <div className={styles.summaryStats}>
            <div className={styles.stat}>
              <MapPin size={16} />
              <span>{waypoints.filter(wp => wp.location).length} stops</span>
            </div>
            <div className={styles.stat}>
              <Route size={16} />
              <span>~{Math.max(0, waypoints.filter(wp => wp.location).length - 1)} segments</span>
            </div>
            {trip.route && (
              <>
                <div className={styles.stat}>
                  <Navigation size={16} />
                  <span>{formatDistance(trip.route.distance)}</span>
                </div>
                <div className={styles.stat}>
                  <Clock size={16} />
                  <span>{formatDuration(trip.route.duration)}</span>
                </div>
              </>
            )}
          </div>
          {routeError && (
            <div className={styles.errorMessage}>
              {routeError}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export default TripPlanner