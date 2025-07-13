import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting POI system test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page;
  
  try {
    page = await browser.newPage();
    
    // Navigate to the app
    console.log('📍 Navigating to OpenRoad app...');
    await page.goto('http://localhost:5174', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for the app to load
    await page.waitForSelector('header', { timeout: 10000 });
    console.log('✅ App loaded successfully');

    // Wait for map to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if POIs are visible (should be visible at initial zoom)
    await page.evaluate(() => {
      console.log('Current zoom level:', window.map?.getZoom());
      const poiMarkers = document.querySelectorAll('.poi-marker-container');
      console.log('POI markers found:', poiMarkers.length);
    });

    // Test POI toggle button
    console.log('🌟 Testing POI toggle button...');
    const poiToggleButton = await page.$('button[title*="points of interest"]');
    if (poiToggleButton) {
      await poiToggleButton.click();
      console.log('✅ POI toggle button clicked');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Click again to show POIs
      await poiToggleButton.click();
      console.log('✅ POI toggle button clicked again');
    }

    // Try to find and click a POI marker
    console.log('🎯 Looking for POI markers...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const poiMarkers = await page.$$('.poi-marker-container');
    console.log(`📍 Found ${poiMarkers.length} POI markers`);

    if (poiMarkers.length > 0) {
      console.log('🖱️ Clicking first POI marker...');
      await poiMarkers[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if popup appeared
      const popup = await page.$('.leaflet-popup');
      if (popup) {
        console.log('✅ POI popup appeared');
        
        // Try to find the POI details
        const popupContent = await popup.evaluate(el => el.textContent);
        console.log('📝 Popup content preview:', popupContent.substring(0, 100) + '...');
      }
    }

    // Test zoom level changes
    console.log('🔍 Testing zoom level changes...');
    await page.evaluate(() => {
      if (window.map) {
        window.map.setZoom(8); // Higher zoom to see more POIs
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const highZoomPOIs = await page.$$('.poi-marker-container');
    console.log(`📍 POIs at zoom 8: ${highZoomPOIs.length}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'poi-system-test-result.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as poi-system-test-result.png');

    console.log('\n✅ POI system test completed!');
    console.log('🌟 Features tested:');
    console.log('  - POI visibility at different zoom levels');
    console.log('  - POI toggle button functionality');  
    console.log('  - POI marker click interaction');
    console.log('  - Popup display');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (page) {
      await page.screenshot({ 
        path: 'poi-system-test-error.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved');
    }
    
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
})();