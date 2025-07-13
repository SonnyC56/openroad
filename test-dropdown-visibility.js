import puppeteer from 'puppeteer';

async function testDropdownVisibility() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔍') || text.includes('📍') || text.includes('✅') || text.includes('Search error')) {
      console.log('Browser console:', text);
    }
  });

  try {
    console.log('🚀 Testing location dropdown visibility...');
    
    // Try multiple ports
    const ports = [5174, 5175, 5173];
    let connected = false;
    
    for (const port of ports) {
      try {
        await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2', timeout: 5000 });
        console.log(`✅ Connected to localhost:${port}`);
        connected = true;
        break;
      } catch (e) {
        console.log(`❌ Could not connect to localhost:${port}`);
      }
    }

    if (!connected) {
      throw new Error('Could not connect to any dev server port');
    }

    // Wait for trip planner
    await page.waitForSelector('[class*="tripPlanner"]', { visible: true });
    console.log('✅ Trip planner loaded');

    // Click on the first location input
    const firstInput = await page.$('[class*="waypointItem"]:first-child input');
    await firstInput.click();
    await firstInput.type('San Francisco');
    
    console.log('⏳ Waiting for dropdown to appear...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if dropdown is visible
    const dropdownInfo = await page.evaluate(() => {
      // Look for dropdown in multiple ways
      let dropdown = document.querySelector('[class*="dropdown"]');
      
      // Also check in document.body for portal
      if (!dropdown) {
        const allDivs = document.body.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.className && div.className.includes && div.className.includes('dropdown')) {
            dropdown = div;
            break;
          }
        }
      }
      
      // Check for any motion divs that might be dropdown
      if (!dropdown) {
        const motionDivs = document.querySelectorAll('div[style*="opacity"]');
        console.log('Found motion divs:', motionDivs.length);
      }
      
      if (!dropdown) return { found: false, bodyChildCount: document.body.children.length };
      
      const rect = dropdown.getBoundingClientRect();
      const style = window.getComputedStyle(dropdown);
      
      return {
        found: true,
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        opacity: style.opacity,
        zIndex: style.zIndex,
        position: style.position,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
        parent: dropdown.parentElement.tagName,
        className: dropdown.className
      };
    });

    console.log('\n📊 Dropdown Analysis:');
    console.log(JSON.stringify(dropdownInfo, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'dropdown-visibility-test.png', fullPage: false });
    console.log('\n📸 Screenshot saved as dropdown-visibility-test.png');

    if (dropdownInfo.found && dropdownInfo.visible && dropdownInfo.height > 0) {
      console.log('\n✅ SUCCESS: Dropdown is visible!');
    } else {
      console.log('\n❌ FAIL: Dropdown is not properly visible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'dropdown-visibility-error.png', fullPage: false });
  } finally {
    await browser.close();
  }
}

testDropdownVisibility().catch(console.error);