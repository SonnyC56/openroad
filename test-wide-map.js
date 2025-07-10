import puppeteer from 'puppeteer';

async function testWideMapLayout() {
  console.log('🗺️  Testing improved wide map layout...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Test desktop sizes
    const sizes = [
      { name: 'FHD', width: 1920, height: 1080 },
      { name: 'QHD', width: 2560, height: 1440 },
      { name: 'UltraWide', width: 3440, height: 1440 }
    ];
    
    for (const size of sizes) {
      console.log(`\n📐 Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewport({ width: size.width, height: size.height });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const metrics = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"]');
        const mapContainer = document.querySelector('[class*="mapContainer"]');
        const aiOverlay = document.querySelector('[class*="aiOverlay"]');
        
        return {
          viewportWidth: window.innerWidth,
          sidebarWidth: sidebar ? sidebar.getBoundingClientRect().width : 0,
          mapWidth: mapContainer ? mapContainer.getBoundingClientRect().width : 0,
          aiWidth: aiOverlay ? aiOverlay.getBoundingClientRect().width : 0,
          effectiveMapWidth: mapContainer ? mapContainer.getBoundingClientRect().width - (aiOverlay ? aiOverlay.getBoundingClientRect().width * 0.7 : 0) : 0
        };
      });
      
      const mapPercentage = (metrics.effectiveMapWidth / metrics.viewportWidth * 100).toFixed(1);
      
      console.log(`   Viewport: ${metrics.viewportWidth}px`);
      console.log(`   Sidebar: ${Math.round(metrics.sidebarWidth)}px`);
      console.log(`   Map Container: ${Math.round(metrics.mapWidth)}px`);
      console.log(`   AI Overlay: ${Math.round(metrics.aiWidth)}px`);
      console.log(`   Effective Map Area: ${Math.round(metrics.effectiveMapWidth)}px (${mapPercentage}%)`);
      
      if (parseFloat(mapPercentage) > 60) {
        console.log('   ✅ Good map width utilization');
      } else if (parseFloat(mapPercentage) > 40) {
        console.log('   ⚠️  Moderate map width');
      } else {
        console.log('   ❌ Map too narrow for screen size');
      }
      
      await page.screenshot({ 
        path: `wide-map-${size.name.toLowerCase()}.png`
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWideMapLayout().catch(console.error);