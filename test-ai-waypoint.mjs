import puppeteer from 'puppeteer'

async function testAIWaypointFix() {
  console.log('🧪 Testing AI waypoint persistence fix...\n')
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('🔧') || text.includes('🔍')) {
        console.log('Browser:', text)
      }
    })

    // Navigate to the app
    console.log('📍 Step 1: Loading app...')
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' })
    await page.waitForTimeout(2000)

    // Add start location
    console.log('📍 Step 2: Adding New York as start...')
    const startInputs = await page.$$('input[type="text"]')
    if (startInputs.length > 0) {
      await startInputs[0].click()
      await startInputs[0].type('New York')
      await page.waitForTimeout(1500)
      
      // Click first suggestion
      try {
        await page.click('.locationSuggestion')
        console.log('✅ Selected New York')
      } catch (e) {
        console.log('⚠️  No suggestions, continuing...')
      }
    }
    
    await page.waitForTimeout(1000)

    // Add end location
    console.log('📍 Step 3: Adding Los Angeles as end...')
    const allInputs = await page.$$('input[type="text"]')
    const endInput = allInputs[allInputs.length - 2] // Second to last input
    if (endInput) {
      await endInput.click()
      await endInput.type('Los Angeles')
      await page.waitForTimeout(1500)
      
      // Click first suggestion
      try {
        const suggestions = await page.$$('.locationSuggestion')
        if (suggestions.length > 0) {
          await suggestions[suggestions.length - 1].click()
          console.log('✅ Selected Los Angeles')
        }
      } catch (e) {
        console.log('⚠️  No suggestions, continuing...')
      }
    }
    
    await page.waitForTimeout(3000) // Wait for route calculation

    // Count initial waypoint cards
    console.log('\n📊 Step 4: Counting waypoints...')
    const waypointCards = await page.$$('[class*="waypointItem"]')
    const initialCount = waypointCards.length
    console.log(`Initial waypoint count: ${initialCount}`)

    // Test AI waypoint addition
    console.log('\n🤖 Step 5: Testing AI waypoint addition...')
    
    // Find AI input
    const aiInputs = await page.$$('input[placeholder*="Ask me to find"]')
    if (aiInputs.length === 0) {
      console.error('❌ Could not find AI input')
      return
    }
    
    const aiInput = aiInputs[0]
    await aiInput.click()
    await aiInput.type('Add Grand Canyon National Park to my trip')
    await page.keyboard.press('Enter')
    
    console.log('⏳ Waiting for AI response...')
    await page.waitForTimeout(8000)

    // Look for and click suggestion button
    console.log('🔍 Looking for suggestion buttons...')
    await page.waitForTimeout(2000)
    
    // Try to find suggestion buttons
    const suggestionButtons = await page.$$('[class*="suggestionButton"]')
    console.log(`Found ${suggestionButtons.length} suggestion buttons`)
    
    if (suggestionButtons.length > 0) {
      const buttonText = await suggestionButtons[0].evaluate(el => el.textContent)
      console.log(`\n🎯 Clicking suggestion: "${buttonText}"`)
      await suggestionButtons[0].click()
      
      // Wait for waypoint addition
      await page.waitForTimeout(2000)
      
      // Count waypoints immediately
      const immediateCards = await page.$$('[class*="waypointItem"]')
      const immediateCount = immediateCards.length
      console.log(`\n📊 Waypoints immediately after click: ${immediateCount}`)
      
      // Wait 5 seconds for persistence check
      console.log('⏳ Waiting 5 seconds to verify persistence...')
      await page.waitForTimeout(5000)
      
      // Final count
      const finalCards = await page.$$('[class*="waypointItem"]')
      const finalCount = finalCards.length
      console.log(`📊 Waypoints after 5 seconds: ${finalCount}`)
      
      // Results
      console.log('\n🎯 Test Results:')
      console.log('─────────────────')
      console.log(`Initial waypoints: ${initialCount}`)
      console.log(`After clicking AI suggestion: ${immediateCount}`)
      console.log(`After 5 second wait: ${finalCount}`)
      console.log(`Expected: ${initialCount + 1}`)
      
      if (finalCount === initialCount + 1) {
        console.log('\n✅ SUCCESS: Waypoint added and persisted!')
      } else if (finalCount === 0 || finalCount === 1) {
        console.log('\n❌ FAIL: All waypoints were wiped!')
      } else if (finalCount === initialCount) {
        console.log('\n❌ FAIL: Waypoint was not added or disappeared')
      } else {
        console.log('\n⚠️  UNEXPECTED: Waypoint count changed unexpectedly')
      }
    } else {
      console.log('❌ No suggestion buttons appeared')
      
      // Check if there's an error message
      const aiMessages = await page.$$('[class*="message"][class*="ai"]')
      if (aiMessages.length > 0) {
        const lastMessage = aiMessages[aiMessages.length - 1]
        const messageText = await lastMessage.evaluate(el => el.textContent)
        console.log(`AI Response: "${messageText}"`)
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'ai-waypoint-test.png', fullPage: true })
    console.log('\n📸 Screenshot saved: ai-waypoint-test.png')

  } catch (error) {
    console.error('\n❌ Test error:', error.message)
  } finally {
    console.log('\n🧪 Test completed')
    await page.waitForTimeout(5000) // Keep browser open for manual inspection
    await browser.close()
  }
}

// Run test
testAIWaypointFix().catch(console.error)