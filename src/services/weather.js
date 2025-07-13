/**
 * Weather Service for OpenRoad
 * Provides real-time weather data for trip planning
 */

const WEATHER_API_KEY = 'openweather_api_key'; // Users will need to set this
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Weather condition mappings for recommendations
const WEATHER_CONDITIONS = {
  CLEAR: ['clear sky', 'few clouds'],
  PARTLY_CLOUDY: ['scattered clouds', 'broken clouds'],
  CLOUDY: ['overcast clouds'],
  RAIN: ['light rain', 'moderate rain', 'heavy intensity rain', 'shower rain'],
  STORM: ['thunderstorm', 'heavy thunderstorm'],
  SNOW: ['light snow', 'snow', 'heavy snow'],
  FOG: ['mist', 'fog', 'haze'],
  EXTREME: ['tornado', 'hurricane', 'extreme']
};

// Weather impact on driving conditions
const DRIVING_CONDITIONS = {
  EXCELLENT: { speed: 1.0, safety: 'excellent', color: '#10b981' },
  GOOD: { speed: 0.95, safety: 'good', color: '#3b82f6' },
  FAIR: { speed: 0.85, safety: 'fair', color: '#f59e0b' },
  POOR: { speed: 0.7, safety: 'use caution', color: '#ef4444' },
  DANGEROUS: { speed: 0.5, safety: 'dangerous', color: '#dc2626' }
};

class WeatherService {
  constructor() {
    this.cache = new Map();
    this.apiKey = localStorage.getItem('openweather_api_key') || '';
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('openweather_api_key', key);
  }

  isConfigured() {
    return this.apiKey && this.apiKey !== 'openweather_api_key';
  }

