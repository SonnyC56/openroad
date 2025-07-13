import { useState } from 'react';
import { Key, ExternalLink, CheckCircle } from 'lucide-react';
import weatherService from '../../services/weather';
import styles from './WeatherApiSetup.module.css';

const WeatherApiSetup = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Store the API key
      weatherService.setApiKey(apiKey);
      
      // Test the API key with a sample request
      const testWeather = await weatherService.getWeatherForLocation(40.7128, -74.0060);
      
      if (testWeather) {
        onComplete();
      } else {
        setError('Invalid API key. Please check and try again.');
        weatherService.setApiKey(''); // Clear invalid key
      }
    } catch (err) {
      setError('Failed to verify API key. Please ensure it\'s valid.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={styles.setupCard}>
      <div className={styles.header}>
        <Key className={styles.icon} />
        <h3>Weather Integration Setup</h3>
      </div>
      
      <p className={styles.description}>
        To enable weather features, you'll need a free OpenWeatherMap API key.
      </p>

      <div className={styles.steps}>
        <h4>Quick Setup:</h4>
        <ol>
          <li>
            Visit{' '}
            <a 
              href="https://openweathermap.org/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              OpenWeatherMap <ExternalLink size={12} />
            </a>
          </li>
          <li>Sign up for a free account</li>
          <li>Copy your API key from the dashboard</li>
          <li>Paste it below</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenWeatherMap API key"
            className={styles.input}
            disabled={isVerifying}
          />
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={isVerifying || !apiKey.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Enable Weather'}
          </button>
        </div>
        
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
      </form>

      <div className={styles.benefits}>
        <h4><CheckCircle size={16} /> What you'll get:</h4>
        <ul>
          <li>Real-time weather for each waypoint</li>
          <li>Driving condition warnings</li>
          <li>5-day weather forecasts</li>
          <li>Smart route recommendations</li>
        </ul>
      </div>
    </div>
  );
};

export default WeatherApiSetup;