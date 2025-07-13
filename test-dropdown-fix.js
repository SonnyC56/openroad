import puppeteer from 'puppeteer';

async function testDropdownFix() {
  console.log('🚀 Testing dropdown z-index fix...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n🔍 Testing search dropdown positioning...');
    
    // Find all location inputs
    const locationInputs = await page.$$('input[type="text"]');
    console.log(`   ✓ Found ${locationInputs.length} location inputs`);
    
    if (locationInputs.length > 0) {
      // Try the first location input
      await locationInputs[0].click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear and type a search term
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await locationInputs[0].type('whitesboro', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if dropdown appears
      const dropdown = await page.$('[class*="dropdown"]');
      console.log(`   ✓ Dropdown appeared: ${dropdown ? 'YES' : 'NO'}`);
      
      if (dropdown) {
        // Get dropdown positioning info
        const dropdownInfo = await page.evaluate(() => {
          const dropdown = document.querySelector('[class*="dropdown"]');
          if (!dropdown) return null;
          
          const computed = window.getComputedStyle(dropdown);
          const rect = dropdown.getBoundingClientRect();
          
          return {
            zIndex: computed.zIndex,
            position: computed.position,
            display: computed.display,
            visible: dropdown.offsetHeight > 0,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          };
        });
        
        console.log(`   ✓ Dropdown z-index: ${dropdownInfo.zIndex}`);
        console.log(`   ✓ Dropdown visible: ${dropdownInfo.visible}`);
        console.log(`   ✓ Dropdown height: ${Math.round(dropdownInfo.height)}px`);
        
        // Check if dropdown overlaps with waypoint below
        const waypointBelow = await page.evaluate(() => {
          const waypoints = document.querySelectorAll('[class*="waypointItem"]');
          const dropdown = document.querySelector('[class*="dropdown"]');
          
          if (!dropdown || waypoints.length < 2) return null;
          
          const dropdownRect = dropdown.getBoundingClientRect();
          const secondWaypoint = waypoints[1]; // The B waypoint
          const waypointRect = secondWaypoint.getBoundingClientRect();
          
          const overlap = !(dropdownRect.bottom < waypointRect.top || 
                           dropdownRect.top > waypointRect.bottom ||
                           dropdownRect.right < waypointRect.left || 
                           dropdownRect.left > waypointRect.right);
          
          return {
            overlap,
            dropdownBottom: dropdownRect.bottom,
            waypointTop: waypointRect.top,
            zIndexComputed: window.getComputedStyle(dropdown).zIndex
          };
        });
        
        console.log(`   ✓ Dropdown overlaps waypoint below: ${waypointBelow?.overlap ? 'YES' : 'NO'}`);
        console.log(`   ✓ Visual hierarchy correct: ${waypointBelow?.zIndexComputed > 1000 ? 'YES' : 'NO'}`);
        
        // Check suggestions
        const suggestions = await page.$$('[class*="suggestionItem"]');
        console.log(`   ✓ Found ${suggestions.length} suggestions`);
        
        if (suggestions.length > 0) {
          // Test clicking a suggestion
          await suggestions[0].click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const inputValue = await page.evaluate(() => {
            const input = document.querySelector('input:focus');
            return input ? input.value : '';
          });
          
          console.log(`   ✓ Suggestion click worked: ${inputValue ? 'YES' : 'NO'}`);
          console.log(`   📝 Selected value: "${inputValue}"`);
        }
      }
    }
    
    // Take screenshot of the fix
    await page.screenshot({ 
      path: 'dropdown-fix-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot saved as dropdown-fix-test.png');
    console.log('\n✅ Dropdown positioning test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    await page.screenshot({ 
      path: 'dropdown-fix-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

testDropdownFix().catch(console.error);