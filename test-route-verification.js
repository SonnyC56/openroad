import puppeteer from 'puppeteer';

async function testRouteVerification() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('🚀 Verifying route calculation includes all waypoints...');
    
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🗺️') || text.includes('✅') || text.includes('📍')) {
        console.log('Console:', text);
      }
    });

    // Wait for trip planner
    await page.waitForSelector('[class*="tripPlanner"]', { visible: true });

    // Add waypoints with coordinates
    const waypoints = [
      { selector: '[class*="waypointItem"]:first-child input', location: 'San Francisco, CA' },
      { selector: '[class*="waypointItem"]:last-child input', location: 'Los Angeles, CA' }
    ];

    for (const wp of waypoints) {
      const input = await page.$(wp.selector);
      await input.click({ clickCount: 3 });
      await input.type(wp.location);
      await page.waitForTimeout(1500);
    }

    // Add middle waypoint
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
      if (addStopBtn) addStopBtn.click();
    });
    await page.waitForTimeout(500);

    const middleInput = await page.$('[class*="waypointItem"]:nth-child(2) input');
    await middleInput.click({ clickCount: 3 });
    await middleInput.type('Monterey, CA');
    await page.waitForTimeout(3000);

    // Check route data
    const routeInfo = await page.evaluate(() => {
      const tripSummary = document.querySelector('[class*="tripSummary"]');
      const summaryText = tripSummary ? tripSummary.innerText : '';
      
      // Count route segments on map
      const routeSegments = document.querySelectorAll('path[stroke="#6366f1"]').length;
      
      return {
        summaryText,
        routeSegments,
        waypointCount: document.querySelectorAll('[class*="waypointItem"]').length
      };
    });

    console.log('\n📊 Route Verification Results:');
    console.log(`  - Waypoints in planner: ${routeInfo.waypointCount}`);
    console.log(`  - Route segments on map: ${routeInfo.routeSegments}`);
    console.log(`  - Trip summary: ${routeInfo.summaryText.replace(/\n/g, ' ')}`);

    // Take final screenshot
    await page.screenshot({ path: 'route-verification-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved as route-verification-final.png');

    // Verify expectations
    if (routeInfo.waypointCount === 3 && routeInfo.routeSegments >= 2) {
      console.log('\n✅ SUCCESS: Route includes all waypoints!');
    } else {
      console.log('\n⚠️  WARNING: Route may not include all waypoints');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'route-verification-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testRouteVerification().catch(console.error);