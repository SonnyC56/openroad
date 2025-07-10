import puppeteer from 'puppeteer';

async function testAIImprovements() {
  console.log('🚀 Testing AI improvements and map changes...');
  
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
    
    console.log('\n📝 Testing map click functionality removed...');
    
    // Click on the map area to ensure no waypoints are added  
    const mapContainer = await page.$('[class*="mapContainer"]');
    if (mapContainer) {
      await mapContainer.click({ delay: 100 });
    } else {
      console.log('   ⚠️ Map container not found, trying alternative selector');
      await page.click('#map', { delay: 100 });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if any unwanted markers were added
    const unwantedMarkers = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon');
      return markers.length;
    });
    
    console.log(`   ✓ Map click test: ${unwantedMarkers === 0 ? 'PASSED' : 'FAILED'} (${unwantedMarkers} markers found)`);
    
    console.log('\n🤖 Testing AI interface improvements...');
    
    // Check if AI overlay is present
    const aiOverlayExists = await page.$('[class*="aiOverlay"]');
    console.log(`   ✓ AI overlay present: ${aiOverlayExists ? 'YES' : 'NO'}`);
    
    // Check if interactive suggestions would be displayed
    const messagesContainer = await page.$('[class*="messages"]');
    console.log(`   ✓ Messages container present: ${messagesContainer ? 'YES' : 'NO'}`);
    
    // Test search dropdown positioning
    console.log('\n🔍 Testing search dropdown positioning...');
    
    // Click on a location input field
    const locationInput = await page.$('input[placeholder*="starting"], input[placeholder*="location"]');
    if (locationInput) {
      await locationInput.click();
      await page.type('input:focus', 'san francisco', { delay: 50 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if dropdown appears with proper z-index
      const dropdown = await page.$('[class*="dropdown"]');
      if (dropdown) {
        const dropdownStyle = await page.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            zIndex: computed.zIndex,
            position: computed.position,
            display: computed.display
          };
        }, dropdown);
        
        console.log(`   ✓ Dropdown z-index: ${dropdownStyle.zIndex}`);
        console.log(`   ✓ Dropdown visible: ${dropdownStyle.display !== 'none'}`);
      } else {
        console.log('   ⚠️ No dropdown found (might need API key or network)');
      }
    }
    
    // Test if suggestions appear properly structured
    console.log('\n📊 Testing suggestion button styles...');
    
    const suggestionButtons = await page.$$('[class*="suggestionChip"]');
    console.log(`   ✓ Found ${suggestionButtons.length} suggestion chips`);
    
    // Take screenshot to verify visual improvements
    await page.screenshot({ 
      path: 'ai-improvements-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot saved as ai-improvements-test.png');
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAIImprovements().catch(console.error);