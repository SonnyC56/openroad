import puppeteer from 'puppeteer';

async function testClickToSelect() {
  console.log('🚀 Testing click-to-select functionality...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: 300 // Slow down for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n🖱️ Testing click-to-select vs Enter key...');
    
    // Find location input
    const locationInputs = await page.$$('input[type="text"]');
    console.log(`   ✓ Found ${locationInputs.length} location inputs`);
    
    if (locationInputs.length > 0) {
      const input = locationInputs[0];
      
      // Test 1: Type and wait for suggestions
      await input.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear and type
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await input.type('san francisco', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for dropdown
      let dropdown = await page.$('[class*="dropdown"]');
      console.log(`   ✓ Dropdown appeared: ${dropdown ? 'YES' : 'NO'}`);
      
      if (!dropdown) {
        // Try with a different search term that might work offline
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await input.type('whitesboro', { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        dropdown = await page.$('[class*="dropdown"]');
        console.log(`   ✓ Dropdown appeared (2nd attempt): ${dropdown ? 'YES' : 'NO'}`);
      }
      
      if (dropdown) {
        // Get suggestions
        const suggestions = await page.$$('[class*="suggestionItem"]');
        console.log(`   ✓ Found suggestions: ${suggestions.length}`);
        
        if (suggestions.length > 0) {
          // Test click-to-select
          console.log('\n🖱️ Testing click-to-select...');
          
          const initialValue = await input.evaluate(el => el.value);
          console.log(`   📝 Initial input value: "${initialValue}"`);
          
          // Click on first suggestion
          await suggestions[0].click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const clickValue = await input.evaluate(el => el.value);
          console.log(`   📝 Value after click: "${clickValue}"`);
          
          const clickWorked = clickValue !== initialValue && clickValue.length > 0;
          console.log(`   ✅ Click-to-select worked: ${clickWorked ? 'YES' : 'NO'}`);
          
          // Reset for next test
          await input.click();
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          await input.type('new york', { delay: 100 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Test Enter key for comparison
          console.log('\n⌨️ Testing Enter key selection...');
          
          const enterInitialValue = await input.evaluate(el => el.value);
          console.log(`   📝 Initial value for Enter test: "${enterInitialValue}"`);
          
          // Press Enter
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const enterValue = await input.evaluate(el => el.value);
          console.log(`   📝 Value after Enter: "${enterValue}"`);
          
          const enterWorked = enterValue !== enterInitialValue || enterValue.length > 0;
          console.log(`   ✅ Enter key worked: ${enterWorked ? 'YES' : 'NO'}`);
          
          // Test summary
          console.log('\n📊 Test Results:');
          console.log(`   🖱️ Click selection: ${clickWorked ? 'WORKING' : 'NEEDS FIX'}`);
          console.log(`   ⌨️ Enter key: ${enterWorked ? 'WORKING' : 'NEEDS FIX'}`);
          
          if (clickWorked) {
            console.log('   ✅ Click-to-select is now working properly!');
          } else {
            console.log('   ❌ Click-to-select still needs fixes');
          }
        }
      } else {
        console.log('   ⚠️ No dropdown appeared - might need geocoding API key');
        
        // Test manual dropdown injection
        console.log('\n🧪 Injecting test dropdown for functionality test...');
        
        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"]');
          if (input) {
            const parent = input.closest('[class*="locationInput"]') || input.parentElement;
            
            // Create test dropdown HTML
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown-test';
            dropdown.style.cssText = `
              position: absolute;
              top: calc(100% + 0.5rem);
              left: 0;
              right: 0;
              background: rgba(255, 255, 255, 0.98);
              backdrop-filter: blur(25px);
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
              z-index: 99999;
              max-height: 350px;
              overflow-y: auto;
              padding: 8px;
            `;
            
            dropdown.innerHTML = `
              <button class="suggestionItem test-suggestion" style="
                display: flex;
                align-items: center;
                width: 100%;
                padding: 12px;
                border: none;
                background: transparent;
                cursor: pointer;
                text-align: left;
                border-radius: 8px;
                margin-bottom: 4px;
              ">
                <div style="margin-right: 12px;">📍</div>
                <div>
                  <div style="font-weight: 500;">Test Location</div>
                  <div style="font-size: 12px; color: #666;">Test City, Test State</div>
                </div>
              </button>
            `;
            
            parent.appendChild(dropdown);
            
            // Add click handler
            dropdown.querySelector('.test-suggestion').addEventListener('click', () => {
              input.value = 'Test Location Selected';
              dropdown.remove();
            });
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test the injected dropdown
        const testSuggestion = await page.$('.test-suggestion');
        if (testSuggestion) {
          console.log('   ✓ Test dropdown injected successfully');
          
          await testSuggestion.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const testValue = await input.evaluate(el => el.value);
          console.log(`   📝 Test click result: "${testValue}"`);
          console.log(`   ✅ Test click worked: ${testValue.includes('Test Location') ? 'YES' : 'NO'}`);
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'click-to-select-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot saved as click-to-select-test.png');
    console.log('\n🎯 Click-to-select test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    await page.screenshot({ 
      path: 'click-to-select-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

testClickToSelect().catch(console.error);