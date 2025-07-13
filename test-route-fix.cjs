const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing route rendering fix...');
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  try {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    await new Promise(r => setTimeout(r, 2000));

    // Add start location
    await page.click('input[placeholder*="Where are you starting from"]');
    await page.type('input[placeholder*="Where are you starting from"]', 'San Francisco');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1000));

    // Add a middle waypoint
    await page.click('.btn:has-text("Add Stop")');
    await new Promise(r => setTimeout(r, 500));
    
    const waypointInputs = await page.$$('input[placeholder*="Enter location"]');
    await waypointInputs[1].click();
    await waypointInputs[1].type('Monterey');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 1000));

    // Add end location
    const endInput = await page.$('input[placeholder*="Where do you want to go"]');
    await endInput.click();
    await endInput.type('Los Angeles');
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3000));

    // Take a screenshot
    await page.screenshot({ path: 'route-fix-test.png' });
    console.log('📸 Screenshot saved as route-fix-test.png');

    // Click on a route segment to test selection
    await page.mouse.click(700, 500);
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'route-segment-selected.png' });
    console.log('📸 Screenshot saved as route-segment-selected.png');

    console.log('✅ Route rendering test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'route-fix-error.png' });
  } finally {
    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
  }
})();