  /**
   * Get weather for a specific location
   */
  async getWeatherForLocation(lat, lon) {
    if (!this.isConfigured()) {
      throw new Error('Weather API key not configured');
    }

    // Validate coordinates
    if (lat === undefined || lat === null || lon === undefined || lon === null) {
      throw new Error('Invalid coordinates provided');
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid API key
          this.apiKey = '';
          localStorage.removeItem('openweather_api_key');
          throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        }
        throw new Error(`Weather API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const weather = this.parseWeatherData(data);
      
      this.cache.set(cacheKey, {
        data: weather,
        timestamp: Date.now()
      });

      return weather;
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  }

  /**
   * Get weather forecast for next 5 days
   */
  async getForecast(lat, lon) {
    if (!this.isConfigured()) {
      throw new Error('Weather API key not configured');
    }

    try {
      const response = await fetch(
        `${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`
      );

      if (!response.ok) {
        throw new Error('Weather forecast API request failed');
      }

      const data = await response.json();
      return this.parseForecastData(data);
    } catch (error) {
      console.error('Forecast fetch error:', error);
      return null;
    }
  }

  /**
   * Get weather for entire route
   */
  async getRouteWeather(waypoints) {
    if (!this.isConfigured()) {
      return waypoints.map(wp => ({ ...wp, weather: null }));
    }

    const weatherPromises = waypoints.map(async (waypoint) => {
      // Skip waypoints without coordinates
      if (!waypoint.lat || !waypoint.lng) {
        return { ...waypoint, weather: null };
      }
      
      try {
        const weather = await this.getWeatherForLocation(
          waypoint.lat,
          waypoint.lng
        );
        return { ...waypoint, weather };
      } catch (error) {
        console.error(`Failed to get weather for waypoint ${waypoint.location}:`, error);
        return { ...waypoint, weather: null };
      }
    });

    return Promise.all(weatherPromises);
  }

  /**
   * Parse raw weather data into usable format
   */
  parseWeatherData(data) {
    const condition = data.weather[0].description.toLowerCase();
    const mainCondition = data.weather[0].main.toLowerCase();
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      windSpeed: Math.round(data.wind.speed),
      windDirection: data.wind.deg,
      humidity: data.main.humidity,
      visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : null,
      pressure: data.main.pressure,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      drivingConditions: this.calculateDrivingConditions(data),
      recommendations: this.generateWeatherRecommendations(data)
    };
  }

  /**
   * Parse forecast data
   */
  parseForecastData(data) {
    const dailyForecasts = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date: new Date(item.dt * 1000),
          temps: [],
          conditions: [],
          precipitation: 0
        };
      }
      
      dailyForecasts[date].temps.push(item.main.temp);
      dailyForecasts[date].conditions.push(item.weather[0].main);
      
      if (item.rain && item.rain['3h']) {
        dailyForecasts[date].precipitation += item.rain['3h'];
      }
    });

    return Object.values(dailyForecasts).map(day => ({
      date: day.date,
      high: Math.round(Math.max(...day.temps)),
      low: Math.round(Math.min(...day.temps)),
      condition: this.getMostFrequent(day.conditions),
      precipitation: day.precipitation.toFixed(1)
    }));
  }

  /**
   * Calculate driving conditions based on weather
   */
  calculateDrivingConditions(weatherData) {
    const condition = weatherData.weather[0].description.toLowerCase();
    const visibility = weatherData.visibility || 10000;
    const windSpeed = weatherData.wind.speed;
    const isRaining = condition.includes('rain');
    const isSnowing = condition.includes('snow');
    const isStormy = condition.includes('storm');
    const isFoggy = condition.includes('fog') || condition.includes('mist');

    if (isStormy || visibility < 1000 || windSpeed > 40) {
      return DRIVING_CONDITIONS.DANGEROUS;
    } else if (isSnowing || (isRaining && windSpeed > 25)) {
      return DRIVING_CONDITIONS.POOR;
    } else if (isRaining || isFoggy || visibility < 3000) {
      return DRIVING_CONDITIONS.FAIR;
    } else if (windSpeed > 20 || visibility < 5000) {
      return DRIVING_CONDITIONS.GOOD;
    } else {
      return DRIVING_CONDITIONS.EXCELLENT;
    }
  }

  /**
   * Generate weather-based recommendations
   */
  generateWeatherRecommendations(weatherData) {
    const recommendations = [];
    const condition = weatherData.weather[0].description.toLowerCase();
    const temp = weatherData.main.temp;
    const windSpeed = weatherData.wind.speed;
    const visibility = weatherData.visibility || 10000;

    // Temperature recommendations
    if (temp > 95) {
      recommendations.push({
        type: 'warning',
        icon: '🌡️',
        text: 'Extreme heat - stay hydrated and take frequent breaks'
      });
    } else if (temp < 32) {
      recommendations.push({
        type: 'warning',
        icon: '❄️',
        text: 'Freezing conditions - watch for ice on roads'
      });
    }

    // Precipitation recommendations
    if (condition.includes('rain')) {
      recommendations.push({
        type: 'caution',
        icon: '🌧️',
        text: 'Wet roads - reduce speed and increase following distance'
      });
    } else if (condition.includes('snow')) {
      recommendations.push({
        type: 'warning',
        icon: '🌨️',
        text: 'Snow conditions - consider chains and drive slowly'
      });
    }

    // Visibility recommendations
    if (visibility < 1000) {
      recommendations.push({
        type: 'warning',
        icon: '🌫️',
        text: 'Poor visibility - use fog lights and reduce speed significantly'
      });
    }

    // Wind recommendations
    if (windSpeed > 30) {
      recommendations.push({
        type: 'caution',
        icon: '💨',
        text: 'High winds - be cautious of crosswinds and debris'
      });
    }

    // Time of day recommendations
    const now = new Date();
    const sunrise = new Date(weatherData.sys.sunrise * 1000);
    const sunset = new Date(weatherData.sys.sunset * 1000);
    
    if (now < sunrise || now > sunset) {
      recommendations.push({
        type: 'info',
        icon: '🌙',
        text: 'Night driving - ensure headlights are clean and working'
      });
    }

    return recommendations;
  }

  /**
   * Get most frequent element in array
   */
  getMostFrequent(arr) {
    const frequency = {};
    let maxFreq = 0;
    let mostFrequent = arr[0];

    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  /**
   * Get weather alerts for a location
   */
  async getWeatherAlerts(lat, lon) {
    // This would integrate with NWS API for US locations
    // For now, return mock alerts based on conditions
    const weather = await this.getWeatherForLocation(lat, lon);
    if (!weather) return [];

    const alerts = [];
    
    if (weather.condition.toLowerCase().includes('storm')) {
      alerts.push({
        type: 'severe',
        title: 'Thunderstorm Warning',
        description: 'Severe thunderstorms possible in the area'
      });
    }

    if (weather.temperature > 100) {
      alerts.push({
        type: 'warning',
        title: 'Excessive Heat Warning',
        description: 'Dangerously hot conditions expected'
      });
    }

    if (weather.temperature < 20) {
      alerts.push({
        type: 'warning',
        title: 'Winter Weather Advisory',
        description: 'Cold temperatures may create hazardous conditions'
      });
    }

    return alerts;
  }
}

export default new WeatherService();