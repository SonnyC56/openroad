import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import Map from './components/Map/Map'
import AIOverlay from './components/AI/AIOverlay'
import { TripProvider } from './contexts/TripContext'
import './App.css'

function App() {
  return (
    <TripProvider>
      <div className="app">
        <Header />
        <main className="main">
          <Sidebar />
          <div className="map-container">
            <Map />
            <AIOverlay />
          </div>
        </main>
      </div>
    </TripProvider>
  )
}

export default App
