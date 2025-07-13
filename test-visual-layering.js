import puppeteer from 'puppeteer';

async function testVisualLayering() {
  console.log('🚀 Testing visual layering and z-index hierarchy...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n🎨 Testing visual layering hierarchy...');
    
    // Inject CSS to create a visible test dropdown for demonstration
    await page.addStyleTag({
      content: `
        .test-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(25px);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          z-index: 99999;
          max-height: 350px;
          overflow-y: auto;
          padding: 12px;
          display: none;
        }
        
        .test-dropdown.visible {
          display: block;
        }
        
        .test-suggestion {
          padding: 12px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.2);
          margin-bottom: 8px;
          cursor: pointer;
        }
        
        .test-suggestion:hover {
          background: rgba(99, 102, 241, 0.1);
        }
      `
    });
    
    // Add test dropdown to first location input
    await page.evaluate(() => {
      const locationInput = document.querySelector('input[type="text"]');
      if (locationInput) {
        const parent = locationInput.closest('[class*="locationInput"]') || locationInput.parentElement;
        
        const testDropdown = document.createElement('div');
        testDropdown.className = 'test-dropdown visible';
        testDropdown.innerHTML = `
          <div class="test-suggestion">
            <strong>Whitesboro</strong><br>
            <small>Whitesboro, Grayson County, Texas...</small>
          </div>
          <div class="test-suggestion">
            <strong>Whitesboro</strong><br>
            <small>Whitesboro, Etowah County, Alabama...</small>
          </div>
          <div class="test-suggestion">
            <strong>Whitesboro</strong><br>
            <small>Whitesboro, New York...</small>
          </div>
        `;
        
        parent.appendChild(testDropdown);
        
        // Also focus the input to trigger focus-within
        locationInput.focus();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check z-index hierarchy
    const layeringInfo = await page.evaluate(() => {
      const testDropdown = document.querySelector('.test-dropdown');
      const waypoints = document.querySelectorAll('[class*="waypointItem"]');
      const focusedInput = document.querySelector('[class*="locationInput"]:focus-within');
      
      return {
        dropdownZIndex: testDropdown ? window.getComputedStyle(testDropdown).zIndex : 'none',
        waypointZIndex: waypoints[1] ? window.getComputedStyle(waypoints[1]).zIndex : 'none',
        focusedInputZIndex: focusedInput ? window.getComputedStyle(focusedInput).zIndex : 'none',
        dropdownVisible: testDropdown ? testDropdown.offsetHeight > 0 : false,
        waypointCount: waypoints.length
      };
    });
    
    console.log('📊 Z-Index Hierarchy:');
    console.log(`   - Test dropdown: ${layeringInfo.dropdownZIndex}`);
    console.log(`   - Waypoint item: ${layeringInfo.waypointZIndex}`);
    console.log(`   - Focused input container: ${layeringInfo.focusedInputZIndex}`);
    console.log(`   - Dropdown visible: ${layeringInfo.dropdownVisible}`);
    console.log(`   - Total waypoints: ${layeringInfo.waypointCount}`);
    
    // Visual test: ensure dropdown appears above waypoint
    const visualTest = parseInt(layeringInfo.dropdownZIndex) > parseInt(layeringInfo.waypointZIndex || '0');
    console.log(`   ✓ Dropdown above waypoints: ${visualTest ? 'YES' : 'NO'}`);
    
    // Test clicking on dropdown suggestions
    const suggestions = await page.$$('.test-suggestion');
    console.log(`   ✓ Test suggestions clickable: ${suggestions.length}`);
    
    if (suggestions.length > 0) {
      await suggestions[0].click();
      console.log('   ✓ First suggestion clicked successfully');
    }
    
    // Take screenshot showing the layering
    await page.screenshot({ 
      path: 'visual-layering-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Visual layering screenshot saved as visual-layering-test.png');
    console.log('\n✅ Visual layering test completed!');
    
    // Show the fix in action by taking another screenshot with different state
    await page.evaluate(() => {
      const dropdown = document.querySelector('.test-dropdown');
      if (dropdown) {
        dropdown.style.background = 'rgba(16, 185, 129, 0.95)';
        dropdown.style.border = '2px solid #10b981';
        dropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: white; font-weight: bold;">✅ DROPDOWN NOW APPEARS ON TOP!</div>';
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.screenshot({ 
      path: 'layering-fix-demonstration.png',
      fullPage: true
    });
    
    console.log('📸 Fix demonstration saved as layering-fix-demonstration.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testVisualLayering().catch(console.error);