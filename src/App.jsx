import { useState, lazy, Suspense } from 'react'
import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import FloatingMenu from './components/FloatingMenu/FloatingMenu'
import WeatherPanel from './components/Weather/WeatherPanel'
import { TripProvider, useTrip } from './contexts/TripContext'
import weatherService from './services/weather'
import './App.css'

// Lazy load heavy components
const Map = lazy(() => import('./components/Map/Map'))
const AIOverlay = lazy(() => import('./components/AI/AIOverlay'))
const OnboardingOverlay = lazy(() => import('./components/Onboarding/OnboardingOverlay'))

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showWeatherPanel, setShowWeatherPanel] = useState(false)
  const { state } = useTrip()

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleWeatherClick = (action) => {
    setShowWeatherPanel(true)
  }

  const handleExportClick = (format) => {
    // Import export functions dynamically to avoid circular dependencies
    import('./services/export').then(({ exportGPX, exportKML, exportCSV, exportToGoogleMaps }) => {
      const trip = state.currentTrip
      if (!trip) return
      
      switch(format) {
        case 'gpx':
          exportGPX(trip)
          break
        case 'kml':
          exportKML(trip)
          break
        case 'csv':
          exportCSV(trip)
          break
        case 'google':
          exportToGoogleMaps(trip)
          break
      }
    })
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Sidebar />
        <div className="map-container">
          <Suspense fallback={
            <div className="loading-container glass-card">
              <div className="loading-spinner" />
              <span>Loading map...</span>
            </div>
          }>
            <Map />
          </Suspense>
          <Suspense fallback={
            <div className="ai-loading-container">
              <div className="loading-spinner" />
              <span>Loading AI assistant...</span>
            </div>
          }>
            <AIOverlay />
          </Suspense>
        </div>
      </main>
      
      <FloatingMenu 
        onWeatherClick={handleWeatherClick}
        onExportClick={handleExportClick}
        onSettingsClick={() => console.log('Settings clicked')}
        onHelpClick={() => setShowOnboarding(true)}
        hasWeatherKey={weatherService.isConfigured()}
        tripData={state.currentTrip}
      />
      
      <WeatherPanel 
        isOpen={showWeatherPanel}
        onClose={() => setShowWeatherPanel(false)}
        waypoints={state.currentTrip?.waypoints || []}
      />
      
      <Suspense fallback={null}>
        <OnboardingOverlay onComplete={handleOnboardingComplete} />
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <TripProvider>
      <AppContent />
    </TripProvider>
  )
}

export default App
