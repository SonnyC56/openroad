// Puppeteer test for waypoint fix
// Tests the "Plan a 14-day trip from NY to LA visiting national parks" scenario
// Ensures A and C waypoints are properly filled, not blank

import puppeteer from 'puppeteer';

async function testWaypointFix() {
  console.log('🚀 Starting waypoint fix test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  let page;
  
  try {
    page = await browser.newPage();
    
    // Navigate to the app
    console.log('📱 Navigating to app...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    
    // Wait for app to load and create a new trip
    console.log('⏳ Waiting for app to load...');
    await page.waitForSelector('.sidebar, [class*="sidebar"]', { timeout: 10000 });
    
    // Check if we need to create a new trip
    try {
      const newTripBtn = await page.$('button:has-text("New Trip")');
      if (newTripBtn) {
        console.log('🆕 Creating new trip...');
        await newTripBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log('ℹ️ New trip button not found, continuing...');
    }
    
    // Look for and click the AI assistant button to open the overlay
    console.log('🤖 Looking for AI assistant button...');
    try {
      const aiButton = await page.waitForSelector('button[class*="aiAssistantButton"], button[title*="AI"], button[aria-label*="AI"]', { timeout: 5000 });
      await aiButton.click();
      console.log('✅ Clicked AI assistant button');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('ℹ️ AI assistant button not found, looking for overlay...');
    }
    
    // Wait for AI overlay to be available
    console.log('🤖 Looking for AI overlay...');
    await page.waitForSelector('[class*="aiOverlay"], [class*="AIOverlay"]', { timeout: 10000 });
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'waypoint-fix-debug.png', fullPage: true });
    
    // Find and click on the AI input field - look for AI overlay input specifically
    console.log('💬 Finding AI input field...');
    // Wait for AI overlay input within the AI overlay container
    const aiInput = await page.waitForSelector('[class*="aiOverlay"] input[type="text"], [class*="AIOverlay"] input[type="text"]', { timeout: 10000 });
    
    // Type the test prompt
    const testPrompt = 'Plan a 14-day trip from NY to LA visiting national parks';
    console.log(`💬 Typing test prompt: "${testPrompt}"`);
    await aiInput.click();
    await aiInput.type(testPrompt);
    
    // Submit the prompt
    console.log('📤 Submitting prompt...');
    await page.keyboard.press('Enter');
    
    // Wait for AI to respond and process
    console.log('⏳ Waiting for AI response and trip setup...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check the waypoints
    console.log('🔍 Checking waypoints...');
    
    // Find all waypoint inputs
    const waypointInputs = await page.$$('input[placeholder*="starting from"], input[placeholder*="going"], input[placeholder*="stop along"]');
    
    if (waypointInputs.length === 0) {
      console.log('❌ No waypoint inputs found');
      return false;
    }
    
    console.log(`📍 Found ${waypointInputs.length} waypoint inputs`);
    
    // Check the values of the waypoints
    const waypointValues = [];
    for (let i = 0; i < waypointInputs.length; i++) {
      const value = await waypointInputs[i].evaluate(el => el.value);
      waypointValues.push(value);
      console.log(`Waypoint ${String.fromCharCode(65 + i)}: "${value}"`);
    }
    
    // Test the fix: A and C should not be blank
    let testPassed = true;
    let testResults = [];
    
    if (waypointValues.length >= 2) {
      // Check waypoint A (start)
      const waypointA = waypointValues[0];
      if (waypointA && waypointA.trim() !== '') {
        console.log('✅ Waypoint A is filled:', waypointA);
        testResults.push('✅ Waypoint A: PASS');
      } else {
        console.log('❌ Waypoint A is blank');
        testResults.push('❌ Waypoint A: FAIL (blank)');
        testPassed = false;
      }
      
      // Check waypoint C (end) - should be the last waypoint
      const waypointC = waypointValues[waypointValues.length - 1];
      if (waypointC && waypointC.trim() !== '') {
        console.log('✅ Waypoint C is filled:', waypointC);
        testResults.push('✅ Waypoint C: PASS');
      } else {
        console.log('❌ Waypoint C is blank');
        testResults.push('❌ Waypoint C: FAIL (blank)');
        testPassed = false;
      }
      
      // Check if NY and LA are properly extracted
      if (waypointA && waypointA.toLowerCase().includes('new york')) {
        console.log('✅ Origin correctly set to New York');
        testResults.push('✅ Origin extraction: PASS');
      } else {
        console.log('❌ Origin not correctly set');
        testResults.push('❌ Origin extraction: FAIL');
        testPassed = false;
      }
      
      if (waypointC && waypointC.toLowerCase().includes('los angeles')) {
        console.log('✅ Destination correctly set to Los Angeles');
        testResults.push('✅ Destination extraction: PASS');
      } else {
        console.log('❌ Destination not correctly set');
        testResults.push('❌ Destination extraction: FAIL');
        testPassed = false;
      }
    } else {
      console.log('❌ Not enough waypoints found');
      testPassed = false;
    }
    
    // Take a screenshot for verification
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'waypoint-fix-test.png', fullPage: true });
    
    // Print test results
    console.log('\n📊 Test Results:');
    testResults.forEach(result => console.log(`  ${result}`));
    
    if (testPassed) {
      console.log('\n🎉 WAYPOINT FIX TEST PASSED!');
      console.log('✅ A and C waypoints are properly filled');
      console.log('✅ NY and LA are correctly extracted and set');
      console.log('✅ No blank waypoints detected');
    } else {
      console.log('\n❌ WAYPOINT FIX TEST FAILED');
      console.log('❌ Some waypoints are still blank or incorrectly set');
    }
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    try {
      await page.screenshot({ path: 'waypoint-fix-test-error.png', fullPage: true });
    } catch (screenshotError) {
      console.error('Failed to take screenshot:', screenshotError);
    }
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
(async () => {
  const success = await testWaypointFix();
  process.exit(success ? 0 : 1);
})();