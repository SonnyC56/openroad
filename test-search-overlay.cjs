const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    console.log('🚀 Starting SearchOverlay test...');
    
    // Navigate to the app
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    console.log('✅ App loaded successfully');

    // Wait for the search overlay to appear
    await page.waitForSelector('[class*="searchOverlay"]', { timeout: 5000 });
    console.log('✅ SearchOverlay component found');

    // Check if search input exists
    const searchInput = await page.$('[class*="searchInput"]');
    if (searchInput) {
      console.log('✅ Search input found');
    } else {
      console.log('❌ Search input not found');
    }

    // Check if Add Stop button exists
    const addButton = await page.$('[class*="addButton"]');
    if (addButton) {
      console.log('✅ Add Stop button found');
    } else {
      console.log('❌ Add Stop button not found');
    }

    // Test search functionality
    await page.type('[class*="searchInput"]', 'New York');
    console.log('✅ Typed "New York" in search input');

    // Wait for suggestions to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if suggestions appear
    const suggestions = await page.$('[class*="suggestionsContainer"]');
    if (suggestions) {
      console.log('✅ Suggestions container appeared');
      
      // Check if suggestions have content
      const suggestionItems = await page.$$('[class*="suggestionItem"]');
      if (suggestionItems.length > 0) {
        console.log(`✅ Found ${suggestionItems.length} suggestion items`);
      } else {
        console.log('❌ No suggestion items found');
      }
    } else {
      console.log('❌ Suggestions container not found');
    }

    // Test Add Stop button functionality
    await page.click('[class*="addButton"]');
    console.log('✅ Clicked Add Stop button');

    // Wait a moment for the waypoint to be added
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if search input was cleared
    const searchInputValue = await page.$eval('[class*="searchInput"]', el => el.value);
    if (searchInputValue === '') {
      console.log('✅ Search input was cleared after adding stop');
    } else {
      console.log('❌ Search input was not cleared after adding stop');
    }

    console.log('🎉 SearchOverlay test completed successfully!');
    
    // Take a screenshot
    await page.screenshot({ path: 'search-overlay-test.png', fullPage: true });
    console.log('📸 Screenshot saved as search-overlay-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'search-overlay-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as search-overlay-error.png');
  } finally {
    await browser.close();
  }
})();