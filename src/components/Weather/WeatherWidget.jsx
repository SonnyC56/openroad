import { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer, Eye, Droplets, AlertTriangle } from 'lucide-react';
import weatherService from '../../services/weather';
import styles from './WeatherWidget.module.css';

const WeatherWidget = ({ location, expanded = false }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location || !location.lat || !location.lng) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        if (!weatherService.isConfigured()) {
          setError('Weather API not configured');
          setLoading(false);
          return;
        }

        const data = await weatherService.getWeatherForLocation(
          location.lat,
          location.lng
        );
        
        setWeather(data);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Unable to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location]);

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

  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.loading}>Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const WeatherIcon = getWeatherIcon(weather.condition);
  const drivingColor = weather.drivingConditions.color;

  return (
    <div className={`${styles.widget} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.header}>
        <div className={styles.mainInfo}>
          <WeatherIcon className={styles.icon} size={expanded ? 32 : 24} />
          <div className={styles.temperature}>
            {weather.temperature}°F
          </div>
          <div className={styles.condition}>
            {weather.condition}
          </div>
        </div>
        
        <div 
          className={styles.drivingStatus}
          style={{ backgroundColor: drivingColor }}
        >
          {weather.drivingConditions.safety}
        </div>
      </div>

      {expanded && (
        <>
          <div className={styles.details}>
            <div className={styles.detailItem}>
              <Thermometer size={16} />
              <span>Feels like {weather.feelsLike}°F</span>
            </div>
            <div className={styles.detailItem}>
              <Wind size={16} />
              <span>{weather.windSpeed} mph</span>
            </div>
            <div className={styles.detailItem}>
              <Droplets size={16} />
              <span>{weather.humidity}% humidity</span>
            </div>
            <div className={styles.detailItem}>
              <Eye size={16} />
              <span>{weather.visibility} mi visibility</span>
            </div>
          </div>

          {weather.recommendations.length > 0 && (
            <div className={styles.recommendations}>
              <div className={styles.recommendationHeader}>
                <AlertTriangle size={16} />
                <span>Driving Recommendations</span>
              </div>
              {weather.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`${styles.recommendation} ${styles[rec.type]}`}
                >
                  <span className={styles.recIcon}>{rec.icon}</span>
                  <span className={styles.recText}>{rec.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherWidget;