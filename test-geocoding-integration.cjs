const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // Listen for console logs
  page.on('console', msg => {
    console.log(`Browser console: ${msg.text()}`);
  });

  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('nominatim')) {
      console.log(`🌐 Geocoding request: ${request.url()}`);
    }
  });

  // Listen for responses
  page.on('response', response => {
    if (response.url().includes('nominatim')) {
      console.log(`📡 Geocoding response: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🚀 Testing geocoding integration...');
    
    // Navigate to the app
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    console.log('✅ App loaded successfully');

    // Wait for the search overlay to appear
    await page.waitForSelector('[class*="searchOverlay"]', { timeout: 5000 });
    console.log('✅ SearchOverlay component found');

    // Clear any existing text and type slowly
    await page.click('[class*="searchInput"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    
    // Type search query slowly to trigger geocoding
    await page.type('[class*="searchInput"]', 'San Francisco', { delay: 100 });
    console.log('✅ Typed "San Francisco" in search input');

    // Wait for API call and suggestions
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if suggestions appear
    const suggestions = await page.$('[class*="suggestionsContainer"]');
    if (suggestions) {
      console.log('✅ Suggestions container appeared');
      
      // Check if suggestions have content
      const suggestionItems = await page.$$('[class*="suggestionItem"]');
      if (suggestionItems.length > 0) {
        console.log(`✅ Found ${suggestionItems.length} suggestion items`);
        
        // Click on the first suggestion
        await suggestionItems[0].click();
        console.log('✅ Clicked on first suggestion');
        
        // Wait for the waypoint to be added and check if it appears on the map
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if markers exist on the map
        const markers = await page.$$('[class*="waypointMarker"]');
        console.log(`✅ Found ${markers.length} waypoint markers on the map`);
        
      } else {
        console.log('❌ No suggestion items found');
      }
    } else {
      console.log('❌ Suggestions container not found');
    }

    console.log('🎉 Geocoding integration test completed!');
    
    // Take a screenshot
    await page.screenshot({ path: 'geocoding-test.png', fullPage: true });
    console.log('📸 Screenshot saved as geocoding-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'geocoding-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();