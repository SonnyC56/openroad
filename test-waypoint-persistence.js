import puppeteer from 'puppeteer';

async function testWaypointPersistence() {
  console.log('🚀 Testing waypoint persistence when added via AI chat...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Enable console logging to see our debugging
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('🔧')) {
      console.log(`   ${msg.text()}`);
    }
  });
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n📋 Testing waypoint persistence...');
    
    // Step 1: Create a basic trip
    console.log('\n1️⃣ Creating basic trip...');
    const locationInputs = await page.$$('input[type="text"]');
    
    if (locationInputs.length >= 2) {
      await locationInputs[0].click();
      await locationInputs[0].type('New York', { delay: 50 });
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await locationInputs[1].click();
      await locationInputs[1].type('Los Angeles', { delay: 50 });
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('   ✓ Created New York to Los Angeles trip');
      
      // Count initial waypoints
      const initialWaypoints = await page.$$('[class*="waypointItem"]');
      console.log(`   📍 Initial waypoints: ${initialWaypoints.length}`);
      
      // Step 2: Ask AI for suggestions
      console.log('\n2️⃣ Asking AI for suggestions...');
      const aiChatInput = await page.$('[class*="aiOverlay"] input[type="text"]');
      
      if (aiChatInput) {
        await aiChatInput.click();
        await aiChatInput.type('Suggest a cool stop for my road trip', { delay: 50 });
        await page.keyboard.press('Enter');
        
        // Wait for AI response
        console.log('   ⏳ Waiting for AI response...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Step 3: Look for suggestion buttons
        const suggestionButtons = await page.$$('[class*="suggestionButton"]');
        console.log(`   📋 Found ${suggestionButtons.length} suggestion buttons`);
        
        if (suggestionButtons.length > 0) {
          // Get the text of the first suggestion
          const firstSuggestion = suggestionButtons[0];
          const suggestionText = await firstSuggestion.evaluate(el => el.textContent);
          console.log(`   💡 First suggestion: "${suggestionText.trim()}"`);
          
          // Count waypoints before clicking
          const waypointsBefore = await page.$$('[class*="waypointItem"]');
          console.log(`   📍 Waypoints before adding: ${waypointsBefore.length}`);
          
          // Click the suggestion
          console.log('   🖱️ Clicking suggestion button...');
          await firstSuggestion.click();
          
          // Wait a moment and check immediately
          await new Promise(resolve => setTimeout(resolve, 1000));
          const waypointsAfter1sec = await page.$$('[class*="waypointItem"]');
          console.log(`   📍 Waypoints after 1 second: ${waypointsAfter1sec.length}`);
          
          // Wait longer and check again
          await new Promise(resolve => setTimeout(resolve, 3000));
          const waypointsAfter4sec = await page.$$('[class*="waypointItem"]');
          console.log(`   📍 Waypoints after 4 seconds: ${waypointsAfter4sec.length}`);
          
          // Final check after 5 more seconds
          await new Promise(resolve => setTimeout(resolve, 5000));
          const waypointsFinal = await page.$$('[class*="waypointItem"]');
          console.log(`   📍 Waypoints after 9 seconds total: ${waypointsFinal.length}`);
          
          // Analysis
          const wasAdded = waypointsAfter1sec.length > waypointsBefore.length;
          const wasDeleted = waypointsFinal.length < waypointsAfter1sec.length;
          const persistedCorrectly = waypointsFinal.length > waypointsBefore.length;
          
          console.log('\n📊 PERSISTENCE ANALYSIS:');
          console.log(`   ✅ Waypoint initially added: ${wasAdded ? 'YES' : 'NO'}`);
          console.log(`   ${wasDeleted ? '❌' : '✅'} Waypoint deleted after adding: ${wasDeleted ? 'YES' : 'NO'}`);
          console.log(`   ${persistedCorrectly ? '✅' : '❌'} Final persistence: ${persistedCorrectly ? 'SUCCESS' : 'FAILED'}`);
          
          if (wasAdded && wasDeleted) {
            console.log('   🐛 BUG CONFIRMED: Waypoint appears briefly then disappears');
          } else if (persistedCorrectly) {
            console.log('   🎉 SUCCESS: Waypoint persisted correctly');
          } else {
            console.log('   ❓ UNCLEAR: Waypoint was never added');
          }
          
        } else {
          console.log('   ❌ No suggestion buttons found - AI may not be working');
        }
      }
    }
    
    // Screenshot for verification
    await page.screenshot({ 
      path: 'waypoint-persistence-test.png',
      fullPage: true
    });
    
    console.log('\n📸 Test screenshot saved as waypoint-persistence-test.png');
    console.log('🎯 Waypoint persistence test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    await page.screenshot({ 
      path: 'waypoint-persistence-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

testWaypointPersistence().catch(console.error);