import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Settings as SettingsIcon, Moon, Sun, Map, Key, 
  Globe, Palette, Volume2, Info, Save 
} from 'lucide-react';
import styles from './Settings.module.css';

const Settings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('openroad-theme') || 'light',
    mapStyle: localStorage.getItem('openroad-map-style') || 'osm',
    units: localStorage.getItem('openroad-units') || 'imperial',
    soundEnabled: localStorage.getItem('openroad-sound') !== 'false',
    openWeatherApiKey: localStorage.getItem('openweather_api_key') || '',
    geminiApiKey: localStorage.getItem('gemini_api_key') || ''
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Save to localStorage
    switch(key) {
      case 'theme':
        localStorage.setItem('openroad-theme', value);
        document.documentElement.setAttribute('data-theme', value);
        break;
      case 'mapStyle':
        localStorage.setItem('openroad-map-style', value);
        break;
      case 'units':
        localStorage.setItem('openroad-units', value);
        break;
      case 'soundEnabled':
        localStorage.setItem('openroad-sound', value.toString());
        break;
      case 'openWeatherApiKey':
        localStorage.setItem('openweather_api_key', value);
        break;
      case 'geminiApiKey':
        localStorage.setItem('gemini_api_key', value);
        break;
    }
  };

  const mapStyles = [
    { value: 'osm', label: 'OpenStreetMap' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'terrain', label: 'Terrain' }
  ];

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
          
          {/* Settings Panel */}
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <SettingsIcon size={24} className={styles.headerIcon} />
                <h2>Settings</h2>
              </div>
              <button 
                className={styles.closeButton}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.content}>
              {/* Appearance Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Appearance</h3>
                
                <div className={styles.settingItem}>
                  <div className={styles.settingLabel}>
                    <Palette size={18} />
                    <span>Theme</span>
                  </div>
                  <div className={styles.themeToggle}>
                    <button
                      className={`${styles.themeOption} ${settings.theme === 'light' ? styles.active : ''}`}
                      onClick={() => handleSettingChange('theme', 'light')}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                    <button
                      className={`${styles.themeOption} ${settings.theme === 'dark' ? styles.active : ''}`}
                      onClick={() => handleSettingChange('theme', 'dark')}
                    >
                      <Moon size={16} />
                      Dark
                    </button>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.settingLabel}>
                    <Map size={18} />
                    <span>Map Style</span>
                  </div>
                  <select 
                    className={styles.select}
                    value={settings.mapStyle}
                    onChange={(e) => handleSettingChange('mapStyle', e.target.value)}
                  >
                    {mapStyles.map(style => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferences Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Preferences</h3>
                
                <div className={styles.settingItem}>
                  <div className={styles.settingLabel}>
                    <Globe size={18} />
                    <span>Units</span>
                  </div>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="units"
                        value="imperial"
                        checked={settings.units === 'imperial'}
                        onChange={(e) => handleSettingChange('units', e.target.value)}
                      />
                      <span>Imperial (mi, °F)</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="units"
                        value="metric"
                        checked={settings.units === 'metric'}
                        onChange={(e) => handleSettingChange('units', e.target.value)}
                      />
                      <span>Metric (km, °C)</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.settingLabel}>
                    <Volume2 size={18} />
                    <span>Sound Effects</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {/* API Keys Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>API Keys</h3>
                
                <div className={styles.apiKeyItem}>
                  <div className={styles.settingLabel}>
                    <Key size={18} />
                    <span>OpenWeather API Key</span>
                  </div>
                  <input
                    type="password"
                    className={styles.input}
                    value={settings.openWeatherApiKey}
                    onChange={(e) => handleSettingChange('openWeatherApiKey', e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <p className={styles.hint}>
                    Get your free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer">OpenWeatherMap</a>
                  </p>
                </div>

                <div className={styles.apiKeyItem}>
                  <div className={styles.settingLabel}>
                    <Key size={18} />
                    <span>Gemini API Key</span>
                  </div>
                  <input
                    type="password"
                    className={styles.input}
                    value={settings.geminiApiKey}
                    onChange={(e) => handleSettingChange('geminiApiKey', e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <p className={styles.hint}>
                    Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                  </p>
                </div>
              </div>

              {/* About Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>About</h3>
                
                <div className={styles.aboutContent}>
                  <div className={styles.aboutItem}>
                    <Info size={18} />
                    <span>Version 1.0.0</span>
                  </div>
                  <p className={styles.aboutText}>
                    OpenRoad is a free, open-source road trip planner powered by AI. 
                    Plan your perfect journey with smart recommendations and real-time information.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Settings;