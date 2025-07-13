import puppeteer from 'puppeteer';

async function testSimpleTrip() {
  console.log('🚀 Testing simple trip creation and routing...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n📋 Testing simple trip creation...');
    
    // Get the first two location inputs (start and end)
    const locationInputs = await page.$$('input[type="text"]');
    console.log(`   ✓ Found ${locationInputs.length} location inputs`);
    
    if (locationInputs.length >= 2) {
      // Add start location
      const startInput = locationInputs[0];
      await startInput.click();
      await startInput.type('Dallas, Texas', { delay: 100 });
      await page.keyboard.press('Enter');
      
      console.log('   ✓ Added start location: Dallas, Texas');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add end location  
      const endInput = locationInputs[1];
      await endInput.click();
      await endInput.type('Austin, Texas', { delay: 100 });
      await page.keyboard.press('Enter');
      
      console.log('   ✓ Added end location: Austin, Texas');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if route calculation started
      const routeCalculating = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).some(el => 
          el.textContent && el.textContent.includes('Auto-calculating')
        );
      });
      console.log(`   ✓ Auto route calculation triggered: ${routeCalculating ? 'YES' : 'NO'}`);
      
      // Wait for calculation to complete
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Check for route result
      const routeSummary = await page.$('[class*="tripSummary"]');
      if (routeSummary) {
        const summaryText = await routeSummary.evaluate(el => el.textContent);
        console.log(`   ✅ Route calculated: ${summaryText.replace(/\s+/g, ' ').trim()}`);
      } else {
        console.log('   ❌ No route summary found');
      }
      
      // Check for interactive elements on map
      const mapInteractives = await page.evaluate(() => {
        const leafletContainer = document.querySelector('.leaflet-container');
        if (!leafletContainer) return 0;
        return leafletContainer.querySelectorAll('.leaflet-interactive').length;
      });
      console.log(`   ✓ Interactive map elements: ${mapInteractives}`);
      
      // Check AI assistant buttons
      const actionButtons = await page.$$('[class*="aiOverlay"] [class*="actionBtn"]');
      console.log(`   ✓ AI action buttons: ${actionButtons.length}`);
      
      // Try to make action buttons visible by checking their container
      if (actionButtons.length > 0) {
        const headerActions = await page.$('[class*="headerActions"]');
        if (headerActions) {
          const headerBox = await headerActions.boundingBox();
          console.log(`   📋 Header actions container: ${headerBox ? `${Math.round(headerBox.width)}x${Math.round(headerBox.height)} at (${Math.round(headerBox.x)}, ${Math.round(headerBox.y)})` : 'no bounds'}`);
        }
      }
    }
    
    // Screenshot
    await page.screenshot({ 
      path: 'simple-trip-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Simple trip test screenshot saved');
    console.log('🎯 Simple trip test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    await page.screenshot({ 
      path: 'simple-trip-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

testSimpleTrip().catch(console.error);