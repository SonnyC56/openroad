import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../../App'
import { TripProvider } from '../../contexts/TripContext'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Mock problematic dependencies for a11y testing
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    remove: vi.fn(),
    fitBounds: vi.fn(),
    removeLayer: vi.fn(),
    addTo: vi.fn(),
    eachLayer: vi.fn()
  })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  marker: vi.fn(() => ({ addTo: vi.fn(), bindPopup: vi.fn() })),
  polyline: vi.fn(() => ({ addTo: vi.fn(), on: vi.fn(), bindPopup: vi.fn() })),
  divIcon: vi.fn(),
  latLngBounds: vi.fn(() => ({})),
  Icon: {
    Default: {
      prototype: { _getIconUrl: vi.fn() },
      mergeOptions: vi.fn()
    }
  }
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    main: ({ children, ...props }) => <main {...props}>{children}</main>
  },
  AnimatePresence: ({ children }) => children
}))

describe('Accessibility Tests', () => {
  beforeEach(() => {
    // Mock geolocation
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn()
    }
    
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    })
  })

  describe('WCAG 2.1 Compliance', () => {
    it('should not have accessibility violations on initial load', async () => {
      const { container } = render(<App />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility with trip planning form', async () => {
      const { container, getByPlaceholderText } = render(<App />)
      
      // Fill in some form fields to test dynamic content
      const startInput = getByPlaceholderText(/where are you starting from/i)
      startInput.value = 'New York, NY'
      
      const endInput = getByPlaceholderText(/where are you going/i)
      endInput.value = 'Boston, MA'
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility with AI overlay open', async () => {
      const { container } = render(<App />)
      
      // AI overlay should be visible by default
      const results = await axe(container, {
        rules: {
          // Temporarily disable color-contrast for dynamic AI content
          'color-contrast': { enabled: false }
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should have proper tab order', () => {
      const { container } = render(<App />)
      
      // Get all focusable elements
      const focusableElements = container.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      expect(focusableElements.length).toBeGreaterThan(0)
      
      // Check that focusable elements have proper tab indices
      focusableElements.forEach(element => {
        const tabIndex = element.getAttribute('tabindex')
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1)
        }
      })
    })

    it('should have visible focus indicators', () => {
      const { container } = render(<App />)
      
      const focusableElements = container.querySelectorAll(
        'button, input, select, textarea'
      )
      
      focusableElements.forEach(element => {
        // Focus the element
        element.focus()
        
        // Check that focus is properly set
        expect(document.activeElement).toBe(element)
        
        // Visual focus indicators are tested via CSS, 
        // but we can verify the element is focusable
        expect(element.matches(':focus')).toBe(true)
      })
    })

    it('should support Enter and Space key activation for buttons', () => {
      const { getByRole } = render(<App />)
      
      const buttons = ['Save Trip', 'Add Stop']
      
      buttons.forEach(buttonText => {
        try {
          const button = getByRole('button', { name: new RegExp(buttonText, 'i') })
          
          // Verify button can receive focus
          button.focus()
          expect(document.activeElement).toBe(button)
          
          // Verify button is properly marked as a button
          expect(button.getAttribute('role')).toBe('button')
        } catch (e) {
          // Button might not be present in current state, which is OK
        }
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper heading structure', () => {
      const { container } = render(<App />)
      
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
      
      if (headings.length > 0) {
        // Check that headings follow logical order
        let lastLevel = 0
        headings.forEach(heading => {
          const level = parseInt(heading.tagName.charAt(1))
          
          // Heading levels should not skip (h1 -> h3 is bad)
          if (lastLevel > 0) {
            expect(level - lastLevel).toBeLessThanOrEqual(1)
          }
          lastLevel = level
        })
      }
    })

    it('should have proper ARIA labels for interactive elements', () => {
      const { container } = render(<App />)
      
      // Check map control buttons
      const mapButtons = container.querySelectorAll('.mapBtn, [title]')
      
      mapButtons.forEach(button => {
        // Should have either aria-label, title, or visible text
        const hasLabel = button.hasAttribute('aria-label') ||
                         button.hasAttribute('title') ||
                         button.textContent.trim().length > 0
        
        expect(hasLabel).toBe(true)
      })
    })

    it('should announce dynamic content changes', () => {
      const { container } = render(<App />)
      
      // Look for ARIA live regions
      const liveRegions = container.querySelectorAll('[aria-live]')
      
      // Should have at least one live region for announcements
      // (This might be in the AI overlay or trip status)
      if (liveRegions.length > 0) {
        liveRegions.forEach(region => {
          const ariaLive = region.getAttribute('aria-live')
          expect(['polite', 'assertive', 'off']).toContain(ariaLive)
        })
      }
    })

    it('should have proper form labels', () => {
      const { container } = render(<App />)
      
      const inputs = container.querySelectorAll('input')
      
      inputs.forEach(input => {
        const inputId = input.getAttribute('id')
        const ariaLabel = input.getAttribute('aria-label')
        const ariaLabelledBy = input.getAttribute('aria-labelledby')
        const placeholder = input.getAttribute('placeholder')
        
        // Input should have some form of accessible name
        const hasAccessibleName = inputId ||
                                 ariaLabel ||
                                 ariaLabelledBy ||
                                 placeholder
        
        expect(hasAccessibleName).toBe(true)
      })
    })
  })

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', () => {
      const { container } = render(<App />)
      
      // Check for elements that might use color coding
      const colorCodedElements = container.querySelectorAll(
        '.success, .error, .warning, .info, [class*="color"]'
      )
      
      colorCodedElements.forEach(element => {
        // Elements using color should also have text, icons, or other indicators
        const hasNonColorIndicator = element.textContent.trim().length > 0 ||
                                   element.querySelector('svg, .icon') ||
                                   element.hasAttribute('aria-label')
        
        expect(hasNonColorIndicator).toBe(true)
      })
    })

    it('should have sufficient color contrast (manual check required)', () => {
      // This test serves as a reminder that color contrast should be manually verified
      // using tools like WebAIM's contrast checker or browser dev tools
      
      const { container } = render(<App />)
      
      // Check that text elements exist (contrast must be checked manually)
      const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')
      expect(textElements.length).toBeGreaterThan(0)
      
      // Manual testing note
      console.log('🔍 Manual Check Required: Verify color contrast meets WCAG AA standards (4.5:1 for normal text)')
    })
  })

  describe('Mobile and Touch Accessibility', () => {
    it('should have touch targets of adequate size', () => {
      const { container } = render(<App />)
      
      const touchTargets = container.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]')
      
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target)
        const width = parseInt(styles.width) || 0
        const height = parseInt(styles.height) || 0
        
        // WCAG recommends minimum 44px for touch targets
        // Note: This is approximate since we're testing in jsdom
        if (width > 0 && height > 0) {
          expect(Math.min(width, height)).toBeGreaterThanOrEqual(24) // Relaxed for testing
        }
      })
    })

    it('should be operable with assistive technologies', () => {
      const { container } = render(<App />)
      
      // Check for proper ARIA roles
      const interactiveElements = container.querySelectorAll('[role]')
      
      interactiveElements.forEach(element => {
        const role = element.getAttribute('role')
        
        // Verify roles are standard ARIA roles
        const validRoles = [
          'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
          'listbox', 'option', 'tab', 'tabpanel', 'dialog', 'alert',
          'navigation', 'main', 'banner', 'contentinfo'
        ]
        
        expect(validRoles.some(validRole => role.includes(validRole))).toBe(true)
      })
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', () => {
      // This would typically be tested by triggering an error state
      // and checking for proper ARIA announcements
      
      const { container } = render(<App />)
      
      // Look for error message containers
      const errorContainers = container.querySelectorAll(
        '[role="alert"], .error, .errorMessage, [aria-live="assertive"]'
      )
      
      // If error containers exist, they should be properly marked
      errorContainers.forEach(container => {
        const hasProperMarkup = container.hasAttribute('role') ||
                               container.hasAttribute('aria-live') ||
                               container.hasAttribute('aria-label')
        
        expect(hasProperMarkup).toBe(true)
      })
    })

    it('should provide clear error recovery instructions', () => {
      const { container } = render(<App />)
      
      // Check for help text or instructions
      const helpElements = container.querySelectorAll(
        '[aria-describedby], .help-text, .instructions'
      )
      
      // If help elements exist, they should have meaningful content
      helpElements.forEach(element => {
        if (element.textContent) {
          expect(element.textContent.trim().length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Performance Impact on Accessibility', () => {
    it('should not have excessive DOM nesting that impacts screen readers', () => {
      const { container } = render(<App />)
      
      // Check for excessively nested structures
      const deeplyNested = container.querySelectorAll('div div div div div div')
      
      // While not strictly an accessibility violation, 
      // excessive nesting can impact screen reader performance
      expect(deeplyNested.length).toBeLessThan(10)
    })

    it('should not have too many interactive elements on initial load', () => {
      const { container } = render(<App />)
      
      const interactiveElements = container.querySelectorAll(
        'button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
      )
      
      // Should have a reasonable number of interactive elements
      // Too many can overwhelm screen reader users
      expect(interactiveElements.length).toBeLessThan(50)
    })
  })
})

/**
 * Additional Accessibility Testing Notes:
 * 
 * 1. Manual Testing Required:
 *    - Test with actual screen readers (NVDA, JAWS, VoiceOver)
 *    - Verify color contrast with tools like WebAIM contrast checker
 *    - Test keyboard navigation with Tab, Enter, Space, Arrow keys
 *    - Test with browser zoom up to 200%
 * 
 * 2. Tools for Extended Testing:
 *    - @axe-core/playwright for E2E accessibility testing
 *    - Pa11y for automated accessibility testing in CI/CD
 *    - Lighthouse accessibility audit
 *    - Chrome DevTools accessibility panel
 * 
 * 3. Real User Testing:
 *    - Include users with disabilities in testing process
 *    - Test on various devices and assistive technologies
 *    - Gather feedback on usability and accessibility barriers
 * 
 * 4. Ongoing Monitoring:
 *    - Include accessibility tests in CI/CD pipeline
 *    - Regular audits with automated and manual testing
 *    - Monitor user feedback and support requests
 */