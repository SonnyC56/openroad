import puppeteer from 'puppeteer';

async function testSearchClick() {
  console.log('🔍 Testing search click functionality...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📝 Testing search input and suggestion clicking...');
    
    // Find and focus the first location input (point A)
    await page.click('input[placeholder*="Enter location"], input[placeholder*="starting point"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type "whitesboro" to trigger search suggestions
    await page.type('input:focus', 'whitesboro', { delay: 100 });
    console.log('   ✓ Typed "whitesboro"');
    
    // Wait for suggestions to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if suggestions dropdown is visible
    const suggestionsVisible = await page.evaluate(() => {
      const dropdown = document.querySelector('[class*="dropdown"]');
      return dropdown && dropdown.offsetHeight > 0;
    });
    
    console.log(`   ${suggestionsVisible ? '✓' : '✗'} Suggestions dropdown visible: ${suggestionsVisible}`);
    
    if (suggestionsVisible) {
      // Count suggestions
      const suggestionCount = await page.evaluate(() => {
        const suggestions = document.querySelectorAll('[class*="suggestionItem"]');
        return suggestions.length;
      });
      
      console.log(`   ✓ Found ${suggestionCount} suggestions`);
      
      if (suggestionCount > 0) {
        // Click the first suggestion
        await page.click('[class*="suggestionItem"]:first-child');
        console.log('   ✓ Clicked first suggestion');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if the input value was updated
        const inputValue = await page.evaluate(() => {
          const input = document.querySelector('input:focus') || document.querySelector('input[value]');
          return input ? input.value : 'No input found';
        });
        
        console.log(`   ✓ Input value after click: "${inputValue}"`);
        
        // Check if suggestions dropdown closed
        const dropdownClosed = await page.evaluate(() => {
          const dropdown = document.querySelector('[class*="dropdown"]');
          return !dropdown || dropdown.offsetHeight === 0;
        });
        
        console.log(`   ${dropdownClosed ? '✓' : '✗'} Dropdown closed after click: ${dropdownClosed}`);
      }
    }
    
    // Take a screenshot of the final state
    await page.screenshot({ 
      path: 'search-click-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot saved as search-click-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSearchClick().catch(console.error);