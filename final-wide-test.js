import puppeteer from 'puppeteer';

async function finalWideTest() {
  console.log('🗺️  Taking final wide map screenshots...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Test ultrawide specifically
    await page.setViewport({ width: 3440, height: 1440 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: 'final-ultrawide-map.png',
      fullPage: false
    });
    
    console.log('📸 Final ultrawide screenshot saved!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

finalWideTest().catch(console.error);