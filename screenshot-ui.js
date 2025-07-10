import puppeteer from 'puppeteer';

async function takeUIScreenshots() {
  console.log('📸 Taking UI screenshots for analysis...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Full page screenshot
    await page.screenshot({ 
      path: 'ui-current-full.png',
      fullPage: true 
    });
    console.log('✅ Full page screenshot saved');
    
    // Desktop view
    await page.setViewport({ width: 1280, height: 720 });
    await page.screenshot({ 
      path: 'ui-current-desktop.png'
    });
    console.log('✅ Desktop view screenshot saved');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-current-mobile.png'
    });
    console.log('✅ Mobile view screenshot saved');
    
    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-current-tablet.png'
    });
    console.log('✅ Tablet view screenshot saved');
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
  } finally {
    await browser.close();
  }
}

takeUIScreenshots().catch(console.error);