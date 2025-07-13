// Test the improved location extraction - paste this in browser console

window.testLocationExtraction = function() {
  console.log('🧪 Testing Improved Location Extraction');
  console.log('=====================================');
  
  // Sample AI response similar to what you received
  const sampleAIResponse = `
    Wow, a cross-country road trip from New York City to Los Angeles! That's incredible! 
    
    **Phase 1: Eastern Charm & Appalachian Majesty (Days 1-3)**
    First, we'll head west through Pennsylvania. I'm adding **Gettysburg National Military Park** (Gettysburg, PA) to our route.
    Next, we'll dive into the beauty of the Appalachian Mountains. I'm suggesting a stop at the **Shenandoah National Park** (Skyline Drive, VA).
    
    **Phase 2: Midwest Wonders & Plains Exploration (Days 4-6)**
    From Shenandoah, we'll continue westward, crossing into the Midwest. Here, we can hit **Mammoth Cave National Park** in Kentucky (Mammoth Cave, KY).
    Then, as we head further west, we'll make our way through the vast plains. I'll suggest a stopover in **Kansas City, Missouri**.
    
    **Phase 3: Rocky Mountain High & Desert Landscapes (Days 7-9)**
    Now for the grand finale: **Rocky Mountain National Park** (Estes Park, CO) – a breathtaking park offering stunning alpine scenery.
    
    **Phase 4: Desert Delights & West Coast Arrival (Days 10-14)**
    We could even squeeze in a quick detour to **Zion National Park** in Utah (Springdale, UT).
    And then… Los Angeles!
  `;
  
  // Expected good extractions
  const expectedLocations = [
    'Gettysburg National Military Park',
    'Shenandoah National Park', 
    'Mammoth Cave National Park',
    'Kansas City',
    'Rocky Mountain National Park',
    'Zion National Park',
    'New York City',
    'Los Angeles'
  ];
  
  console.log('📝 Sample AI Response:');
  console.log(sampleAIResponse.substring(0, 200) + '...');
  
  // Test the patterns manually since we can't import the module
  const patterns = [
    // National Parks
    /\*\*([A-Z][a-zA-Z\s]{3,30}?National Park)\*\*/gi,
    /(?:^|\.|!|\?)\s*([A-Z][a-zA-Z\s]{3,25}National Park)(?:\.|,|\s|$)/gm,
    
    // Cities with states
    /\*\*([A-Z][a-zA-Z\s]{2,20},\s*[A-Z]{2})\*\*/gi,
    /(?:\s|^)([A-Z][a-zA-Z\s]{2,20},\s*[A-Z]{2})(?:\.|,|!|\s|$)/gm,
    
    // Major cities
    /\b(New York City|Los Angeles|San Francisco|Chicago|Las Vegas|Kansas City|Oklahoma City|Denver|Phoenix|Seattle|Boston|Miami|Atlanta|Dallas|Houston)\b/gi,
    
    // Common destinations
    /\b(Grand Canyon|Death Valley|Yellowstone|Yosemite|Zion|Bryce Canyon|Arches|Canyonlands|Rocky Mountain|Great Smoky Mountains|Glacier|Everglades|Acadia|Olympic)\b/gi
  ];
  
  console.log('\n🗺️ Testing Location Extraction Patterns:');
  
  const extractedLocations = [];
  
  patterns.forEach((pattern, index) => {
    console.log(`\nPattern ${index + 1}:`);
    let match;
    const patternMatches = [];
    
    while ((match = pattern.exec(sampleAIResponse)) !== null) {
      let location = match[1] ? match[1].trim() : match[0].trim();
      location = location.replace(/^[.,!?\s]+|[.,!?\s]+$/g, '');
      
      // Apply filters
      if (location.length >= 3 && 
          location.length <= 50 &&
          !location.match(/^(seriously|epic|road|trip|fantastic|starting|point|better|idea|ideal|prefer|bustling|cities|various|points|added|map|stunning|ready|refine|route|based|answers|above|specific|hidden|gems|suggest|hotels|restaurants|number|vibrant|city)$/i) &&
          !extractedLocations.some(loc => loc.toLowerCase() === location.toLowerCase())) {
        
        extractedLocations.push(location);
        patternMatches.push(location);
        console.log(`  ✅ ${location}`);
      } else {
        console.log(`  ❌ ${location} (filtered)`);
      }
    }
    
    if (patternMatches.length === 0) {
      console.log(`  ⚪ No matches`);
    }
    
    pattern.lastIndex = 0;
  });
  
  console.log('\n📍 Final Extracted Locations:');
  extractedLocations.forEach((loc, i) => console.log(`${i + 1}. ${loc}`));
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Total extracted: ${extractedLocations.length}`);
  console.log(`🎯 Expected minimum: ${expectedLocations.length}`);
  
  const foundExpected = expectedLocations.filter(expected => 
    extractedLocations.some(extracted => 
      extracted.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(extracted.toLowerCase())
    )
  );
  
  console.log(`✅ Expected locations found: ${foundExpected.length}/${expectedLocations.length}`);
  foundExpected.forEach(loc => console.log(`  ✅ ${loc}`));
  
  const missedExpected = expectedLocations.filter(expected => 
    !extractedLocations.some(extracted => 
      extracted.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(extracted.toLowerCase())
    )
  );
  
  if (missedExpected.length > 0) {
    console.log(`❌ Missed locations:`);
    missedExpected.forEach(loc => console.log(`  ❌ ${loc}`));
  }
  
  if (foundExpected.length >= expectedLocations.length * 0.8) {
    console.log('\n🎉 SUCCESS: Location extraction is working well!');
  } else {
    console.log('\n⚠️ NEEDS IMPROVEMENT: Some expected locations were missed');
  }
  
  return {
    extracted: extractedLocations,
    expected: expectedLocations,
    found: foundExpected,
    missed: missedExpected
  };
};

console.log('🔧 Location extraction test loaded. Run testLocationExtraction() to test.');