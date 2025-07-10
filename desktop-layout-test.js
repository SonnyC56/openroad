import puppeteer from 'puppeteer';

async function testDesktopLayout() {
  console.log('🖥️  Testing desktop layout for overlapping and cutoff elements...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Test various desktop screen sizes
  const screenSizes = [
    { name: 'Standard Desktop', width: 1920, height: 1080 },
    { name: 'Large Desktop', width: 2560, height: 1440 },
    { name: 'Ultra-wide', width: 3440, height: 1440 },
    { name: 'MacBook Pro 16"', width: 3072, height: 1920 },
    { name: '4K Desktop', width: 3840, height: 2160 }
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
      
      // Check for layout issues
      const layoutIssues = await page.evaluate(() => {
        const issues = [];
        
        // Check if elements are cut off
        const sidebar = document.querySelector('[class*="sidebar"]');
        const mapContainer = document.querySelector('[class*="mapContainer"]');
        const header = document.querySelector('[class*="header"]');
        
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          if (sidebarRect.right > window.innerWidth) {
            issues.push(`Sidebar cutoff: extends ${sidebarRect.right - window.innerWidth}px beyond viewport`);
          }
        }
        
        if (mapContainer) {
          const mapRect = mapContainer.getBoundingClientRect();
          if (mapRect.right > window.innerWidth) {
            issues.push(`Map cutoff: extends ${mapRect.right - window.innerWidth}px beyond viewport`);
          }
          if (mapRect.bottom > window.innerHeight) {
            issues.push(`Map cutoff: extends ${mapRect.bottom - window.innerHeight}px below viewport`);
          }
        }
        
        // Check for overlapping elements
        const allElements = document.querySelectorAll('[class*="sidebar"], [class*="mapContainer"], [class*="header"]');
        for (let i = 0; i < allElements.length; i++) {
          for (let j = i + 1; j < allElements.length; j++) {
            const rect1 = allElements[i].getBoundingClientRect();
            const rect2 = allElements[j].getBoundingClientRect();
            
            // Check for overlap
            if (rect1.left < rect2.right && rect2.left < rect1.right &&
                rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
              issues.push(`Overlap detected between ${allElements[i].className} and ${allElements[j].className}`);
            }
          }
        }
        
        // Check sidebar width utilization
        if (sidebar && mapContainer) {
          const sidebarWidth = sidebar.getBoundingClientRect().width;
          const mapWidth = mapContainer.getBoundingClientRect().width;
          const totalUsed = sidebarWidth + mapWidth;
          const utilization = (totalUsed / window.innerWidth) * 100;
          
          return {
            issues,
            sidebarWidth,
            mapWidth,
            totalUsed,
            utilization: utilization.toFixed(1),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          };
        }
        
        return { issues };
      });
      
      console.log(`   Viewport: ${layoutIssues.viewportWidth}x${layoutIssues.viewportHeight}`);
      if (layoutIssues.sidebarWidth) {
        console.log(`   Sidebar: ${layoutIssues.sidebarWidth}px`);
        console.log(`   Map: ${layoutIssues.mapWidth}px`);
        console.log(`   Space utilization: ${layoutIssues.utilization}%`);
      }
      
      if (layoutIssues.issues.length > 0) {
        console.log('   ❌ Issues found:');
        layoutIssues.issues.forEach(issue => console.log(`     - ${issue}`));
      } else {
        console.log('   ✅ No layout issues detected');
      }
      
      // Take screenshot for this size
      await page.screenshot({ 
        path: `layout-test-${size.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`,
        fullPage: false
      });
    }
    
    console.log('\n📸 All layout test screenshots saved');
    
  } catch (error) {
    console.error('❌ Layout test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDesktopLayout().catch(console.error);