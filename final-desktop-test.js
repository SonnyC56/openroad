import puppeteer from 'puppeteer';

async function finalDesktopTest() {
  console.log('🖥️  Final desktop layout test - optimized for large screens...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Test key desktop screen sizes
  const screenSizes = [
    { name: 'Desktop-FHD', width: 1920, height: 1080 },
    { name: 'Desktop-QHD', width: 2560, height: 1440 },
    { name: 'Desktop-UltraWide', width: 3440, height: 1440 },
    { name: 'Desktop-4K', width: 3840, height: 2160 }
  ];
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    for (const size of screenSizes) {
      console.log(`\n📐 Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewport({ width: size.width, height: size.height });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check space utilization and layout efficiency
      const layoutMetrics = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="sidebar"]');
        const mapContainer = document.querySelector('[class*="mapContainer"]');
        const aiOverlay = document.querySelector('[class*="aiOverlay"]');
        
        const metrics = {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          sidebarWidth: 0,
          mapWidth: 0,
          aiWidth: 0,
          usedSpace: 0,
          utilization: 0,
          hasOverflow: false
        };
        
        if (sidebar) {
          const rect = sidebar.getBoundingClientRect();
          metrics.sidebarWidth = rect.width;
          metrics.hasOverflow = metrics.hasOverflow || rect.right > window.innerWidth;
        }
        
        if (mapContainer) {
          const rect = mapContainer.getBoundingClientRect();
          metrics.mapWidth = rect.width;
          metrics.hasOverflow = metrics.hasOverflow || rect.right > window.innerWidth;
        }
        
        if (aiOverlay) {
          const rect = aiOverlay.getBoundingClientRect();
          metrics.aiWidth = rect.width;
          metrics.hasOverflow = metrics.hasOverflow || rect.right > window.innerWidth;
        }
        
        // Calculate effective map area (considering AI overlay)
        const effectiveMapWidth = metrics.mapWidth - (metrics.aiWidth * 0.8); // AI overlay overlaps map
        metrics.usedSpace = metrics.sidebarWidth + effectiveMapWidth;
        metrics.utilization = (metrics.usedSpace / window.innerWidth) * 100;
        
        return metrics;
      });
      
      // Analyze layout efficiency
      console.log(`   Viewport: ${layoutMetrics.viewportWidth}x${layoutMetrics.viewportHeight}`);
      console.log(`   Sidebar: ${Math.round(layoutMetrics.sidebarWidth)}px`);
      console.log(`   Map Area: ${Math.round(layoutMetrics.mapWidth)}px`);
      console.log(`   AI Overlay: ${Math.round(layoutMetrics.aiWidth)}px`);
      console.log(`   Space Utilization: ${layoutMetrics.utilization.toFixed(1)}%`);
      
      // Provide optimization assessment
      if (layoutMetrics.utilization > 80) {
        console.log('   ✅ Excellent space utilization!');
      } else if (layoutMetrics.utilization > 65) {
        console.log('   ✅ Good space utilization');
      } else if (layoutMetrics.utilization > 50) {
        console.log('   ⚠️  Moderate space utilization');
      } else {
        console.log('   ❌ Poor space utilization - too much empty space');
      }
      
      if (layoutMetrics.hasOverflow) {
        console.log('   ❌ Elements overflow viewport');
      } else {
        console.log('   ✅ No element overflow');
      }
      
      // Take optimized screenshot
      await page.screenshot({ 
        path: `final-optimized-${size.name.toLowerCase()}.png`,
        fullPage: false
      });
    }
    
    console.log('\n📸 All optimized layout screenshots saved');
    console.log('🎉 Desktop layout optimization complete!');
    
  } catch (error) {
    console.error('❌ Final test failed:', error.message);
  } finally {
    await browser.close();
  }
}

finalDesktopTest().catch(console.error);