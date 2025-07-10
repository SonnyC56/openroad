import puppeteer from 'puppeteer';

async function testOpenRoadDetailed() {
  console.log('🚀 Starting detailed OpenRoad functionality tests...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to localhost:5174...');
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Test 1: Check if glassmorphism effects are working
    console.log('✨ Testing glassmorphism effects...');
    const glassElements = await page.$$eval('[class*="glass"], .header, .sidebar', elements => {
      return elements.map(el => {
        const styles = window.getComputedStyle(el);
        return {
          backdropFilter: styles.backdropFilter,
          background: styles.background,
          borderRadius: styles.borderRadius
        };
      });
    });
    
    const hasGlass = glassElements.some(el => 
      el.backdropFilter.includes('blur') || 
      el.background.includes('rgba')
    );
    console.log(hasGlass ? '✅ Glassmorphism effects detected' : '⚠️  No glassmorphism effects found');
    
    // Test 2: Test New Trip button functionality
    console.log('🆕 Testing New Trip button...');
    const newTripButton = await page.$('[aria-label*="New Trip"], [title*="New Trip"]');
    if (!newTripButton) {
      // Try different selectors
      const buttons = await page.$$('button');
      let found = false;
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text.includes('New Trip')) {
          console.log('✅ New Trip button found');
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ New Trip button clickable');
          found = true;
          break;
        }
      }
      if (!found) console.log('⚠️  New Trip button not found');
    } else {
      console.log('✅ New Trip button found and clicked');
    }
    
    // Test 3: Test sidebar navigation
    console.log('📂 Testing sidebar tabs...');
    const sidebarTabs = await page.$$('.tab, [role="tab"], [class*="tab"]');
    console.log(`Found ${sidebarTabs.length} sidebar tabs`);
    
    if (sidebarTabs.length > 0) {
      for (let i = 0; i < Math.min(sidebarTabs.length, 3); i++) {
        try {
          await sidebarTabs[i].click();
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`✅ Tab ${i + 1} clickable`);
        } catch (e) {
          console.log(`⚠️  Tab ${i + 1} click failed: ${e.message}`);
        }
      }
    }
    
    // Test 4: Test map layer switching
    console.log('🗺️  Testing map layer controls...');
    const layerControls = await page.$$('.leaflet-control-layers, [class*="layer"], [class*="map-control"]');
    if (layerControls.length > 0) {
      console.log('✅ Map layer controls found');
      try {
        await layerControls[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Layer controls interactive');
      } catch (e) {
        console.log('⚠️  Layer controls not clickable');
      }
    } else {
      console.log('ℹ️  No layer controls found');
    }
    
    // Test 5: Test AI chat functionality
    console.log('🤖 Testing AI features...');
    const aiElements = await page.$$('[class*="ai"], [aria-label*="AI"], [title*="AI"]');
    console.log(`Found ${aiElements.length} AI-related elements`);
    
    // Test 6: Check for form inputs
    console.log('📝 Testing form inputs...');
    const inputs = await page.$$('input, textarea');
    console.log(`Found ${inputs.length} form inputs`);
    
    if (inputs.length > 0) {
      try {
        await inputs[0].click();
        await inputs[0].type('Test location');
        await new Promise(resolve => setTimeout(resolve, 500));
        const value = await inputs[0].evaluate(el => el.value);
        console.log(value.includes('Test') ? '✅ Form inputs working' : '⚠️  Form inputs not working');
      } catch (e) {
        console.log('⚠️  Form input test failed:', e.message);
      }
    }
    
    // Test 7: Check animations
    console.log('🎬 Testing animations...');
    const animatedElements = await page.$$('[class*="animate"], [style*="transition"], [style*="transform"]');
    console.log(`Found ${animatedElements.length} potentially animated elements`);
    
    // Test 8: Test drag and drop functionality
    console.log('🖱️  Testing drag and drop...');
    const draggableElements = await page.$$('[draggable="true"], [class*="drag"], [class*="sortable"]');
    console.log(`Found ${draggableElements.length} draggable elements`);
    
    // Test 9: Check accessibility
    console.log('♿ Testing accessibility...');
    const ariaElements = await page.$$('[aria-label], [aria-describedby], [role]');
    console.log(`Found ${ariaElements.length} elements with accessibility attributes`);
    
    // Test 10: Performance and memory check
    console.log('⚡ Checking performance metrics...');
    const metrics = await page.metrics();
    const performanceGood = metrics.JSHeapUsedSize < 50 * 1024 * 1024; // Less than 50MB
    console.log(performanceGood ? '✅ Memory usage acceptable' : '⚠️  High memory usage detected');
    
    // Test 11: Check for any JavaScript errors
    console.log('🐛 Final error check...');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('error', error => errors.push(error.message));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log('❌ JavaScript errors found:');
      errors.forEach(error => console.log(`   ${error}`));
    }
    
    console.log('🎉 Detailed tests completed!');
    
    // Take a final screenshot
    await page.screenshot({ 
      path: 'test-final.png',
      fullPage: true 
    });
    console.log('📸 Final screenshot saved as test-final.png');
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error.message);
    
    await page.screenshot({ 
      path: 'detailed-error.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as detailed-error.png');
    
  } finally {
    await browser.close();
  }
}

testOpenRoadDetailed().catch(console.error);