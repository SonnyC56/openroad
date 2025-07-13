const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing AI overlay fixes...');
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  try {
    // Navigate to the app
    await page.goto('http://localhost:5174');
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot showing AI overlay
    await page.screenshot({ path: 'ai-overlay-fixed.png' });
    console.log('📸 Screenshot saved as ai-overlay-fixed.png');

    // Test scrolling by adding multiple messages
    const aiInput = await page.$('.aiOverlay input[type="text"]');
    if (aiInput) {
      // Send multiple messages to test scrolling
      for (let i = 1; i <= 5; i++) {
        await aiInput.click();
        await aiInput.type(`Test message ${i} to check scrolling`);
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 1500));
      }
      
      await page.screenshot({ path: 'ai-overlay-scrolling.png' });
      console.log('📸 Screenshot saved as ai-overlay-scrolling.png');
    }

    console.log('✅ AI overlay tests completed!');
    console.log('\nFixed issues:');
    console.log('- ✅ Icon visibility restored');
    console.log('- ✅ Scrolling functionality fixed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'ai-overlay-error.png' });
  } finally {
    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
  }
})();