import { useState, useCallback, useEffect } from 'react'
import { Search, Coffee, Fuel, Hotel, ShoppingBag, Utensils, MapPin } from 'lucide-react'
import { useTrip } from '../../contexts/TripContext'
import { searchAlongRoute } from '../../services/routing'
import styles from './SearchAlongRoute.module.css'

const SEARCH_CATEGORIES = [
  { id: 'food', label: 'Food', icon: Utensils, keywords: ['restaurant', 'food', 'dining'] },
  { id: 'gas', label: 'Gas', icon: Fuel, keywords: ['gas station', 'fuel', 'petrol'] },
  { id: 'hotel', label: 'Hotels', icon: Hotel, keywords: ['hotel', 'motel', 'lodging'] },
  { id: 'coffee', label: 'Coffee', icon: Coffee, keywords: ['coffee', 'cafe', 'starbucks'] },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, keywords: ['shopping', 'mall', 'store'] },
  { id: 'attraction', label: 'Attractions', icon: MapPin, keywords: ['attraction', 'tourist', 'museum'] }
]

const SearchAlongRoute = ({ onResultSelect }) => {
  const { state } = useTrip()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [maxDetour, setMaxDetour] = useState(5) // minutes

  const handleSearch = useCallback(async () => {
    if (!state.currentTrip?.route || (!searchQuery && !selectedCategory)) return

    setIsSearching(true)
    try {
      const query = selectedCategory 
        ? SEARCH_CATEGORIES.find(c => c.id === selectedCategory)?.keywords[0] 
        : searchQuery

      const results = await searchAlongRoute({
        route: state.currentTrip.route,
        query,
        maxDetourMinutes: maxDetour,
        limit: 20
      })

      setSearchResults(results)
    } catch (error) {
      console.error('Search along route failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [state.currentTrip, searchQuery, selectedCategory, maxDetour])

  // Expose search functionality for AI agent
  useEffect(() => {
    window.__searchAlongRoute = async (query, category) => {
      const searchCategory = category ? SEARCH_CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category.toLowerCase()) : null
      
      if (searchCategory) {
        setSelectedCategory(searchCategory.id)
      } else {
        setSearchQuery(query)
      }
      
      return handleSearch()
    }

    return () => {
      delete window.__searchAlongRoute
    }
  }, [handleSearch])

  if (!state.currentTrip?.route) {
    return null
  }

  return (
    <div className={styles.searchAlongRoute}>
      <div className={styles.searchHeader}>
        <h3>Search Along Route</h3>
        <div className={styles.detourControl}>
          <label>Max detour:</label>
          <select 
            value={maxDetour} 
            onChange={(e) => setMaxDetour(Number(e.target.value))}
            className={styles.detourSelect}
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
          </select>
        </div>
      </div>

      <div className={styles.searchInput}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Search for places along your route..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className={styles.input}
        />
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className={styles.searchButton}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className={styles.categories}>
        {SEARCH_CATEGORIES.map(category => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id === selectedCategory ? null : category.id)
                setSearchQuery('')
              }}
              className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.selected : ''}`}
            >
              <Icon size={20} />
              <span>{category.label}</span>
            </button>
          )
        })}
      </div>

      {searchResults.length > 0 && (
        <div className={styles.results}>
          <h4>{searchResults.length} results found</h4>
          <div className={styles.resultsList}>
            {searchResults.map((result, index) => (
              <div 
                key={index}
                className={styles.resultItem}
                onClick={() => onResultSelect(result)}
              >
                <div className={styles.resultIcon}>
                  <MapPin size={16} />
                </div>
                <div className={styles.resultContent}>
                  <h5>{result.name}</h5>
                  <p>{result.address}</p>
                  <div className={styles.resultMeta}>
                    <span className={styles.detourTime}>
                      +{result.detourMinutes} min detour
                    </span>
                    {result.rating && (
                      <span className={styles.rating}>
                        ⭐ {result.rating}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  className={styles.addButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    onResultSelect(result, true)
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchAlongRoute