import { useEffect, useState } from 'react';
import { Cloud, Car, AlertTriangle, Info } from 'lucide-react';
import weatherService from '../../services/weather';
import trafficService from '../../services/traffic';
import styles from './WeatherTrafficIntegration.module.css';

const WeatherTrafficIntegration = ({ waypoints, onRecommendation }) => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(weatherService.isConfigured());

  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      fetchRouteData();
    }
  }, [waypoints]);

  const fetchRouteData = async () => {
    setLoading(true);
    try {
      const [weatherData, trafficData] = await Promise.all([
        weatherEnabled ? weatherService.getRouteWeather(waypoints) : Promise.resolve(null),
        trafficService.getRouteTraffic(waypoints)
      ]);

      const analysis = analyzeRouteConditions(weatherData, trafficData);
      setRouteData({ weather: weatherData, traffic: trafficData, analysis });
      
      if (analysis.recommendations.length > 0 && onRecommendation) {
        onRecommendation(analysis.recommendations);
      }
    } catch (error) {
      console.error('Error fetching route data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRouteConditions = (weatherData, trafficData) => {
    const recommendations = [];
    let totalDelay = 0;
    let hasWeatherWarnings = false;
    let hasTrafficIssues = false;

    // Analyze weather conditions
    if (weatherData) {
      weatherData.forEach((wp, index) => {
        if (wp.weather) {
          if (wp.weather.drivingConditions.safety === 'dangerous') {
            hasWeatherWarnings = true;
            recommendations.push({
              type: 'weather',
              severity: 'high',
              location: wp.name,
              message: `Dangerous weather conditions at ${wp.name}: ${wp.weather.description}`,
              suggestion: 'Consider delaying travel or finding alternate route'
            });
          } else if (wp.weather.drivingConditions.safety === 'use caution') {
            recommendations.push({
              type: 'weather',
              severity: 'medium',
              location: wp.name,
              message: `Caution: ${wp.weather.description} at ${wp.name}`,
              suggestion: wp.weather.recommendations[0]?.text || 'Drive carefully'
            });
          }
        }
      });
    }

    // Analyze traffic conditions
    if (trafficData) {
      trafficData.forEach(segment => {
        totalDelay += segment.traffic.delay;
        
        if (segment.traffic.level >= 3) {
          hasTrafficIssues = true;
          recommendations.push({
            type: 'traffic',
            severity: segment.traffic.level === 4 ? 'high' : 'medium',
            location: `${segment.from} to ${segment.to}`,
            message: `${segment.traffic.text} expected, ${segment.traffic.delay} min delay`,
            suggestion: segment.alternateRoutes.length > 0 
              ? `Consider ${segment.alternateRoutes[0].name}` 
              : 'Allow extra time for delays'
          });
        }

        // Check for incidents
        segment.traffic.incidents.forEach(incident => {
          recommendations.push({
            type: 'incident',
            severity: incident.severity === 'major' ? 'high' : 'medium',
            location: segment.from,
            message: `${incident.type}: ${incident.description}`,
            suggestion: `Expected ${incident.delay} min additional delay`
          });
        });
      });
    }

    // Calculate optimal departure time
    const optimalDeparture = calculateOptimalDeparture(weatherData, trafficData);
    if (optimalDeparture) {
      recommendations.unshift({
        type: 'timing',
        severity: 'info',
        message: optimalDeparture.message,
        suggestion: optimalDeparture.suggestion
      });
    }

    return {
      totalDelay,
      hasWeatherWarnings,
      hasTrafficIssues,
      recommendations,
      optimalDeparture
    };
  };

  const calculateOptimalDeparture = (weatherData, trafficData) => {
    const now = new Date();
    const hour = now.getHours();
    
    // Check if currently in rush hour
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    if (isRushHour && isWeekday) {
      const nextGoodTime = hour < 12 ? new Date(now.setHours(10, 0, 0, 0)) : new Date(now.setHours(20, 0, 0, 0));
      return {
        message: 'Currently rush hour traffic',
        suggestion: `Consider departing after ${nextGoodTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      };
    }
    
    return null;
  };

  if (!routeData || loading) {
    return null;
  }

  const { analysis } = routeData;

  return (
    <div className={styles.integration}>
      {analysis.recommendations.length > 0 && (
        <div className={styles.recommendations}>
          <div className={styles.header}>
            <AlertTriangle size={16} />
            <span>Route Conditions & Recommendations</span>
          </div>
          
          {analysis.recommendations.map((rec, index) => (
            <div 
              key={index} 
              className={`${styles.recommendation} ${styles[rec.severity]}`}
            >
              <div className={styles.recIcon}>
                {rec.type === 'weather' ? <Cloud size={14} /> :
                 rec.type === 'traffic' ? <Car size={14} /> :
                 rec.type === 'timing' ? <Info size={14} /> :
                 <AlertTriangle size={14} />}
              </div>
              <div className={styles.recContent}>
                <div className={styles.recMessage}>{rec.message}</div>
                <div className={styles.recSuggestion}>{rec.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {analysis.totalDelay > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Total Expected Delays:</span>
            <span className={styles.value}>{analysis.totalDelay} minutes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTrafficIntegration;