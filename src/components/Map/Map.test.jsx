import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import Map from './Map'
import { TripProvider } from '../../contexts/TripContext'

// Mock Leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    remove: vi.fn(),
    fitBounds: vi.fn(),
    removeLayer: vi.fn(),
    addTo: vi.fn(),
    eachLayer: vi.fn()
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn()
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn()
  })),
  polyline: vi.fn(() => ({
    addTo: vi.fn(),
    on: vi.fn(),
    bindPopup: vi.fn(),
    setStyle: vi.fn()
  })),
  divIcon: vi.fn(),
  latLngBounds: vi.fn(() => ({})),
  Icon: {
    Default: {
      prototype: { _getIconUrl: vi.fn() },
      mergeOptions: vi.fn()
    }
  }
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  }
}))

const renderWithTripProvider = (component) => {
  return render(
    <TripProvider>
      {component}
    </TripProvider>
  )
}

describe('Map Component', () => {
  let mockMapInstance

  beforeEach(() => {
    // Mock DOM element for map container
    const mapContainer = document.createElement('div')
    vi.spyOn(document, 'createElement').mockReturnValue(mapContainer)
    
    // Mock geolocation
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn()
    }
    
    // Clear global map instance
    window.mapInstance = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders map container and controls', () => {
      renderWithTripProvider(<Map />)
      
      expect(screen.getByRole('button', { name: /find my location/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /hide traffic/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeInTheDocument()
    })

    it('displays current tile layer name', () => {
      renderWithTripProvider(<Map />)
      
      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument()
    })
  })

  describe('Map Controls', () => {
    it('handles location request', async () => {
      const mockGetCurrentPosition = vi.fn((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10
          }
        })
      })
      
      global.navigator.geolocation.getCurrentPosition = mockGetCurrentPosition
      
      renderWithTripProvider(<Map />)
      
      const locationButton = screen.getByRole('button', { name: /find my location/i })
      fireEvent.click(locationButton)
      
      await waitFor(() => {
        expect(mockGetCurrentPosition).toHaveBeenCalled()
      })
    })

    it('handles geolocation errors gracefully', async () => {
      const mockGetCurrentPosition = vi.fn((success, error) => {
        error(new Error('Location denied'))
      })
      
      global.navigator.geolocation.getCurrentPosition = mockGetCurrentPosition
      global.alert = vi.fn()
      
      renderWithTripProvider(<Map />)
      
      const locationButton = screen.getByRole('button', { name: /find my location/i })
      fireEvent.click(locationButton)
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Unable to retrieve your location. Please check your permissions.'
        )
      })
    })

    it('cycles through tile layers', () => {
      renderWithTripProvider(<Map />)
      
      const layerButton = screen.getByRole('button', { name: /switch to satellite/i })
      fireEvent.click(layerButton)
      
      // Should update to show next layer name
      expect(screen.getByText('Satellite')).toBeInTheDocument()
    })

    it('toggles fullscreen mode', () => {
      const mockRequestFullscreen = vi.fn()
      const mockExitFullscreen = vi.fn()
      
      Object.defineProperty(document, 'documentElement', {
        value: { requestFullscreen: mockRequestFullscreen }
      })
      Object.defineProperty(document, 'exitFullscreen', {
        value: mockExitFullscreen
      })
      
      renderWithTripProvider(<Map />)
      
      const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i })
      fireEvent.click(fullscreenButton)
      
      expect(mockRequestFullscreen).toHaveBeenCalled()
    })

    it('toggles traffic display', () => {
      renderWithTripProvider(<Map />)
      
      const trafficButton = screen.getByRole('button', { name: /show traffic/i })
      fireEvent.click(trafficButton)
      
      expect(screen.getByRole('button', { name: /hide traffic/i })).toBeInTheDocument()
    })

    it('toggles POI display', () => {
      renderWithTripProvider(<Map />)
      
      const poiButton = screen.getByRole('button', { name: /hide points of interest/i })
      fireEvent.click(poiButton)
      
      expect(screen.getByRole('button', { name: /show points of interest/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for all controls', () => {
      renderWithTripProvider(<Map />)
      
      expect(screen.getByRole('button', { name: /find my location/i })).toHaveAttribute('title', 'Find my location')
      expect(screen.getByRole('button', { name: /enter fullscreen/i })).toHaveAttribute('title', 'Enter fullscreen')
    })

    it('supports keyboard navigation', () => {
      renderWithTripProvider(<Map />)
      
      const locationButton = screen.getByRole('button', { name: /find my location/i })
      locationButton.focus()
      
      expect(document.activeElement).toBe(locationButton)
    })
  })

  describe('Error Handling', () => {
    it('handles missing geolocation API', () => {
      delete global.navigator.geolocation
      global.alert = vi.fn()
      
      renderWithTripProvider(<Map />)
      
      const locationButton = screen.getByRole('button', { name: /find my location/i })
      fireEvent.click(locationButton)
      
      expect(global.alert).toHaveBeenCalledWith(
        'Geolocation is not supported by this browser.'
      )
    })

    it('handles map initialization failure', () => {
      // Mock Leaflet to throw error
      const L = require('leaflet')
      L.map.mockImplementation(() => {
        throw new Error('Map initialization failed')
      })
      
      // Should not crash the component
      expect(() => renderWithTripProvider(<Map />)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('cleans up map instance on unmount', () => {
      const mockRemove = vi.fn()
      const L = require('leaflet')
      L.map.mockReturnValue({
        setView: vi.fn(),
        remove: mockRemove,
        fitBounds: vi.fn(),
        removeLayer: vi.fn(),
        addTo: vi.fn(),
        eachLayer: vi.fn()
      })
      
      const { unmount } = renderWithTripProvider(<Map />)
      
      unmount()
      
      expect(mockRemove).toHaveBeenCalled()
    })

    it('handles rapid control clicks without errors', () => {
      renderWithTripProvider(<Map />)
      
      const layerButton = screen.getByRole('button', { name: /switch to satellite/i })
      
      // Rapidly click multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(layerButton)
      }
      
      // Should not throw errors or cause memory leaks
      expect(screen.getByText(/terrain|satellite|openstreetmap/i)).toBeInTheDocument()
    })
  })
})