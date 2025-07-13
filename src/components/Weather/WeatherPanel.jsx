import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Cloud, CloudRain, CloudSnow, Sun, Wind, 
  Thermometer, Eye, Droplets, AlertTriangle,
  MapPin, Calendar, Clock, ChevronRight
} from 'lucide-react';
import weatherService from '../../services/weather';
import WeatherApiSetup from '../Sidebar/WeatherApiSetup';
import styles from './WeatherPanel.module.css';

const WeatherPanel = ({ isOpen, onClose, waypoints }) => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSetup, setShowSetup] = useState(!weatherService.isConfigured());
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [view, setView] = useState('current'); // current, forecast, route

  useEffect(() => {
    if (isOpen && weatherService.isConfigured() && waypoints?.length > 0) {
      fetchWeatherData();
    }
  }, [isOpen, waypoints]);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.getRouteWeather(waypoints);
      setWeatherData(data);
      setSelectedWaypoint(data[0]);
    } catch (err) {
      setError('Unable to fetch weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition) => {
    const iconMap = {
      'Clear': Sun,
      'Clouds': Cloud,
      'Rain': CloudRain,
      'Snow': CloudSnow,
      'Wind': Wind
    };
    return iconMap[condition] || Cloud;
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    if (waypoints?.length > 0) {
      fetchWeatherData();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <Cloud className={styles.headerIcon} />
                <h2>Weather & Conditions</h2>
              </div>
              <button className={styles.closeButton} onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* View Tabs */}
            {!showSetup && weatherData.length > 0 && (
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${view === 'current' ? styles.active : ''}`}
                  onClick={() => setView('current')}
                >
                  <Sun size={16} />
                  Current
                </button>
                <button
                  className={`${styles.tab} ${view === 'forecast' ? styles.active : ''}`}
                  onClick={() => setView('forecast')}
                >
                  <Calendar size={16} />
                  Forecast
                </button>
                <button
                  className={`${styles.tab} ${view === 'route' ? styles.active : ''}`}
                  onClick={() => setView('route')}
                >
                  <MapPin size={16} />
                  Route
                </button>
              </div>
            )}

            {/* Content */}
            <div className={styles.content}>
              {showSetup ? (
                <WeatherApiSetup onComplete={handleSetupComplete} />
              ) : loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner} />
                  <p>Loading weather data...</p>
                </div>
              ) : error ? (
                <div className={styles.error}>
                  <AlertTriangle size={24} />
                  <p>{error}</p>
                  <button onClick={fetchWeatherData}>Try Again</button>
                </div>
              ) : weatherData.length === 0 ? (
                <div className={styles.empty}>
                  <Cloud size={48} />
                  <p>No waypoints in your trip yet</p>
                  <span>Add some stops to see weather information</span>
                </div>
              ) : (
                <div className={styles.weatherContent}>
                  {view === 'current' && selectedWaypoint && (
                    <CurrentWeatherView 
                      waypoint={selectedWaypoint}
                      getWeatherIcon={getWeatherIcon}
                    />
                  )}
                  
                  {view === 'forecast' && selectedWaypoint && (
                    <ForecastView 
                      waypoint={selectedWaypoint}
                      getWeatherIcon={getWeatherIcon}
                    />
                  )}
                  
                  {view === 'route' && (
                    <RouteWeatherView 
                      weatherData={weatherData}
                      selectedWaypoint={selectedWaypoint}
                      onSelectWaypoint={setSelectedWaypoint}
                      getWeatherIcon={getWeatherIcon}
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Current Weather View Component
const CurrentWeatherView = ({ waypoint, getWeatherIcon }) => {
  if (!waypoint.weather) return null;
  
  const { weather } = waypoint;
  const WeatherIcon = getWeatherIcon(weather.condition);
  
  return (
    <div className={styles.currentWeather}>
      <div className={styles.locationHeader}>
        <MapPin size={16} />
        <h3>{waypoint.location || 'Location'}</h3>
      </div>
      
      <div className={styles.mainWeather}>
        <div className={styles.tempSection}>
          <WeatherIcon size={64} className={styles.mainIcon} />
          <div className={styles.temperature}>
            <span className={styles.mainTemp}>{weather.temperature}°</span>
            <span className={styles.feelsLike}>Feels like {weather.feelsLike}°</span>
          </div>
        </div>
        
        <div className={styles.condition}>
          <h4>{weather.condition}</h4>
          <p>{weather.description}</p>
        </div>
      </div>
      
      <div className={styles.details}>
        <div className={styles.detailItem}>
          <Wind size={20} />
          <div>
            <span className={styles.detailLabel}>Wind</span>
            <span className={styles.detailValue}>{weather.windSpeed} mph</span>
          </div>
        </div>
        
        <div className={styles.detailItem}>
          <Droplets size={20} />
          <div>
            <span className={styles.detailLabel}>Humidity</span>
            <span className={styles.detailValue}>{weather.humidity}%</span>
          </div>
        </div>
        
        <div className={styles.detailItem}>
          <Eye size={20} />
          <div>
            <span className={styles.detailLabel}>Visibility</span>
            <span className={styles.detailValue}>{weather.visibility} mi</span>
          </div>
        </div>
        
        <div className={styles.detailItem}>
          <Thermometer size={20} />
          <div>
            <span className={styles.detailLabel}>Pressure</span>
            <span className={styles.detailValue}>{weather.pressure} mb</span>
          </div>
        </div>
      </div>
      
      {/* Driving Conditions */}
      <div className={styles.drivingSection}>
        <h4>Driving Conditions</h4>
        <div 
          className={styles.drivingStatus}
          style={{ backgroundColor: weather.drivingConditions.color }}
        >
          <span>{weather.drivingConditions.safety.toUpperCase()}</span>
        </div>
        
        {weather.recommendations.length > 0 && (
          <div className={styles.recommendations}>
            {weather.recommendations.map((rec, index) => (
              <div key={index} className={`${styles.recommendation} ${styles[rec.type]}`}>
                <span className={styles.recIcon}>{rec.icon}</span>
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Forecast View Component
const ForecastView = ({ waypoint, getWeatherIcon }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchForecast();
  }, [waypoint]);
  
  const fetchForecast = async () => {
    setLoading(true);
    try {
      const data = await weatherService.getForecast(
        waypoint.lat,
        waypoint.lng
      );
      setForecast(data);
    } catch (err) {
      console.error('Forecast error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div className={styles.loading}>Loading forecast...</div>;
  if (!forecast) return null;
  
  return (
    <div className={styles.forecast}>
      <div className={styles.locationHeader}>
        <MapPin size={16} />
        <h3>{waypoint.location || 'Location'} - 5 Day Forecast</h3>
      </div>
      
      <div className={styles.forecastDays}>
        {forecast.map((day, index) => {
          const Icon = getWeatherIcon(day.condition);
          return (
            <div key={index} className={styles.forecastDay}>
              <span className={styles.dayName}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <Icon size={32} className={styles.forecastIcon} />
              <div className={styles.temps}>
                <span className={styles.high}>{day.high}°</span>
                <span className={styles.low}>{day.low}°</span>
              </div>
              {day.precipitation > 0 && (
                <span className={styles.precipitation}>
                  {day.precipitation}" rain
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Route Weather View Component
const RouteWeatherView = ({ weatherData, selectedWaypoint, onSelectWaypoint, getWeatherIcon }) => {
  return (
    <div className={styles.routeWeather}>
      <h3>Weather Along Your Route</h3>
      
      <div className={styles.waypointsList}>
        {weatherData.map((waypoint, index) => {
          if (!waypoint.weather) return null;
          
          const Icon = getWeatherIcon(waypoint.weather.condition);
          const isSelected = selectedWaypoint?.id === waypoint.id;
          
          return (
            <motion.div
              key={index}
              className={`${styles.waypointCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelectWaypoint(waypoint)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.waypointInfo}>
                <div className={styles.waypointHeader}>
                  <MapPin size={14} />
                  <h4>{waypoint.location || 'Location'}</h4>
                </div>
                
                <div className={styles.waypointWeather}>
                  <Icon size={24} />
                  <span className={styles.temp}>{waypoint.weather.temperature}°</span>
                  <span className={styles.desc}>{waypoint.weather.condition}</span>
                </div>
                
                <div 
                  className={styles.miniDrivingStatus}
                  style={{ backgroundColor: waypoint.weather.drivingConditions.color }}
                >
                  {waypoint.weather.drivingConditions.safety}
                </div>
              </div>
              
              <ChevronRight size={16} className={styles.chevron} />
            </motion.div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className={styles.routeSummary}>
        <h4>Route Summary</h4>
        <div className={styles.summaryItems}>
          <div className={styles.summaryItem}>
            <span>Best Conditions</span>
            <span className={styles.good}>
              {weatherData.filter(w => w.weather?.drivingConditions.safety === 'excellent').length} stops
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span>Caution Needed</span>
            <span className={styles.caution}>
              {weatherData.filter(w => 
                w.weather?.drivingConditions.safety === 'fair' || 
                w.weather?.drivingConditions.safety === 'use caution'
              ).length} stops
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span>Poor Conditions</span>
            <span className={styles.poor}>
              {weatherData.filter(w => 
                w.weather?.drivingConditions.safety === 'poor' || 
                w.weather?.drivingConditions.safety === 'dangerous'
              ).length} stops
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;