import axios from 'axios'

// OpenWeatherMap API (users will need to provide their own API key)
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5'

// Get current weather for a location
export const getCurrentWeather = async (lat, lng, apiKey) => {
  if (!apiKey) {
    console.warn('Weather API key not provided')
    return null
  }
  
  try {
    const response = await axios.get(`${OWM_BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: apiKey,
        units: 'metric'
      }
    })
    
    const data = response.data
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      visibility: data.visibility,
      pressure: data.main.pressure,
      cloudiness: data.clouds.all
    }
  } catch (error) {
    console.error('Weather error:', error)
    return null
  }
}

// Get 5-day forecast for a location
export const getForecast = async (lat, lng, apiKey) => {
  if (!apiKey) {
    console.warn('Weather API key not provided')
    return null
  }
  
  try {
    const response = await axios.get(`${OWM_BASE_URL}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: apiKey,
        units: 'metric'
      }
    })
    
    const data = response.data
    return data.list.map(item => ({
      datetime: new Date(item.dt * 1000),
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg,
      cloudiness: item.clouds.all,
      rain: item.rain?.['3h'] || 0,
      snow: item.snow?.['3h'] || 0
    }))
  } catch (error) {
    console.error('Forecast error:', error)
    return null
  }
}

// Get weather alerts for a location
export const getWeatherAlerts = async (lat, lng, apiKey) => {
  if (!apiKey) {
    console.warn('Weather API key not provided')
    return null
  }
  
  try {
    const response = await axios.get(`${OWM_BASE_URL}/onecall`, {
      params: {
        lat,
        lon: lng,
        appid: apiKey,
        exclude: 'minutely,hourly,daily'
      }
    })
    
    return response.data.alerts || []
  } catch (error) {
    console.error('Weather alerts error:', error)
    return []
  }
}

// Get weather icon URL
export const getWeatherIconUrl = (icon, size = '2x') => {
  return `https://openweathermap.org/img/wn/${icon}@${size}.png`
}

// Get weather description with emoji
export const getWeatherEmoji = (description) => {
  const desc = description.toLowerCase()
  if (desc.includes('clear')) return '☀️'
  if (desc.includes('cloud')) return '☁️'
  if (desc.includes('rain')) return '🌧️'
  if (desc.includes('snow')) return '❄️'
  if (desc.includes('storm') || desc.includes('thunder')) return '⛈️'
  if (desc.includes('fog') || desc.includes('mist')) return '🌫️'
  if (desc.includes('wind')) return '💨'
  return '🌤️'
}

// Check if weather conditions are good for travel
export const isTravelFriendly = (weather) => {
  if (!weather) return true
  
  const badConditions = [
    'thunderstorm',
    'heavy rain',
    'snow',
    'blizzard',
    'fog',
    'freezing'
  ]
  
  const description = weather.description.toLowerCase()
  const hasStrongWind = weather.windSpeed > 15 // > 15 m/s
  const hasLowVisibility = weather.visibility < 5000 // < 5km
  
  return !badConditions.some(condition => description.includes(condition)) &&
         !hasStrongWind && 
         !hasLowVisibility
}