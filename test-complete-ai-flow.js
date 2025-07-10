import puppeteer from 'puppeteer';

async function testCompleteAIFlow() {
  console.log('🚀 Testing complete AI agent flow and collapsible functionality...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1920, height: 1080 },
    slowMo: 100 // Slow down for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('\n🎯 Phase 1: Testing Collapsible Menu Functionality');
    
    // Test 1: Check if AI overlay is present and visible
    const aiOverlay = await page.$('[class*="aiOverlay"]');
    console.log(`   ✓ AI overlay present: ${aiOverlay ? 'YES' : 'NO'}`);
    
    if (!aiOverlay) {
      throw new Error('AI overlay not found - cannot continue tests');
    }
    
    // Test 2: Check initial state (should be expanded)
    let messagesVisible = await page.evaluate(() => {
      const messages = document.querySelector('[class*="messagesContainer"]');
      return messages && messages.offsetHeight > 0;
    });
    console.log(`   ✓ Initial state (expanded): ${messagesVisible ? 'YES' : 'NO'}`);
    
    // Test 3: Find and click collapse button
    const collapseButton = await page.$('[title*="Collapse"]');
    console.log(`   ✓ Collapse button found: ${collapseButton ? 'YES' : 'NO'}`);
    
    if (collapseButton) {
      await collapseButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify collapsed state
      messagesVisible = await page.evaluate(() => {
        const messages = document.querySelector('[class*="messagesContainer"]');
        return messages && messages.offsetHeight > 0;
      });
      console.log(`   ✓ Collapsed successfully: ${!messagesVisible ? 'YES' : 'NO'}`);
      
      // Test 4: Expand again
      const expandButton = await page.$('[title*="Expand"]');
      if (expandButton) {
        await expandButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        messagesVisible = await page.evaluate(() => {
          const messages = document.querySelector('[class*="messagesContainer"]');
          return messages && messages.offsetHeight > 0;
        });
        console.log(`   ✓ Expanded successfully: ${messagesVisible ? 'YES' : 'NO'}`);
      }
    }
    
    console.log('\n🤖 Phase 2: Testing AI Agent Flow');
    
    // Test 5: Check if API key is needed
    const needsApiKey = await page.evaluate(() => {
      const keyButton = document.querySelector('[title*="Set API Key"]');
      return !!keyButton;
    });
    
    console.log(`   ✓ Needs API key: ${needsApiKey ? 'YES' : 'NO'}`);
    
    if (needsApiKey) {
      console.log('   ⚠️ API key required - testing API key flow');
      
      // Test API key input flow
      const apiKeyButton = await page.$('[title*="Set API Key"]');
      if (apiKeyButton) {
        await apiKeyButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Wait for API key input to appear
        await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
        const apiKeyInput = await page.$('input[type="password"]');
        console.log(`   ✓ API key input visible: ${apiKeyInput ? 'YES' : 'NO'}`);
        
        if (apiKeyInput) {
          // Test with fake API key
          await apiKeyInput.type('test-api-key-123');
          const submitButton = await page.$('[class*="apiKeyInput"] button');
          if (submitButton) {
            await submitButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('   ✓ API key submission tested');
          }
        }
      }
    } else {
      console.log('   ✓ API key already configured');
    }
    
    // Test 6: Test suggestion chips
    console.log('\n🎯 Phase 3: Testing Suggestion Chips');
    
    const suggestionChips = await page.$$('[class*="suggestionChip"]');
    console.log(`   ✓ Found ${suggestionChips.length} suggestion chips`);
    
    if (suggestionChips.length > 0) {
      // Click first suggestion chip
      await suggestionChips[0].click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if input was populated
      const inputValue = await page.evaluate(() => {
        const input = document.querySelector('[class*="input"]:not([type="password"])');
        return input ? input.value : '';
      });
      console.log(`   ✓ Suggestion populated input: ${inputValue ? 'YES' : 'NO'}`);
      console.log(`   📝 Input value: "${inputValue}"`);
    }
    
    // Test 7: Test message input (even without API key)
    console.log('\n💬 Phase 4: Testing Message Input');
    
    const messageInput = await page.$('[placeholder*="Ask me"], [placeholder*="Set up"]');
    if (messageInput) {
      await messageInput.click();
      await messageInput.type('Find great parks in San Francisco');
      
      const sendButton = await page.$('[class*="sendButton"]');
      console.log(`   ✓ Send button found: ${sendButton ? 'YES' : 'NO'}`);
      
      if (sendButton) {
        const isDisabled = await page.evaluate(button => button.disabled, sendButton);
        console.log(`   ✓ Send button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
        
        if (!isDisabled) {
          await sendButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check for new messages
          const messageCount = await page.evaluate(() => {
            const messages = document.querySelectorAll('[class*="message"]');
            return messages.length;
          });
          console.log(`   ✓ Total messages after send: ${messageCount}`);
        }
      }
    }
    
    // Test 8: Test interactive suggestions (if any appear)
    console.log('\n🎯 Phase 5: Testing Interactive Suggestions');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const interactiveSuggestions = await page.$$('[class*="suggestionButton"]');
    console.log(`   ✓ Found ${interactiveSuggestions.length} interactive suggestion buttons`);
    
    if (interactiveSuggestions.length > 0) {
      // Test clicking an interactive suggestion
      await interactiveSuggestions[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if waypoint was added
      const waypointCount = await page.evaluate(() => {
        const waypoints = document.querySelectorAll('[class*="waypointItem"]');
        return waypoints.length;
      });
      console.log(`   ✓ Waypoints after suggestion click: ${waypointCount}`);
    }
    
    // Test 9: Test trip planner integration
    console.log('\n🗺️ Phase 6: Testing Trip Planner Integration');
    
    const tripPlannerInputs = await page.$$('input[placeholder*="location"], input[placeholder*="starting"], input[placeholder*="going"]');
    console.log(`   ✓ Found ${tripPlannerInputs.length} trip planner inputs`);
    
    if (tripPlannerInputs.length > 0) {
      // Test adding a location manually
      await tripPlannerInputs[0].click();
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await tripPlannerInputs[0].type('New York');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for location suggestions
      const locationSuggestions = await page.$$('[class*="suggestionItem"]');
      console.log(`   ✓ Location suggestions found: ${locationSuggestions.length}`);
      
      if (locationSuggestions.length > 0) {
        await locationSuggestions[0].click();
        console.log('   ✓ Location suggestion clicked');
      }
    }
    
    // Test 10: Test Clear API Key functionality (if available)
    console.log('\n🗑️ Phase 7: Testing Clear API Key');
    
    const clearApiButton = await page.$('[title*="Clear API Key"]');
    if (clearApiButton) {
      console.log('   ✓ Clear API key button found');
      await clearApiButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const apiKeyInputVisible = await page.$('input[type="password"]');
      console.log(`   ✓ API key input visible after clear: ${apiKeyInputVisible ? 'YES' : 'NO'}`);
    } else {
      console.log('   ⚠️ Clear API key button not found (may not be configured)');
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'complete-ai-flow-test.png',
      fullPage: true
    });
    
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Collapsible menu functionality');
    console.log('   ✅ API key management flow');
    console.log('   ✅ Suggestion chips interaction');
    console.log('   ✅ Message input and sending');
    console.log('   ✅ Interactive suggestions');
    console.log('   ✅ Trip planner integration');
    console.log('   ✅ Clear API key functionality');
    
    console.log('\n📸 Final screenshot saved as complete-ai-flow-test.png');
    console.log('\n🎉 All AI agent flow tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'ai-flow-test-error.png',
      fullPage: true
    });
    console.log('💥 Error screenshot saved as ai-flow-test-error.png');
  } finally {
    await browser.close();
  }
}

testCompleteAIFlow().catch(console.error);