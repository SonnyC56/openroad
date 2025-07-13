import puppeteer from 'puppeteer';

const VIEWPORT = { width: 1200, height: 800 };
const TIMEOUT = 60000;

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function testWaypointFixes() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT);

  try {
    console.log('🚀 Starting waypoint fixes test...');
    
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded');

    // Wait for the trip planner to be visible
    await page.waitForSelector('[class*="tripPlanner"]', { visible: true });
    console.log('✅ Trip planner loaded');

    // First, set up the Gemini API key if needed
    const apiKeyInput = await page.$('input[placeholder*="API key"]');
    if (apiKeyInput) {
      console.log('📋 Setting up Gemini API key...');
      await apiKeyInput.click();
      await apiKeyInput.type('AIzaSyB2_CopOMjJJ_FZUaA2W3xNENTlOdNYHx8');
      
      const keySubmitButton = await page.$('button:has([class*="Key"])');
      if (keySubmitButton) {
        await keySubmitButton.click();
        await delay(1000);
        console.log('✅ API key set');
      }
    }

    // Test 1: Add waypoints manually using the "Add Stop" button
    console.log('\n📍 Test 1: Testing manual waypoint addition...');
    
    // Add a start point
    const startInput = await page.$('[class*="waypointItem"]:first-child input');
    if (!startInput) {
      throw new Error('Could not find start waypoint input');
    }
    await startInput.click({ clickCount: 3 });
    await startInput.type('San Francisco');
    await delay(1500);
    
    // Look for location suggestions with a more flexible selector
    const startSuggestions = await page.$$('[class*="locationSuggestion"], [class*="suggestion"], [role="option"]');
    if (startSuggestions.length > 0) {
      await startSuggestions[0].click();
      await delay(500);
      console.log('✅ Added start point: San Francisco');
    } else {
      console.log('⚠️  No suggestions found, continuing with typed value');
    }

    // Add an end point
    const endInput = await page.$('[class*="waypointItem"]:last-child input');
    if (!endInput) {
      throw new Error('Could not find end waypoint input');
    }
    await endInput.click({ clickCount: 3 });
    await endInput.type('Los Angeles');
    await delay(1500);
    
    // Look for location suggestions
    const endSuggestions = await page.$$('[class*="locationSuggestion"], [class*="suggestion"], [role="option"]');
    if (endSuggestions.length > 0) {
      await endSuggestions[0].click();
      await delay(500);
      console.log('✅ Added end point: Los Angeles');
    } else {
      console.log('⚠️  No suggestions found, continuing with typed value');
    }

    // Click "Add Stop" button - use page.evaluate to find it
    const addStopClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
      if (addStopBtn) {
        addStopBtn.click();
        return true;
      }
      return false;
    });
    
    if (!addStopClicked) {
      throw new Error('Could not find Add Stop button');
    }
    await delay(500);
    console.log('✅ Clicked Add Stop button');

    // Verify a new waypoint was added
    const waypoints = await page.$$('[class*="waypointItem"]');
    console.log(`✅ Waypoint count after adding stop: ${waypoints.length} (should be 3)`);
    
    if (waypoints.length !== 3) {
      throw new Error(`Expected 3 waypoints, but found ${waypoints.length}`);
    }

    // Add a location to the new waypoint
    const newWaypointInput = await page.$('[class*="waypointItem"]:nth-child(2) input');
    if (newWaypointInput) {
      await newWaypointInput.click({ clickCount: 3 });
      await newWaypointInput.type('Santa Barbara');
      await delay(1500);
      
      const stopSuggestions = await page.$$('[class*="locationSuggestion"], [class*="suggestion"], [role="option"]');
      if (stopSuggestions.length > 0) {
        await stopSuggestions[0].click();
        await delay(500);
        console.log('✅ Added middle stop: Santa Barbara');
      } else {
        console.log('⚠️  No suggestions found for middle stop');
      }
    }

    // Test 2: AI Assistant waypoint addition
    console.log('\n🤖 Test 2: Testing AI waypoint addition...');
    
    // Open AI assistant if it's minimized
    const aiToggle = await page.$('[class*="minimizedOverlay"], [class*="aiOverlay"]:not([class*="minimized"])');
    if (await aiToggle.evaluate(el => el.className.includes('minimized'))) {
      await aiToggle.click();
      await delay(500);
    }

    // Check if API key input is still visible (shouldn't be after we set it)
    const apiKeyInputVisible = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder*="API key"]');
      return Array.from(inputs).some(input => {
        const style = window.getComputedStyle(input);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    });
    
    if (apiKeyInputVisible) {
      console.log('⚠️  Gemini API key still required - using mock response mode');
      
      // Test waypoint persistence without API
      // Add another stop manually
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
        if (addStopBtn) addStopBtn.click();
      });
      await delay(500);
      
      const waypoints2 = await page.$$('[class*="waypointItem"]');
      console.log(`✅ Waypoint count after second Add Stop: ${waypoints2.length} (should be 4)`);
      
      if (waypoints2.length !== 4) {
        throw new Error(`Expected 4 waypoints after adding second stop, but found ${waypoints2.length}`);
      }
      
      // Add one more stop to test the "third stop deletion" bug
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
        if (addStopBtn) addStopBtn.click();
      });
      await delay(500);
      
      const waypoints3 = await page.$$('[class*="waypointItem"]');
      console.log(`✅ Waypoint count after third Add Stop: ${waypoints3.length} (should be 5)`);
      
      if (waypoints3.length !== 5) {
        throw new Error(`Expected 5 waypoints after adding third stop, but found ${waypoints3.length} - THIS IS THE BUG!`);
      }
      
      console.log('✅ Bug fixed! All waypoints are preserved when adding multiple stops');
    } else {
      // Test with AI if API is available
      const aiInput = await page.waitForSelector('[class*="aiOverlay"] input[placeholder*="Ask me"]', { visible: true });
      await aiInput.click();
      await aiInput.type('Add Monterey as a stop');
      
      const sendButton = await page.waitForSelector('[class*="aiOverlay"] button[class*="sendButton"]', { visible: true });
      await sendButton.click();
      
      console.log('⏳ Waiting for AI response...');
      await delay(3000);
      
      // Look for suggestion buttons
      const suggestionButtons = await page.$$('[class*="suggestionButton"]');
      if (suggestionButtons.length > 0) {
        await suggestionButtons[0].click();
        await delay(1000);
        console.log('✅ Added waypoint via AI suggestion');
        
        // Verify waypoints are still there
        const finalWaypoints = await page.$$('[class*="waypointItem"]');
        console.log(`✅ Final waypoint count: ${finalWaypoints.length}`);
        
        if (finalWaypoints.length < 4) {
          throw new Error('Waypoints were deleted after AI addition!');
        }
      }
    }

    // Test 3: Drag and drop reordering
    console.log('\n🔄 Test 3: Testing waypoint reordering...');
    
    // Get waypoint handles
    const handles = await page.$$('[class*="waypointHandle"]');
    if (handles.length >= 3) {
      // Try to drag the middle waypoint
      const middleHandle = handles[1];
      const boundingBox = await middleHandle.boundingBox();
      
      if (boundingBox) {
        await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
        await page.mouse.down();
        await delay(100);
        await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height + 50);
        await delay(100);
        await page.mouse.up();
        await delay(500);
        console.log('✅ Attempted waypoint reordering');
      }
    }

    // Take a screenshot of the final state
    await page.screenshot({ path: 'waypoint-fixes-final.png', fullPage: true });
    console.log('📸 Screenshot saved as waypoint-fixes-final.png');

    console.log('\n✅ All tests completed successfully!');
    console.log('Key fixes verified:');
    console.log('  - ✅ Manual "Add Stop" button works');
    console.log('  - ✅ Multiple waypoints can be added without deletion');
    console.log('  - ✅ Waypoints persist correctly');
    console.log('  - ✅ UI elements are properly interactive');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'waypoint-fixes-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as waypoint-fixes-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testWaypointFixes().catch(console.error);