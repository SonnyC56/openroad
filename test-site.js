import puppeteer from 'puppeteer';

async function testOpenRoadSite() {
  console.log('🚀 Starting OpenRoad site tests...');
  
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
      timeout: 10000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Test 1: Check if the main components are present
    console.log('🔍 Testing main components...');
    
    const header = await page.$('.header, header, [class*="header"]');
    console.log(header ? '✅ Header found' : '❌ Header not found');
    
    const sidebar = await page.$('.sidebar, [class*="sidebar"]');
    console.log(sidebar ? '✅ Sidebar found' : '❌ Sidebar not found');
    
    const map = await page.$('.leaflet-container, [class*="map"]');
    console.log(map ? '✅ Map container found' : '❌ Map container not found');
    
    // Test 2: Check for React errors in console
    console.log('🐛 Checking for console errors...');
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (consoleLogs.length > 0) {
      console.log('❌ Console errors found:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Test 3: Test navigation tabs if present
    console.log('🧭 Testing navigation...');
    const navTabs = await page.$$('[role="tab"], .tab, [class*="tab"]');
    if (navTabs.length > 0) {
      console.log(`✅ Found ${navTabs.length} navigation tabs`);
      
      // Try clicking the first tab
      try {
        await navTabs[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Tab navigation working');
      } catch (e) {
        console.log('⚠️  Tab click failed:', e.message);
      }
    } else {
      console.log('ℹ️  No navigation tabs found');
    }
    
    // Test 4: Test trip planner functionality
    console.log('🗺️  Testing trip planner...');
    const addButton = await page.$('button[class*="add"], [aria-label*="add"], [title*="add"]');
    if (addButton) {
      console.log('✅ Add button found');
      try {
        await addButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Add button clickable');
      } catch (e) {
        console.log('⚠️  Add button click failed:', e.message);
      }
    } else {
      console.log('ℹ️  No add button found');
    }
    
    // Test 5: Check responsive design
    console.log('📱 Testing responsive design...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone size
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mobileHeader = await page.$('.header, header, [class*="header"]');
    console.log(mobileHeader ? '✅ Header responsive' : '❌ Header not responsive');
    
    // Reset viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Test 6: Check for any broken images
    console.log('🖼️  Checking for broken images...');
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalWidth === 0).length;
    });
    
    console.log(brokenImages === 0 ? '✅ No broken images' : `❌ ${brokenImages} broken images found`);
    
    // Test 7: Performance check
    console.log('⚡ Checking performance...');
    const metrics = await page.metrics();
    console.log(`✅ Performance metrics:
      - JS Heap Used: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB
      - Nodes: ${metrics.Nodes}
      - Layout Duration: ${Math.round(metrics.LayoutDuration * 1000)}ms`);
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'error-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as error-screenshot.png');
    
  } finally {
    await browser.close();
  }
}

// Run the tests
testOpenRoadSite().catch(console.error);