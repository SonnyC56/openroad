import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting waypoint ordering test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page;
  
  try {
    page = await browser.newPage();
    
    // Navigate to the app
    console.log('📍 Navigating to OpenRoad app...');
    await page.goto('http://localhost:5174', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for the app to load
    await page.waitForSelector('header', { timeout: 10000 });
    console.log('✅ App loaded successfully');

    // Click "New Trip" button
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.$$('button');
    let newTripButton = null;
    
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('New Trip')) {
        newTripButton = button;
        break;
      }
    }
    
    if (newTripButton) {
      await newTripButton.click();
      console.log('✅ Clicked New Trip button');
    } else {
      throw new Error('New Trip button not found');
    }

    // Wait for modal and enter trip details
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give modal time to appear
    const modalVisible = await page.$('input[placeholder*="Enter starting"]');
    if (!modalVisible) {
      throw new Error('Trip modal did not appear');
    }
    
    // Enter start location
    const startInput = await page.$('input[placeholder*="starting"]');
    if (startInput) {
      await startInput.type('New York, NY');
      console.log('✅ Entered start location: New York, NY');
    }
    
    // Enter end location  
    const endInput = await page.$('input[placeholder*="destination" i], input[placeholder*="going" i]');
    if (endInput) {
      await endInput.type('Los Angeles, CA');
      console.log('✅ Entered end location: Los Angeles, CA');
    }
    
    // Create trip by clicking the button
    const createButtons = await page.$$('button');
    for (const button of createButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Create Trip')) {
        await button.click();
        console.log('✅ Created trip');
        break;
      }
    }

    // Wait for trip to be created and AI overlay to be visible
    await new Promise(resolve => setTimeout(resolve, 2000));

    // AI overlay should be visible by default
    const aiOverlay = await page.waitForSelector('[class*="aiOverlay"]', { timeout: 5000 });
    if (aiOverlay) {
      console.log('✅ AI overlay is visible');
    }

    // Enable auto mode
    console.log('🤖 Enabling auto mode...');
    await page.waitForSelector('[class*="actionBtn"]', { timeout: 5000 });
    const actionButtons = await page.$$('[class*="actionBtn"]');
    
    // Look for the auto mode button (robot emoji)
    for (const button of actionButtons) {
      const title = await button.evaluate(el => el.title);
      if (title && title.includes('Auto')) {
        await button.click();
        console.log('✅ Auto mode enabled');
        break;
      }
    }

    // Send multi-step trip request
    const aiInput = await page.waitForSelector('[class*="inputWrapper"] input', { timeout: 5000 });
    await aiInput.type('Plan me a 14-day road trip from New York to Los Angeles visiting national parks and major cities along the way');
    console.log('✅ Typed multi-step trip request');

    // Send the message
    const sendButton = await page.$('[class*="sendButton"]');
    if (sendButton) {
      await sendButton.click();
      console.log('✅ Sent message to AI');
    }

    // Wait for AI response and auto-added waypoints
    console.log('⏳ Waiting for AI to add waypoints...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Give AI time to process and add waypoints

    // Take screenshot of the result
    await page.screenshot({ 
      path: 'waypoint-ordering-test-result.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as waypoint-ordering-test-result.png');

    // Verify waypoints were added by checking the trip planner
    const waypoints = await page.$$('[class*="waypointItem"]');
    console.log(`✅ Found ${waypoints.length} waypoints in trip planner`);

    // Extract waypoint names to verify ordering
    const waypointNames = [];
    for (const waypoint of waypoints) {
      const nameElement = await waypoint.$('input[placeholder*="location" i], input[placeholder*="starting" i], input[placeholder*="going" i]');
      if (nameElement) {
        const name = await nameElement.evaluate(el => el.value);
        if (name) waypointNames.push(name);
      }
    }
    
    console.log('📍 Waypoints in order:', waypointNames);

    // Basic geographical ordering check (very rough)
    // This is just to verify we're not getting random ordering
    const expectedOrder = ['New York', 'Chicago', 'Denver', 'Las Vegas', 'Los Angeles'];
    let orderScore = 0;
    
    for (let i = 0; i < waypointNames.length - 1; i++) {
      const current = waypointNames[i].toLowerCase();
      const next = waypointNames[i + 1].toLowerCase();
      
      // Check if current waypoint appears before next in expected order
      const currentIndex = expectedOrder.findIndex(city => 
        current.includes(city.toLowerCase())
      );
      const nextIndex = expectedOrder.findIndex(city => 
        next.includes(city.toLowerCase())
      );
      
      if (currentIndex !== -1 && nextIndex !== -1 && currentIndex < nextIndex) {
        orderScore++;
      }
    }
    
    console.log(`🎯 Geographical ordering score: ${orderScore}/${waypointNames.length - 1}`);
    
    if (orderScore > (waypointNames.length - 1) / 2) {
      console.log('✅ Waypoints appear to be in reasonable geographical order!');
    } else {
      console.log('⚠️ Waypoints may not be in optimal geographical order');
    }

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot if page exists
    if (page) {
      await page.screenshot({ 
        path: 'waypoint-ordering-test-error.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved');
    }
    
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
})();