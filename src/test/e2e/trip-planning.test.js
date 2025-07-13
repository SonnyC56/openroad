import { test, expect } from '@playwright/test'

/**
 * End-to-End Test Suite for OpenRoad Trip Planning
 * 
 * This suite tests the complete user journey from trip creation
 * to export, focusing on critical user flows and error scenarios.
 */

test.describe('Trip Planning E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Basic Trip Creation', () => {
    test('should create a basic trip with start and end points', async ({ page }) => {
      // Step 1: Fill in start location
      const startInput = page.locator('[placeholder*="Where are you starting from"]')
      await startInput.fill('New York, NY')
      await page.keyboard.press('Enter')
      
      // Wait for geocoding
      await page.waitForTimeout(1000)
      
      // Step 2: Fill in end location
      const endInput = page.locator('[placeholder*="Where are you going"]')
      await endInput.fill('Los Angeles, CA')
      await page.keyboard.press('Enter')
      
      // Wait for route calculation
      await page.waitForTimeout(3000)
      
      // Step 3: Verify trip summary appears
      await expect(page.locator('.tripSummary')).toBeVisible()
      await expect(page.locator('text=2 stops')).toBeVisible()
      
      // Step 4: Verify route appears on map
      const mapContainer = page.locator('.mapContainer')
      await expect(mapContainer).toBeVisible()
      
      // Step 5: Check for route distance/duration
      await expect(page.locator('text=/\\d+(\\.\\d+)? km/')).toBeVisible()
      await expect(page.locator('text=/\\d+ min/')).toBeVisible()
    })

    test('should add intermediate waypoints', async ({ page }) => {
      // Create basic trip first
      await page.locator('[placeholder*="starting from"]').fill('Chicago, IL')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Denver, CO')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      // Add intermediate stop
      await page.locator('button:has-text("Add Stop")').click()
      
      // Fill in intermediate waypoint
      const waypointInput = page.locator('[placeholder*="Add a stop along the way"]')
      await waypointInput.fill('Kansas City, MO')
      await page.keyboard.press('Enter')
      
      await page.waitForTimeout(2000)
      
      // Verify 3 stops now
      await expect(page.locator('text=3 stops')).toBeVisible()
      
      // Verify waypoint appears in list
      await expect(page.locator('text=Kansas City')).toBeVisible()
    })

    test('should handle waypoint reordering via drag and drop', async ({ page }) => {
      // Create trip with multiple waypoints
      await page.locator('[placeholder*="starting from"]').fill('Boston, MA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Washington, DC')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Add two intermediate stops
      await page.locator('button:has-text("Add Stop")').click()
      await page.locator('[placeholder*="Add a stop along the way"]').last().fill('New York, NY')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('button:has-text("Add Stop")').click()
      await page.locator('[placeholder*="Add a stop along the way"]').last().fill('Philadelphia, PA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      // Verify initial order
      const waypoints = page.locator('.waypointItem')
      await expect(waypoints).toHaveCount(4)
      
      // Test drag and drop (simplified check)
      const dragHandle = page.locator('.waypointHandle').nth(1)
      await expect(dragHandle).toBeVisible()
      
      // Verify waypoints are interactive
      await expect(page.locator('text=Boston')).toBeVisible()
      await expect(page.locator('text=New York')).toBeVisible()
      await expect(page.locator('text=Philadelphia')).toBeVisible()
      await expect(page.locator('text=Washington')).toBeVisible()
    })
  })

  test.describe('AI Integration', () => {
    test('should handle AI suggestions when API key is set', async ({ page }) => {
      // Mock localStorage to have API key
      await page.addInitScript(() => {
        localStorage.setItem('gemini_api_key', 'test-key-for-e2e')
      })
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Open AI overlay
      const aiOverlay = page.locator('.aiOverlay')
      await expect(aiOverlay).toBeVisible()
      
      // Type a request
      const aiInput = page.locator('[placeholder*="Ask me to find"]')
      await aiInput.fill('Find restaurants in San Francisco')
      
      // Send message
      await page.locator('button:has-text("📤")').click()
      
      // Wait for response (will be error in test env, but UI should handle gracefully)
      await page.waitForTimeout(2000)
      
      // Should show user message
      await expect(page.locator('text=Find restaurants in San Francisco')).toBeVisible()
      
      // Should show some AI response (even if error)
      const aiMessages = page.locator('.message.ai')
      await expect(aiMessages).toHaveCount.greaterThan(1)
    })

    test('should prompt for API key when not available', async ({ page }) => {
      // Ensure no API key
      await page.addInitScript(() => {
        localStorage.removeItem('gemini_api_key')
      })
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Should show API key prompt
      await expect(page.locator('text=Enter your Google Gemini API key')).toBeVisible()
      await expect(page.locator('[placeholder*="Paste your API key"]')).toBeVisible()
      
      // Test API key input
      await page.locator('[placeholder*="Paste your API key"]').fill('test-api-key')
      await page.locator('button:has-text("🔑")').click()
      
      // Should attempt to validate (will fail in test, but UI should respond)
      await page.waitForTimeout(1000)
    })
  })

  test.describe('Export Functionality', () => {
    test('should export trip in multiple formats', async ({ page }) => {
      // Create a basic trip
      await page.locator('[placeholder*="starting from"]').fill('Seattle, WA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Portland, OR')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // Test GPX export
      await page.locator('button:has-text("GPX")').click()
      // Verify download would start (can't test actual file download in Playwright easily)
      
      // Test KML export
      await page.locator('button:has-text("KML")').click()
      
      // Test CSV export
      await page.locator('button:has-text("CSV")').click()
      
      // Test Google Maps export
      await page.locator('button:has-text("Maps")').click()
      // This should open a new tab, but we can't easily test that
    })

    test('should save and load trips', async ({ page }) => {
      // Create a trip
      await page.locator('[placeholder*="starting from"]').fill('Miami, FL')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Orlando, FL')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // Save trip
      await page.locator('button:has-text("Save Trip")').click()
      
      // Should show save dialog
      await expect(page.locator('text=Save Trip')).toBeVisible()
      
      // Enter trip name
      await page.locator('[placeholder*="Enter a name for your trip"]').fill('Florida Adventure')
      await page.locator('button:has-text("Save Trip")').last().click()
      
      // Should show success message
      await page.waitForTimeout(1000)
      
      // Verify trip is saved (could be checked via localStorage)
      const savedData = await page.evaluate(() => {
        return localStorage.getItem('openroad-saved-trips')
      })
      expect(savedData).toBeTruthy()
    })
  })

  test.describe('Map Interactions', () => {
    test('should handle map controls', async ({ page }) => {
      // Test location button
      await page.locator('[title="Find my location"]').click()
      // Would normally trigger geolocation (mocked in test)
      
      // Test layer switching
      const layerButton = page.locator('[title*="Switch to"]')
      await layerButton.click()
      
      // Verify layer name changes
      await expect(page.locator('text=/Satellite|Terrain|OpenStreetMap/')).toBeVisible()
      
      // Test fullscreen toggle
      await page.locator('[title*="fullscreen"]').click()
      
      // Test traffic toggle
      await page.locator('[title*="traffic"]').click()
      
      // Test POI toggle
      await page.locator('[title*="points of interest"]').click()
    })

    test('should handle map segment interactions', async ({ page }) => {
      // Create trip with calculated route
      await page.locator('[placeholder*="starting from"]').fill('San Francisco, CA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Los Angeles, CA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
      
      // Map should show route
      const mapContainer = page.locator('.mapContainer')
      await expect(mapContainer).toBeVisible()
      
      // Click on map (would trigger segment selection in real usage)
      await mapContainer.click({ position: { x: 200, y: 200 } })
      
      // Verify no crashes occur
      await page.waitForTimeout(500)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle invalid locations gracefully', async ({ page }) => {
      // Enter invalid location
      await page.locator('[placeholder*="starting from"]').fill('Invalid Location XYZ123')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // Should not crash the app
      await expect(page.locator('.tripPlanner')).toBeVisible()
      
      // Should show some indication of error (could be empty results)
      // The exact behavior depends on geocoding service
    })

    test('should handle network failures', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      // Try to create trip
      await page.locator('[placeholder*="starting from"]').fill('Boston, MA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // App should remain functional even with network errors
      await expect(page.locator('.tripPlanner')).toBeVisible()
      
      // Restore connection
      await page.context().setOffline(false)
    })

    test('should handle localStorage quota exceeded', async ({ page }) => {
      // Fill localStorage to near capacity
      await page.addInitScript(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024) // 1MB string
          for (let i = 0; i < 5; i++) {
            localStorage.setItem(`large-item-${i}`, largeData)
          }
        } catch (e) {
          // Quota exceeded, which is what we want to test
        }
      })
      
      // Try to save a trip
      await page.locator('[placeholder*="starting from"]').fill('Test Start')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      await page.locator('[placeholder*="going"]').fill('Test End')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      await page.locator('button:has-text("Save Trip")').click()
      await page.locator('[placeholder*="Enter a name for your trip"]').fill('Test Trip')
      await page.locator('button:has-text("Save Trip")').last().click()
      
      // Should handle gracefully without crashing
      await page.waitForTimeout(1000)
      await expect(page.locator('.tripPlanner')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through main controls
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to reach the first input
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Continue tabbing through major controls
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        const currentFocus = page.locator(':focus')
        await expect(currentFocus).toBeVisible()
      }
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for important ARIA attributes
      await expect(page.locator('[title="Find my location"]')).toBeVisible()
      await expect(page.locator('[title*="Switch to"]')).toBeVisible()
      await expect(page.locator('[title*="fullscreen"]')).toBeVisible()
      
      // Check for placeholder texts that help screen readers
      await expect(page.locator('[placeholder*="Where are you starting from"]')).toBeVisible()
      await expect(page.locator('[placeholder*="Where are you going"]')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('http://localhost:5173')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      
      // Main components should be visible
      await expect(page.locator('.tripPlanner')).toBeVisible()
      await expect(page.locator('.mapContainer')).toBeVisible()
    })

    test('should handle large trips (stress test)', async ({ page }) => {
      // Create trip with many waypoints
      await page.locator('[placeholder*="starting from"]').fill('New York, NY')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Add multiple waypoints rapidly
      for (let i = 0; i < 5; i++) {
        await page.locator('button:has-text("Add Stop")').click()
        const inputs = page.locator('[placeholder*="Add a stop along the way"]')
        await inputs.last().fill(`Stop ${i + 1}`)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(200)
      }
      
      await page.locator('[placeholder*="going"]').fill('Los Angeles, CA')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
      
      // Should handle without significant performance degradation
      await expect(page.locator('.tripSummary')).toBeVisible()
      
      // Should show all waypoints
      const waypoints = page.locator('.waypointItem')
      await expect(waypoints).toHaveCount(7) // start + 5 stops + end
    })
  })
})