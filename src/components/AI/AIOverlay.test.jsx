import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import AIOverlay from './AIOverlay'
import { TripProvider } from '../../contexts/TripContext'

// Mock services
vi.mock('../../services/gemini', () => ({
  generateTripResponse: vi.fn(),
  extractLocationSuggestions: vi.fn(),
  extractStructuredSuggestions: vi.fn(),
  isGeminiAvailable: vi.fn(() => true),
  initializeGemini: vi.fn(),
  clearApiKey: vi.fn()
}))

vi.mock('../../services/geocoding', () => ({
  searchSuggestions: vi.fn()
}))

vi.mock('../../services/agenticAI', () => ({
  createAgenticAI: vi.fn(),
  ACTION_TYPES: {
    PLOT_LOCATION: 'PLOT_LOCATION',
    HIGHLIGHT_AREA: 'HIGHLIGHT_AREA',
    ADD_WAYPOINT: 'ADD_WAYPOINT'
  }
}))

vi.mock('../../services/mapAgent', () => ({
  default: vi.fn().mockImplementation(() => ({
    plotAISuggestions: vi.fn(),
    highlightArea: vi.fn()
  }))
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}))

const renderWithTripProvider = (component) => {
  return render(
    <TripProvider>
      {component}
    </TripProvider>
  )
}

