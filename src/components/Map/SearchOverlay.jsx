import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, MapPin, X, Navigation } from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import { searchSuggestions } from '../../services/geocoding'
import styles from './SearchOverlay.module.css'

const SearchOverlay = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [debounceTimer, setDebounceTimer] = useState(null)
  
  const { addWaypoint, state } = useTrip()
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  
  // Handle search input changes with debouncing
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await searchSuggestions(searchQuery, 5)
          setSuggestions(results)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Search error:', error)
          setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      }, 300)
      
      setDebounceTimer(timer)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [searchQuery])
  
  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showSuggestions || suggestions.length === 0) return
      
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedSuggestion(prev => 
          prev === null ? 0 : Math.min(prev + 1, suggestions.length - 1)
        )
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedSuggestion(prev => 
          prev === null ? suggestions.length - 1 : Math.max(prev - 1, 0)
        )
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (selectedSuggestion !== null) {
          handleSuggestionSelect(suggestions[selectedSuggestion])
        } else if (suggestions.length > 0) {
          handleSuggestionSelect(suggestions[0])
        }
      } else if (event.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedSuggestion(null)
      }
    }
    
    if (showSuggestions) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSuggestions, suggestions, selectedSuggestion])
  
  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion) return
    
    setSearchQuery(suggestion.display_name)
    setShowSuggestions(false)
    setSelectedSuggestion(null)
    
    // Add as waypoint
    addWaypoint({
      id: `waypoint-${Date.now()}`,
      location: suggestion.display_name,
      type: 'waypoint',
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.display_name,
      date: '',
      time: '',
      notes: ''
    })
    
    // Clear search
    setSearchQuery('')
  }
  
  const handleAddStop = () => {
    if (searchQuery.trim()) {
      if (suggestions.length > 0) {
        // Use the first suggestion if available
        handleSuggestionSelect(suggestions[0])
      } else {
        // Add as a waypoint without coordinates (user can edit later)
        addWaypoint({
          id: `waypoint-${Date.now()}`,
          location: searchQuery.trim(),
          type: 'waypoint',
          lat: null,
          lng: null,
          address: '',
          date: '',
          time: '',
          notes: ''
        })
        setSearchQuery('')
      }
    }
  }
  
  const handleClearSearch = () => {
    setSearchQuery('')
    setShowSuggestions(false)
    setSelectedSuggestion(null)
    searchInputRef.current?.focus()
  }
  
  const formatAddress = (suggestion) => {
    if (!suggestion.display_name) return ''
    
    const parts = suggestion.display_name.split(',')
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`
    }
    return suggestion.display_name
  }
  
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }
  
  const suggestionsVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  }
  
  const suggestionItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  }
  
  return (
    <motion.div
      className={styles.searchOverlay}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.searchContainer}>
        <div className={styles.searchInputContainer}>
          <div className={styles.searchIcon}>
            <Search size={18} />
          </div>
          
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for places to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            className={styles.searchInput}
          />
          
          {searchQuery && (
            <motion.button
              className={styles.clearButton}
              onClick={handleClearSearch}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={14} />
            </motion.button>
          )}
          
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner} />
            </div>
          )}
        </div>
        
        <motion.button
          className={`${styles.addButton} btn btn-primary`}
          onClick={handleAddStop}
          disabled={!searchQuery.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={18} />
          Add Stop
        </motion.button>
      </div>
      
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            className={styles.suggestionsContainer}
            variants={suggestionsVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id || index}
                className={`${styles.suggestionItem} ${
                  selectedSuggestion === index ? styles.selected : ''
                }`}
                variants={suggestionItemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSuggestionSelect(suggestion)}
                onMouseEnter={() => setSelectedSuggestion(index)}
              >
                <div className={styles.suggestionIcon}>
                  <MapPin size={16} />
                </div>
                <div className={styles.suggestionContent}>
                  <div className={styles.suggestionTitle}>
                    {formatAddress(suggestion)}
                  </div>
                  {suggestion.display_name !== formatAddress(suggestion) && (
                    <div className={styles.suggestionSubtitle}>
                      {suggestion.display_name}
                    </div>
                  )}
                </div>
                {suggestion.type && (
                  <div className={styles.suggestionType}>
                    {suggestion.type}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default SearchOverlay