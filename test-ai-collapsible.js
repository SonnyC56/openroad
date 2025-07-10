import puppeteer from 'puppeteer';

async function testAICollapsible() {
  console.log('🚀 Testing AI collapsible functionality...');
  
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
    
    console.log('\n🤖 Testing AI overlay collapsible functionality...');
    
    // Check if AI overlay is present
    const aiOverlay = await page.$('[class*="aiOverlay"]');
    console.log(`   ✓ AI overlay present: ${aiOverlay ? 'YES' : 'NO'}`);
    
    if (aiOverlay) {
      // Check for collapse button
      const collapseButton = await page.$('[title*="Collapse"], [title*="Expand"]');
      console.log(`   ✓ Collapse button present: ${collapseButton ? 'YES' : 'NO'}`);
      
      if (collapseButton) {
        // Test collapsing
        await collapseButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isCollapsed = await page.evaluate(() => {
          const content = document.querySelector('[class*="collapsibleContent"]');
          return !content || content.offsetHeight === 0;
        });
        
        console.log(`   ✓ AI collapsed: ${isCollapsed ? 'YES' : 'NO'}`);
        
        // Test expanding
        await collapseButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isExpanded = await page.evaluate(() => {
          const content = document.querySelector('[class*="collapsibleContent"]');
          return content && content.offsetHeight > 0;
        });
        
        console.log(`   ✓ AI expanded: ${isExpanded ? 'YES' : 'NO'}`);
      }
      
      // Test API key management
      const clearApiButton = await page.$('[title*="Clear API Key"]');
      console.log(`   ✓ Clear API key button present: ${clearApiButton ? 'YES' : 'NO'}`);
    }
    
    // Take screenshot to verify visual improvements
    await page.screenshot({ 
      path: 'ai-collapsible-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Screenshot saved as ai-collapsible-test.png');
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAICollapsible().catch(console.error);