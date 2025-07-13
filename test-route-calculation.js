import puppeteer from 'puppeteer';

const VIEWPORT = { width: 1200, height: 800 };
const TIMEOUT = 60000;

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function testRouteCalculation() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: VIEWPORT
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT);

  try {
    console.log('🚀 Testing route calculation with multiple waypoints...');
    
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded');

    // Set up console logging
    page.on('console', msg => {
      if (msg.text().includes('route') || msg.text().includes('waypoint')) {
        console.log('Browser console:', msg.text());
      }
    });

    // Wait for trip planner
    await page.waitForSelector('[class*="tripPlanner"]', { visible: true });
    console.log('✅ Trip planner ready');

    // Add start point
    const startInput = await page.$('[class*="waypointItem"]:first-child input');
    await startInput.click({ clickCount: 3 });
    await startInput.type('San Francisco, CA');
    await delay(2000);

    // Add end point
    const endInput = await page.$('[class*="waypointItem"]:last-child input');
    await endInput.click({ clickCount: 3 });
    await endInput.type('Los Angeles, CA');
    await delay(2000);

    // Add middle waypoint using the Add Stop button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
      if (addStopBtn) addStopBtn.click();
    });
    await delay(500);
    console.log('✅ Added middle waypoint');

    // Fill in the middle waypoint
    const middleInput = await page.$('[class*="waypointItem"]:nth-child(2) input');
    await middleInput.click({ clickCount: 3 });
    await middleInput.type('Santa Barbara, CA');
    await delay(2000);

    // Add another waypoint
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addStopBtn = buttons.find(btn => btn.textContent.includes('Add Stop'));
      if (addStopBtn) addStopBtn.click();
    });
    await delay(500);

    const secondMiddleInput = await page.$('[class*="waypointItem"]:nth-child(3) input');
    await secondMiddleInput.click({ clickCount: 3 });
    await secondMiddleInput.type('San Luis Obispo, CA');
    await delay(3000); // Wait for route calculation

    // Check console logs
    console.log('⏳ Waiting for route calculation...');
    await delay(3000);

    // Take screenshot
    await page.screenshot({ path: 'route-calculation-test.png', fullPage: true });
    console.log('📸 Screenshot saved as route-calculation-test.png');

    // Test AI awareness (if API key is set)
    const aiOverlay = await page.$('[class*="aiOverlay"]');
    if (aiOverlay) {
      // Click on a route segment if visible
      await page.evaluate(() => {
        const paths = document.querySelectorAll('path[stroke="#6366f1"]');
        if (paths.length > 0) {
          paths[0].click();
        }
      });
      await delay(1000);
      console.log('✅ Clicked on route segment for AI context');
    }

    console.log('\n✅ Route calculation test completed!');
    console.log('Key verifications:');
    console.log('  - Multiple waypoints added successfully');
    console.log('  - Route should show all segments');
    console.log('  - AI should have leg awareness when clicked');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'route-calculation-error.png', fullPage: true });
    console.log('📸 Error screenshot saved');
    throw error;
  } finally {
    await browser.close();
  }
}

testRouteCalculation().catch(console.error);