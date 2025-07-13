import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, X, Loader2 } from 'lucide-react'
import { searchSuggestions } from '../../services/geocoding'
import styles from './LocationInput.module.css'

export const LocationInput = ({ 
  value, 
  onChange, 
  onLocationSelect, 
  placeholder = "Enter location...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const timeoutRef = useRef(null)

  // Only update input value when a location is actually selected, not from parent
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value)
    }
  }, [value, inputValue])

  // Calculate dropdown position when suggestions appear
  useEffect(() => {
    if (isOpen && suggestions.length > 0 && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: inputRect.bottom + 8, // Fixed positioning doesn't need scroll offset
        left: inputRect.left,
        width: inputRect.width
      })
    }
  }, [isOpen, suggestions.length])

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is on the input or dropdown
      if (inputRef.current && inputRef.current.contains(event.target)) {
        return // Don't close if clicking on input
      }
      
      // Check if the click is on a suggestion button
      const dropdown = document.querySelector(`.${styles.dropdown}`)
      if (dropdown && dropdown.contains(event.target)) {
        return // Don't close if clicking on dropdown
      }
      
      // Close dropdown if clicking outside
      setIsOpen(false)
      setSelectedIndex(-1)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Show suggestions as user types (debounced)
    if (newValue.trim().length > 2) {
      timeoutRef.current = setTimeout(() => {
        searchLocations(newValue)
      }, 300)
    } else {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
    }
  }

  const searchLocations = async (query) => {
    console.log('🔍 Searching for:', query)
    setIsLoading(true)
    setSelectedIndex(-1)
    
    try {
      const results = await searchSuggestions(query)
      console.log('📍 Search results:', results.length, 'locations found')
      console.log('🔧 Input value:', inputValue.trim(), 'Query:', query.trim(), 'Match:', inputValue.trim() === query.trim())
      // Only update if the input value hasn't changed (avoid race conditions)
      setSuggestions(results.slice(0, 5)) // Limit to 5 suggestions
      setIsOpen(results.length > 0)
      console.log('✅ Dropdown should be open:', results.length > 0)
    } catch (error) {
      console.error('Search error:', error)
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    const locationText = suggestion.display_name.split(',')[0] // Use just the main name
    setInputValue(locationText)
    setIsOpen(false)
    setSelectedIndex(-1)
    setSuggestions([])
    
    // Clear any pending search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Call both callbacks to ensure proper update
    if (onChange) {
      onChange(locationText)
    }
    
    if (onLocationSelect) {
      onLocationSelect({
        name: locationText,
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lng || suggestion.lon), // Handle both lng and lon
        address: suggestion.display_name,
        type: suggestion.type || 'location'
      })
    }
  }

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (isOpen && selectedIndex >= 0 && suggestions.length > 0) {
          // Select the highlighted suggestion
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (inputValue.trim().length > 2) {
          // Search for the current input value
          searchLocations(inputValue.trim())
        }
        break
      case 'ArrowDown':
        if (isOpen && suggestions.length > 0) {
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        if (isOpen && suggestions.length > 0) {
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleClear = () => {
    setInputValue('')
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
    
    // Clear timeout to prevent search after clearing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    inputRef.current?.focus()
  }

  const getLocationIcon = (type) => {
    // Return appropriate icon based on location type
    return <MapPin size={16} />
  }

  const formatDisplayName = (displayName) => {
    // Format long display names to be more readable
    const parts = displayName.split(',')
    if (parts.length > 3) {
      return parts.slice(0, 3).join(', ') + '...'
    }
    return displayName
  }

  return (
    <div className={`${styles.locationInput} ${className}`} ref={dropdownRef}>
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <Search className={styles.searchIcon} size={16} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true)
              }
            }}
            placeholder={placeholder}
            className={styles.input}
            disabled={disabled}
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className={styles.loadingIcon} size={16} />
          )}
          {inputValue && !isLoading && (
            <button
              onClick={handleClear}
              className={styles.clearButton}
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && createPortal(
        <div
          className={styles.dropdown}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id || index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.selected : ''
              }`}
            >
              <div className={styles.suggestionIcon}>
                {getLocationIcon(suggestion.type)}
              </div>
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionTitle}>
                  {suggestion.display_name.split(',')[0]}
                </div>
                <div className={styles.suggestionSubtitle}>
                  {formatDisplayName(suggestion.display_name)}
                </div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}