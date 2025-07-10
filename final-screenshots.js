import puppeteer from 'puppeteer';

async function takeFinalScreenshots() {
  console.log('📸 Taking final screenshots of improved UI...');
  
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
    
    // Wait for everything to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Full page screenshot
    await page.screenshot({ 
      path: 'ui-final-full.png',
      fullPage: true 
    });
    console.log('✅ Full page screenshot saved');
    
    // Desktop view - main screen
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-final-desktop.png'
    });
    console.log('✅ Desktop view screenshot saved');
    
    // Large desktop view
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-final-large.png'
    });
    console.log('✅ Large desktop view screenshot saved');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 812 }); // iPhone X size
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-final-mobile.png'
    });
    console.log('✅ Mobile view screenshot saved');
    
    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ 
      path: 'ui-final-tablet.png'
    });
    console.log('✅ Tablet view screenshot saved');
    
    console.log('🎉 All final screenshots saved!');
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
  } finally {
    await browser.close();
  }
}

takeFinalScreenshots().catch(console.error);