import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Heart, 
  Bot, 
  Compass,
  Route,
  Sparkles,
  Settings,
  Sun,
  Moon,
  FolderOpen,
  X,
  Calendar,
  Clock,
  Navigation
} from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import SettingsPanel from '../Settings/Settings'
import styles from './Header.module.css'

const Header = () => {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('openroad-theme')
    return savedTheme === 'dark'
  })
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [savedTrips, setSavedTrips] = useState([])
  const { state, newTrip, setCurrentTrip } = useTrip()
  
  // Initialize theme on mount
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
  }, [])
  
  // Load saved trips from localStorage
  useEffect(() => {
    const trips = localStorage.getItem('openroad-saved-trips')
    if (trips) {
      try {
        setSavedTrips(JSON.parse(trips))
      } catch (e) {
        console.error('Error loading saved trips:', e)
      }
    }
  }, [showLoadModal])
  
  const handleNewTrip = () => {
    const currentTrip = state.currentTrip
    const hasWaypoints = currentTrip?.waypoints?.some(wp => wp.location)
    
    if (hasWaypoints) {
      const confirmNew = confirm('This will clear your current trip. Are you sure?')
      if (!confirmNew) return
    }

    newTrip('New Trip')
  }
  
  const handleLoadTrip = (trip) => {
    setCurrentTrip(trip)
    setShowLoadModal(false)
  }
  
  const handleDeleteSavedTrip = (tripId) => {
    const filtered = savedTrips.filter(t => t.id !== tripId)
    setSavedTrips(filtered)
    localStorage.setItem('openroad-saved-trips', JSON.stringify(filtered))
  }
  
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    const theme = newTheme ? 'dark' : 'light'
    localStorage.setItem('openroad-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.header 
      className={styles.header}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.headerContent}>
        <motion.div 
          className={styles.logoSection}
          variants={itemVariants}
        >
          <div className={styles.logoIcon}>
            <MapPin size={28} />
          </div>
          <div className={styles.logoText}>
            <h1 className={styles.logo}>OpenRoad</h1>
            <span className={styles.tagline}>Free road trip planner</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.centerInfo}
          variants={itemVariants}
        >
          <p className={styles.statusText}>AI-powered trip planning made simple</p>
        </motion.div>

        <motion.div 
          className={styles.actions}
          variants={itemVariants}
        >
          <motion.button
            className={`${styles.themeToggle} btn btn-ghost btn-icon`}
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          
          <motion.button
            className="btn btn-ghost btn-icon"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowLoadModal(true)}
            title="Load saved trip"
          >
            <FolderOpen size={18} />
          </motion.button>
          
          <motion.button
            className="btn btn-ghost btn-icon"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={18} />
          </motion.button>

          <motion.button
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewTrip}
          >
            <Sparkles size={16} />
            <span>New Trip</span>
          </motion.button>
        </motion.div>
      </div>
      
      {/* Load Trip Modal */}
      <AnimatePresence>
        {showLoadModal && (
          <>
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoadModal(false)}
            />
            <motion.div
              className={styles.loadModal}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className={styles.modalHeader}>
                <h3>Load Saved Trip</h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowLoadModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.tripsList}>
                {savedTrips.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FolderOpen size={48} />
                    <p>No saved trips yet</p>
                    <span>Save your current trip using the Save button in the itinerary</span>
                  </div>
                ) : (
                  savedTrips.map(trip => (
                    <motion.div
                      key={trip.id}
                      className={styles.tripCard}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleLoadTrip(trip)}
                    >
                      <div className={styles.tripInfo}>
                        <h4>{trip.name || 'Untitled Trip'}</h4>
                        <div className={styles.tripMeta}>
                          <span>
                            <MapPin size={14} />
                            {trip.waypoints.filter(w => w.location).length} stops
                          </span>
                          <span>
                            <Calendar size={14} />
                            {new Date(trip.updated || trip.created).toLocaleDateString()}
                          </span>
                          {trip.distance && (
                            <span>
                              <Navigation size={14} />
                              {Math.round(trip.distance / 1000)} km
                            </span>
                          )}
                        </div>
                        <div className={styles.tripRoute}>
                          {trip.waypoints
                            .filter(w => w.location)
                            .map(w => w.location)
                            .join(' → ')}
                        </div>
                      </div>
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSavedTrip(trip.id)
                        }}
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </motion.header>
  )
}

export default Header