describe('AIOverlay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.mapInstance
    window.mapInstance = {
      setView: vi.fn(),
      addTo: vi.fn()
    }
  })

  afterEach(() => {
    delete window.mapInstance
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders AI assistant header and controls', () => {
      renderWithTripProvider(<AIOverlay />)
      
      expect(screen.getByText('AI Travel Assistant')).toBeInTheDocument()
      expect(screen.getByText('AI Agent')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear chat/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('displays welcome message', () => {
      renderWithTripProvider(<AIOverlay />)
      
      expect(screen.getByText(/Hi! I'm your AI travel agent/)).toBeInTheDocument()
      expect(screen.getByText(/Plan a 14-day trip from NY to LA/)).toBeInTheDocument()
    })

    it('shows API key input when Gemini unavailable', () => {
      const { isGeminiAvailable } = require('../../services/gemini')
      isGeminiAvailable.mockReturnValue(false)
      
      renderWithTripProvider(<AIOverlay />)
      
      expect(screen.getByText(/Enter your Google Gemini API key/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Paste your API key here/)).toBeInTheDocument()
    })
  })

  describe('Message Handling', () => {
    it('sends user message and receives AI response', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockResolvedValue({
        text: 'I can help you find great restaurants in San Francisco!',
        structured: null
      })

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      const sendButton = screen.getByRole('button', { name: /📤/i })
      
      fireEvent.change(input, { target: { value: 'Find restaurants in San Francisco' } })
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText('Find restaurants in San Francisco')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.getByText(/I can help you find great restaurants/)).toBeInTheDocument()
      })
    })

    it('handles Enter key for sending messages', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockResolvedValue({
        text: 'Looking for scenic spots!',
        structured: null
      })

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      
      fireEvent.change(input, { target: { value: 'Find scenic spots' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('Find scenic spots')).toBeInTheDocument()
      })
    })

    it('prevents sending empty messages', () => {
      renderWithTripProvider(<AIOverlay />)
      
      const sendButton = screen.getByRole('button', { name: /📤/i })
      expect(sendButton).toBeDisabled()
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      fireEvent.change(input, { target: { value: '   ' } }) // Only whitespace
      
      expect(sendButton).toBeDisabled()
    })
  })

  describe('API Key Management', () => {
    it('handles API key submission', async () => {
      const { isGeminiAvailable, initializeGemini } = require('../../services/gemini')
      isGeminiAvailable.mockReturnValue(false)
      initializeGemini.mockReturnValue(true)
      
      renderWithTripProvider(<AIOverlay />)
      
      const apiInput = screen.getByPlaceholderText(/Paste your API key here/i)
      const submitButton = screen.getByRole('button', { name: /🔑/i })
      
      fireEvent.change(apiInput, { target: { value: 'test-api-key-123' } })
      fireEvent.click(submitButton)
      
      expect(initializeGemini).toHaveBeenCalledWith('test-api-key-123')
      
      await waitFor(() => {
        expect(screen.getByText(/Perfect! Your API key has been saved/)).toBeInTheDocument()
      })
    })

    it('handles invalid API key', async () => {
      const { isGeminiAvailable, initializeGemini } = require('../../services/gemini')
      isGeminiAvailable.mockReturnValue(false)
      initializeGemini.mockReturnValue(false)
      
      renderWithTripProvider(<AIOverlay />)
      
      const apiInput = screen.getByPlaceholderText(/Paste your API key here/i)
      const submitButton = screen.getByRole('button', { name: /🔑/i })
      
      fireEvent.change(apiInput, { target: { value: 'invalid-key' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/I couldn't validate that API key/)).toBeInTheDocument()
      })
    })

    it('clears API key when requested', () => {
      const { clearApiKey } = require('../../services/gemini')
      
      renderWithTripProvider(<AIOverlay />)
      
      const clearButton = screen.getByRole('button', { name: /🛑/i })
      fireEvent.click(clearButton)
      
      expect(clearApiKey).toHaveBeenCalled()
      expect(screen.getByText(/API key cleared/)).toBeInTheDocument()
    })
  })

  describe('Suggestion Chips', () => {
    it('populates input with suggestion chip text', () => {
      renderWithTripProvider(<AIOverlay />)
      
      const restaurantChip = screen.getByText('Find restaurants')
      fireEvent.click(restaurantChip)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      expect(input.value).toBe('Find 3 great restaurants in San Francisco')
    })

    it('renders all suggestion chips', () => {
      renderWithTripProvider(<AIOverlay />)
      
      expect(screen.getByText('Find restaurants')).toBeInTheDocument()
      expect(screen.getByText('Scenic spots')).toBeInTheDocument()
      expect(screen.getByText('Family fun')).toBeInTheDocument()
      expect(screen.getByText('Photo spots')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during AI response', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ text: 'Response', structured: null }), 100)
      ))

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      const sendButton = screen.getByRole('button', { name: /📤/i })
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText('Thinking...')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('disables input during loading', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ text: 'Response', structured: null }), 100)
      ))

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      const sendButton = screen.getByRole('button', { name: /📤/i })
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(sendButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles AI service errors gracefully', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockRejectedValue(new Error('API Error'))

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      const sendButton = screen.getByRole('button', { name: /📤/i })
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/I encountered an issue processing your request/)).toBeInTheDocument()
      })
    })

    it('handles network timeouts', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 50))
      )

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      const sendButton = screen.getByRole('button', { name: /📤/i })
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/I encountered an issue processing your request/)).toBeInTheDocument()
      }, { timeout: 100 })
    })
  })

  describe('Accessibility', () => {
    it('maintains focus management', () => {
      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      input.focus()
      
      expect(document.activeElement).toBe(input)
    })

    it('provides proper ARIA labels', () => {
      renderWithTripProvider(<AIOverlay />)
      
      const clearButton = screen.getByRole('button', { name: /clear chat/i })
      expect(clearButton).toHaveAttribute('title', 'Clear chat')
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toHaveAttribute('title', 'Close')
    })

    it('supports keyboard navigation', () => {
      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      fireEvent.keyDown(input, { key: 'Tab' })
      
      const sendButton = screen.getByRole('button', { name: /📤/i })
      expect(document.activeElement).toBe(sendButton)
    })
  })

  describe('Memory and Performance', () => {
    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = renderWithTripProvider(<AIOverlay />)
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('routeSegmentSelect', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('aiMapAction', expect.any(Function))
    })

    it('handles rapid message sending without memory leaks', async () => {
      const { generateTripResponse } = require('../../services/gemini')
      generateTripResponse.mockResolvedValue({ text: 'Quick response', structured: null })

      renderWithTripProvider(<AIOverlay />)
      
      const input = screen.getByPlaceholderText(/Ask me to find restaurants/i)
      
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.keyDown(input, { key: 'Enter' })
        await waitFor(() => {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument()
        })
      }
      
      // Should handle all messages without crashing
      expect(screen.getByText('Message 4')).toBeInTheDocument()
    })
  })
})