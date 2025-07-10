import puppeteer from 'puppeteer';

async function debugMapLoading() {
  console.log('🔍 Debugging map loading issues...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console Warning: ${text}`);
    } else if (text.includes('Leaflet') || text.includes('map')) {
      console.log(`📍 Map Log: ${text}`);
    }
  });
  
  // Capture network errors
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`❌ Network Error: ${response.url()} - ${response.status()}`);
    }
  });
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Wait a bit for map initialization
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if map container exists
    const mapContainer = await page.$('.leaflet-container');
    console.log(mapContainer ? '✅ Leaflet container found' : '❌ Leaflet container not found');
    
    // Check if map tiles are loading
    const mapTiles = await page.$$('.leaflet-tile');
    console.log(`📍 Found ${mapTiles.length} map tiles`);
    
    // Check map element dimensions
    const mapDimensions = await page.evaluate(() => {
      const mapEl = document.querySelector('[class*="map"]');
      if (mapEl) {
        const rect = mapEl.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          display: window.getComputedStyle(mapEl).display
        };
      }
      return null;
    });
    
    console.log('📏 Map dimensions:', mapDimensions);
    
    // Take a debug screenshot
    await page.screenshot({ 
      path: 'debug-map.png',
      fullPage: true 
    });
    console.log('📸 Debug screenshot saved');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    // Keep browser open for manual inspection
    console.log('🔍 Browser left open for manual inspection...');
    // await browser.close();
  }
}

debugMapLoading().catch(console.error);