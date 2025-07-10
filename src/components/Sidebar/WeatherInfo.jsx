import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind,
  Thermometer,
  Droplets,
  Eye,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { getCurrentWeather, getForecast, getWeatherEmoji, isTravelFriendly } from '../../services/weather'
import styles from './WeatherInfo.module.css'

export const WeatherInfo = ({ waypoint, apiKey }) => {
  const [weatherData, setWeatherData] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForecast, setShowForecast] = useState(false)

  const fetchWeather = async () => {
    if (!waypoint.lat || !waypoint.lng || !apiKey) return

    setLoading(true)
    setError(null)

    try {
      const [currentWeather, forecastData] = await Promise.all([
        getCurrentWeather(waypoint.lat, waypoint.lng, apiKey),
        getForecast(waypoint.lat, waypoint.lng, apiKey)
      ])

      setWeatherData(currentWeather)
      setForecast(forecastData)
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError('Failed to fetch weather data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
  }, [waypoint.lat, waypoint.lng, apiKey])

  const getWeatherIcon = (description, size = 20) => {
    const desc = description?.toLowerCase() || ''
    
    if (desc.includes('clear') || desc.includes('sunny')) {
      return <Sun size={size} className={styles.sunIcon} />
    }
    if (desc.includes('cloud')) {
      return <Cloud size={size} className={styles.cloudIcon} />
    }
    if (desc.includes('rain') || desc.includes('drizzle')) {
      return <CloudRain size={size} className={styles.rainIcon} />
    }
    if (desc.includes('snow')) {
      return <CloudSnow size={size} className={styles.snowIcon} />
    }
    if (desc.includes('storm') || desc.includes('thunder')) {
      return <CloudLightning size={size} className={styles.stormIcon} />
    }
    
    return <Cloud size={size} className={styles.cloudIcon} />
  }

  const formatTime = (datetime) => {
    return new Date(datetime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (datetime) => {
    return new Date(datetime).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!apiKey) {
    return (
      <div className={styles.weatherInfo}>
        <div className={styles.header}>
          <Cloud size={16} />
          <span>Weather</span>
        </div>
        <div className={styles.noApiKey}>
          <AlertTriangle size={16} />
          <span>Weather API key required</span>
        </div>
      </div>
    )
  }

  if (!waypoint.lat || !waypoint.lng) {
    return (
      <div className={styles.weatherInfo}>
        <div className={styles.header}>
          <Cloud size={16} />
          <span>Weather</span>
        </div>
        <div className={styles.noLocation}>
          <span>Add location to see weather</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.weatherInfo}>
      <div className={styles.header}>
        <Cloud size={16} />
        <span>Weather</span>
        {weatherData && (
          <button
            onClick={fetchWeather}
            className={styles.refreshButton}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && !weatherData && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading weather...</span>
        </div>
      )}

      {weatherData && (
        <div className={styles.currentWeather}>
          <div className={styles.weatherMain}>
            <div className={styles.weatherIcon}>
              {getWeatherIcon(weatherData.description, 24)}
            </div>
            <div className={styles.weatherDetails}>
              <div className={styles.temperature}>
                {weatherData.temperature}°C
              </div>
              <div className={styles.description}>
                {weatherData.description}
              </div>
              <div className={styles.feelsLike}>
                Feels like {weatherData.feelsLike}°C
              </div>
            </div>
          </div>

          <div className={styles.weatherStats}>
            <div className={styles.stat}>
              <Droplets size={14} />
              <span>{weatherData.humidity}%</span>
            </div>
            <div className={styles.stat}>
              <Wind size={14} />
              <span>{Math.round(weatherData.windSpeed)} m/s</span>
            </div>
            <div className={styles.stat}>
              <Eye size={14} />
              <span>{(weatherData.visibility / 1000).toFixed(1)} km</span>
            </div>
          </div>

          {!isTravelFriendly(weatherData) && (
            <div className={styles.travelWarning}>
              <AlertTriangle size={14} />
              <span>Weather may affect travel</span>
            </div>
          )}

          {forecast && forecast.length > 0 && (
            <div className={styles.forecastSection}>
              <button
                onClick={() => setShowForecast(!showForecast)}
                className={styles.forecastToggle}
              >
                {showForecast ? 'Hide' : 'Show'} 5-day forecast
              </button>

              <AnimatePresence>
                {showForecast && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={styles.forecast}
                  >
                    {forecast.slice(0, 12).map((item, index) => (
                      <div key={index} className={styles.forecastItem}>
                        <div className={styles.forecastTime}>
                          {index === 0 ? 'Now' : formatTime(item.datetime)}
                        </div>
                        <div className={styles.forecastIcon}>
                          {getWeatherIcon(item.description, 16)}
                        </div>
                        <div className={styles.forecastTemp}>
                          {item.temperature}°
                        </div>
                        <div className={styles.forecastDesc}>
                          {item.description}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}