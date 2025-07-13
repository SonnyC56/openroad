const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing new contextual features...');
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  try {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Add a basic trip
    console.log('📍 Test 1: Setting up basic trip');
    
    // Add start location
    await page.click('input[placeholder*="Enter start location"]');
    await page.type('input[placeholder*="Enter start location"]', 'San Francisco');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1000));

    // Add end location
    await page.click('input[placeholder*="Enter destination"]');
    await page.type('input[placeholder*="Enter destination"]', 'Los Angeles');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));

    // Test 2: Click on a route segment
    console.log('📍 Test 2: Selecting a route segment');
    
    // Click somewhere in the middle of the route (approximate)
    await page.mouse.click(720, 450);
    await new Promise(r => setTimeout(r, 1000));

    // Check if segment indicator appears
    const segmentIndicator = await page.$('.segmentIndicator');
    if (segmentIndicator) {
      console.log('✅ Segment indicator is visible');
    } else {
      console.log('❌ Segment indicator not found');
    }

    // Test 3: Test contextual AI suggestions
    console.log('📍 Test 3: Testing contextual waypoint placement');
    
    // Type a message that should trigger "along route" placement
    const aiInput = await page.$('input[placeholder*="Find stops along"]');
    if (aiInput) {
      await aiInput.click();
      await aiInput.type('Find a good restaurant along the way');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Check for suggestion buttons
      const suggestionButtons = await page.$$('.suggestionButton');
      console.log(`✅ Found ${suggestionButtons.length} suggestion buttons`);
      
      if (suggestionButtons.length > 0) {
        // Click the first suggestion
        await suggestionButtons[0].click();
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Added waypoint from suggestion');
      }
    }

    // Test 4: Clear segment selection
    console.log('📍 Test 4: Testing segment deselection');
    
    const clearBtn = await page.$('.clearSegmentBtn');
    if (clearBtn) {
      await clearBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      console.log('✅ Cleared segment selection');
      
      // Check that placeholder changed back
      const placeholder = await page.$eval('input[placeholder*="Ask me to find"]', el => el.placeholder);
      if (placeholder.includes('Ask me to find')) {
        console.log('✅ Placeholder reverted to general mode');
      }
    }

    // Test 5: Check waypoint animation
    console.log('📍 Test 5: Testing waypoint animation');
    
    // Add another waypoint to see the animation
    await page.click('.btn:has-text("Add Stop")');
    await new Promise(r => setTimeout(r, 1000));
    
    // Fill in the new waypoint
    const waypointInputs = await page.$$('input[placeholder*="Enter location"]');
    const lastInput = waypointInputs[waypointInputs.length - 1];
    await lastInput.click();
    await lastInput.type('Santa Barbara');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('✅ New waypoint added - animation should have played');

    // Take a screenshot
    await page.screenshot({ path: 'contextual-features-test.png' });
    console.log('📸 Screenshot saved as contextual-features-test.png');

    console.log('✅ All contextual features tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'contextual-features-error.png' });
  } finally {
    await browser.close();
  }
})();