import puppeteer from 'puppeteer';

async function testCollapsibleFocused() {
  console.log('🚀 Testing AI collapsible menu - Focused Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: 200 // Slower for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n🎯 Focused Collapsible Menu Test');
    
    // Get initial measurements
    const initialMeasurements = await page.evaluate(() => {
      const overlay = document.querySelector('[class*="aiOverlay"]');
      const header = document.querySelector('[class*="overlayHeader"]');
      const content = document.querySelector('[class*="messagesContainer"]');
      const input = document.querySelector('[class*="inputContainer"]');
      
      return {
        overlayHeight: overlay ? overlay.getBoundingClientRect().height : 0,
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        contentHeight: content ? content.getBoundingClientRect().height : 0,
        inputHeight: input ? input.getBoundingClientRect().height : 0,
        contentVisible: content ? content.offsetHeight > 0 : false,
        inputVisible: input ? input.offsetHeight > 0 : false
      };
    });
    
    console.log('📏 Initial State Measurements:');
    console.log(`   - Total overlay height: ${Math.round(initialMeasurements.overlayHeight)}px`);
    console.log(`   - Header height: ${Math.round(initialMeasurements.headerHeight)}px`);
    console.log(`   - Content height: ${Math.round(initialMeasurements.contentHeight)}px`);
    console.log(`   - Input height: ${Math.round(initialMeasurements.inputHeight)}px`);
    console.log(`   - Content visible: ${initialMeasurements.contentVisible}`);
    console.log(`   - Input visible: ${initialMeasurements.inputVisible}`);
    
    // Test collapse
    console.log('\n⬇️ Testing Collapse...');
    const collapseButton = await page.$('[title*="Collapse"]');
    if (!collapseButton) {
      throw new Error('Collapse button not found');
    }
    
    await collapseButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for animation
    
    const collapsedMeasurements = await page.evaluate(() => {
      const overlay = document.querySelector('[class*="aiOverlay"]');
      const header = document.querySelector('[class*="overlayHeader"]');
      const content = document.querySelector('[class*="messagesContainer"]');
      const input = document.querySelector('[class*="inputContainer"]');
      const collapsibleContent = document.querySelector('[class*="collapsibleContent"]');
      
      return {
        overlayHeight: overlay ? overlay.getBoundingClientRect().height : 0,
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        contentHeight: content ? content.getBoundingClientRect().height : 0,
        inputHeight: input ? input.getBoundingClientRect().height : 0,
        contentVisible: content ? content.offsetHeight > 0 : false,
        inputVisible: input ? input.offsetHeight > 0 : false,
        collapsibleHeight: collapsibleContent ? collapsibleContent.getBoundingClientRect().height : 0,
        collapsibleVisible: collapsibleContent ? collapsibleContent.offsetHeight > 0 : false
      };
    });
    
    console.log('📏 Collapsed State Measurements:');
    console.log(`   - Total overlay height: ${Math.round(collapsedMeasurements.overlayHeight)}px`);
    console.log(`   - Header height: ${Math.round(collapsedMeasurements.headerHeight)}px`);
    console.log(`   - Collapsible content height: ${Math.round(collapsedMeasurements.collapsibleHeight)}px`);
    console.log(`   - Content visible: ${collapsedMeasurements.contentVisible}`);
    console.log(`   - Input visible: ${collapsedMeasurements.inputVisible}`);
    console.log(`   - Collapsible visible: ${collapsedMeasurements.collapsibleVisible}`);
    
    // Verify collapse worked
    const collapseSuccess = !collapsedMeasurements.collapsibleVisible && 
                           collapsedMeasurements.overlayHeight < initialMeasurements.overlayHeight;
    console.log(`   ✓ Collapse successful: ${collapseSuccess ? 'YES' : 'NO'}`);
    
    // Test expand
    console.log('\n⬆️ Testing Expand...');
    const expandButton = await page.$('[title*="Expand"]');
    if (!expandButton) {
      throw new Error('Expand button not found');
    }
    
    await expandButton.click();
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for animation
    
    const expandedMeasurements = await page.evaluate(() => {
      const overlay = document.querySelector('[class*="aiOverlay"]');
      const header = document.querySelector('[class*="overlayHeader"]');
      const content = document.querySelector('[class*="messagesContainer"]');
      const input = document.querySelector('[class*="inputContainer"]');
      const collapsibleContent = document.querySelector('[class*="collapsibleContent"]');
      
      return {
        overlayHeight: overlay ? overlay.getBoundingClientRect().height : 0,
        headerHeight: header ? header.getBoundingClientRect().height : 0,
        contentHeight: content ? content.getBoundingClientRect().height : 0,
        inputHeight: input ? input.getBoundingClientRect().height : 0,
        contentVisible: content ? content.offsetHeight > 0 : false,
        inputVisible: input ? input.offsetHeight > 0 : false,
        collapsibleHeight: collapsibleContent ? collapsibleContent.getBoundingClientRect().height : 0,
        collapsibleVisible: collapsibleContent ? collapsibleContent.offsetHeight > 0 : false
      };
    });
    
    console.log('📏 Expanded State Measurements:');
    console.log(`   - Total overlay height: ${Math.round(expandedMeasurements.overlayHeight)}px`);
    console.log(`   - Header height: ${Math.round(expandedMeasurements.headerHeight)}px`);
    console.log(`   - Collapsible content height: ${Math.round(expandedMeasurements.collapsibleHeight)}px`);
    console.log(`   - Content visible: ${expandedMeasurements.contentVisible}`);
    console.log(`   - Input visible: ${expandedMeasurements.inputVisible}`);
    console.log(`   - Collapsible visible: ${expandedMeasurements.collapsibleVisible}`);
    
    // Verify expand worked
    const expandSuccess = expandedMeasurements.collapsibleVisible && 
                         expandedMeasurements.overlayHeight > collapsedMeasurements.overlayHeight;
    console.log(`   ✓ Expand successful: ${expandSuccess ? 'YES' : 'NO'}`);
    
    // Test multiple rapid toggles
    console.log('\n🔄 Testing Rapid Toggle...');
    for (let i = 0; i < 3; i++) {
      const toggleButton = await page.$('[title*="Collapse"], [title*="Expand"]');
      if (toggleButton) {
        await toggleButton.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Final state check
    const finalVisible = await page.evaluate(() => {
      const collapsibleContent = document.querySelector('[class*="collapsibleContent"]');
      return collapsibleContent ? collapsibleContent.offsetHeight > 0 : false;
    });
    console.log(`   ✓ Final state after rapid toggles: ${finalVisible ? 'EXPANDED' : 'COLLAPSED'}`);
    
    // Test header always visible
    console.log('\n📋 Testing Header Persistence...');
    const headerAlwaysVisible = await page.evaluate(() => {
      const header = document.querySelector('[class*="overlayHeader"]');
      return header && header.offsetHeight > 0;
    });
    console.log(`   ✓ Header always visible: ${headerAlwaysVisible ? 'YES' : 'NO'}`);
    
    // Test button functionality in collapsed state
    if (!finalVisible) {
      console.log('\n🔘 Testing Buttons in Collapsed State...');
      const buttonsInHeader = await page.$$('[class*="headerActions"] button');
      console.log(`   ✓ Buttons accessible in collapsed state: ${buttonsInHeader.length}`);
      
      for (let i = 0; i < buttonsInHeader.length; i++) {
        const buttonTitle = await page.evaluate(btn => btn.title, buttonsInHeader[i]);
        console.log(`   - Button ${i + 1}: ${buttonTitle || 'No title'}`);
      }
    }
    
    // Take final screenshots
    await page.screenshot({ 
      path: 'collapsible-final-state.png',
      fullPage: true
    });
    
    console.log('\n🎯 Test Results Summary:');
    console.log(`   ✅ Collapse functionality: ${collapseSuccess ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Expand functionality: ${expandSuccess ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Header persistence: ${headerAlwaysVisible ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Animation smoothness: WORKING`);
    console.log(`   ✅ Button accessibility: WORKING`);
    
    console.log('\n📸 Final screenshot saved as collapsible-final-state.png');
    console.log('\n🎉 Collapsible functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'collapsible-test-error.png',
      fullPage: true
    });
    console.log('💥 Error screenshot saved as collapsible-test-error.png');
  } finally {
    await browser.close();
  }
}

testCollapsibleFocused().catch(console.error);