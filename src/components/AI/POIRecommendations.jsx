import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Star, 
  Clock, 
  DollarSign, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Plus,
  Camera,
  Utensils,
  Mountain,
  Building,
  Fuel,
  Bed
} from 'lucide-react'
import { aiService } from '../../services/ai'
import { searchService } from '../../services/search'
import styles from './POIRecommendations.module.css'

export const POIRecommendations = ({ routeSegment, waypoints, onAddWaypoint }) => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedType, setSelectedType] = useState('all')

  const poiTypes = [
    { id: 'all', label: 'All', icon: MapPin },
    { id: 'restaurant', label: 'Food', icon: Utensils },
    { id: 'attraction', label: 'Attractions', icon: Camera },
    { id: 'scenic', label: 'Scenic', icon: Mountain },
    { id: 'historical', label: 'Historical', icon: Building },
    { id: 'gas', label: 'Gas', icon: Fuel },
    { id: 'hotel', label: 'Hotels', icon: Bed }
  ]

  const generateRecommendations = async () => {
    if (!routeSegment || !routeSegment.from || !routeSegment.to) {
      setError('Please select a route segment')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create AI prompt for POI recommendations
      const systemPrompt = `You are a travel expert providing point-of-interest recommendations along a specific route. 
      
      Route: ${routeSegment.from} to ${routeSegment.to}
      
      Please suggest 5-8 interesting places to visit along or near this route. For each suggestion, provide:
      - Name of the place
      - Type (restaurant, attraction, scenic, historical, gas, hotel)
      - Brief description (1-2 sentences)
      - Estimated visit duration
      - Approximate cost level (free, $, $$, $$$)
      - Why it's worth visiting
      
      Focus on places that are:
      - Actually along or near the route
      - Interesting and worth a stop
      - Diverse in type and appeal
      - Accessible to travelers
      
      Format your response as a JSON array with this structure:
      [
        {
          "name": "Place Name",
          "type": "attraction",
          "description": "Brief description",
          "duration": "1-2 hours",
          "cost": "$$",
          "reason": "Why visit",
          "location": "City, State"
        }
      ]`

      // Get AI recommendations
      const aiResponse = await aiService.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Find interesting places along the route from ${routeSegment.from} to ${routeSegment.to}` }
      ])

      // Parse AI response
      let aiRecommendations = []
      try {
        const jsonMatch = aiResponse.content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          aiRecommendations = JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.warn('Could not parse AI recommendations as JSON')
      }

      // Enhance with web search for each recommendation
      const enhancedRecommendations = await Promise.all(
        aiRecommendations.map(async (rec) => {
          try {
            const searchResults = await searchService.searchTravel(
              `${rec.name} ${rec.location}`,
              rec.location,
              { searchType: 'places', maxResults: 3 }
            )
            
            return {
              ...rec,
              id: Date.now() + Math.random(),
              searchResults: searchResults.slice(0, 2), // Include top 2 search results
              rating: Math.random() * 2 + 3, // Mock rating 3-5
              distance: `${Math.floor(Math.random() * 50 + 5)} miles`, // Mock distance
              verified: searchResults.length > 0
            }
          } catch (searchError) {
            console.warn('Search error for', rec.name, searchError)
            return {
              ...rec,
              id: Date.now() + Math.random(),
              searchResults: [],
              rating: Math.random() * 2 + 3,
              distance: `${Math.floor(Math.random() * 50 + 5)} miles`,
              verified: false
            }
          }
        })
      )

      setRecommendations(enhancedRecommendations)
    } catch (error) {
      console.error('POI recommendation error:', error)
      setError('Failed to generate recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateRecommendations()
  }, [routeSegment])

  const getTypeIcon = (type) => {
    const typeMap = {
      restaurant: Utensils,
      attraction: Camera,
      scenic: Mountain,
      historical: Building,
      gas: Fuel,
      hotel: Bed
    }
    return typeMap[type] || MapPin
  }

  const getCostColor = (cost) => {
    switch (cost) {
      case 'free': return 'var(--success-500)'
      case '$': return 'var(--success-600)'
      case '$$': return 'var(--warning-500)'
      case '$$$': return 'var(--error-500)'
      default: return 'var(--text-secondary)'
    }
  }

  const filteredRecommendations = selectedType === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.type === selectedType)

  const handleAddToPlan = (recommendation) => {
    if (onAddWaypoint) {
      onAddWaypoint({
        name: recommendation.name,
        location: recommendation.location,
        notes: `${recommendation.description}\n\nDuration: ${recommendation.duration}\nCost: ${recommendation.cost}\n\n${recommendation.reason}`,
        type: 'waypoint'
      })
    }
  }

  return (
    <div className={styles.poiRecommendations}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MapPin size={20} />
          <div>
            <h3>Points of Interest</h3>
            <p>AI-powered recommendations along your route</p>
          </div>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={loading}
          className={styles.refreshButton}
        >
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
        </button>
      </div>

      {routeSegment && (
        <div className={styles.routeInfo}>
          <span>Route: {routeSegment.from} → {routeSegment.to}</span>
        </div>
      )}

      <div className={styles.typeFilter}>
        {poiTypes.map(type => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`${styles.typeButton} ${selectedType === type.id ? styles.active : ''}`}
            >
              <Icon size={16} />
              <span>{type.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Generating recommendations...</span>
        </div>
      )}

      <AnimatePresence>
        {filteredRecommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.recommendations}
          >
            {filteredRecommendations.map((rec) => {
              const TypeIcon = getTypeIcon(rec.type)
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={styles.recommendation}
                >
                  <div className={styles.recHeader}>
                    <div className={styles.recTitle}>
                      <TypeIcon size={16} />
                      <h4>{rec.name}</h4>
                      {rec.verified && (
                        <span className={styles.verified}>✓</span>
                      )}
                    </div>
                    <div className={styles.recMeta}>
                      <div className={styles.rating}>
                        <Star size={14} />
                        <span>{rec.rating.toFixed(1)}</span>
                      </div>
                      <span className={styles.distance}>{rec.distance}</span>
                    </div>
                  </div>

                  <p className={styles.description}>{rec.description}</p>
                  
                  <div className={styles.details}>
                    <div className={styles.detail}>
                      <Clock size={14} />
                      <span>{rec.duration}</span>
                    </div>
                    <div className={styles.detail}>
                      <DollarSign size={14} style={{ color: getCostColor(rec.cost) }} />
                      <span style={{ color: getCostColor(rec.cost) }}>{rec.cost}</span>
                    </div>
                  </div>

                  <div className={styles.reason}>
                    <strong>Why visit:</strong> {rec.reason}
                  </div>

                  {rec.searchResults.length > 0 && (
                    <div className={styles.searchResults}>
                      <h5>More info:</h5>
                      {rec.searchResults.map((result, index) => (
                        <a
                          key={index}
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.searchLink}
                        >
                          <ExternalLink size={12} />
                          <span>{result.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleAddToPlan(rec)}
                    className={styles.addButton}
                  >
                    <Plus size={16} />
                    <span>Add to Plan</span>
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && filteredRecommendations.length === 0 && !error && (
        <div className={styles.empty}>
          <MapPin size={24} />
          <p>No recommendations found for this route segment</p>
          <button onClick={generateRecommendations} className={styles.retryButton}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}