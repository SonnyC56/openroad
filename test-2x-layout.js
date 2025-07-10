import puppeteer from 'puppeteer';

async function test2xLayout() {
  console.log('🚀 Testing 2x wider layout...');
  
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
    
    // Test various screen sizes
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
          effectiveMapWidth: mapContainer ? mapContainer.getBoundingClientRect().width - (aiOverlay ? aiOverlay.getBoundingClientRect().width * 0.6 : 0) : 0
        };
      });
      
      const sidebarPercent = (metrics.sidebarWidth / metrics.viewportWidth * 100).toFixed(1);
      const aiPercent = (metrics.aiWidth / metrics.viewportWidth * 100).toFixed(1);
      const mapPercent = (metrics.effectiveMapWidth / metrics.viewportWidth * 100).toFixed(1);
      
      console.log(`   Viewport: ${metrics.viewportWidth}px`);
      console.log(`   Sidebar: ${Math.round(metrics.sidebarWidth)}px (${sidebarPercent}%)`);
      console.log(`   AI Overlay: ${Math.round(metrics.aiWidth)}px (${aiPercent}%)`);
      console.log(`   Effective Map: ${Math.round(metrics.effectiveMapWidth)}px (${mapPercent}%)`);
      
      await page.screenshot({ 
        path: `2x-layout-${size.name.toLowerCase()}.png`
      });
    }
    
    console.log('\n📸 All 2x layout screenshots saved!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

test2xLayout().catch(console.error);