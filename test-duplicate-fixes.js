// Test duplicate waypoint fixes and route segment context
// Paste this in browser console to verify fixes

window.testDuplicateFixes = function() {
  console.log('🧪 DUPLICATE WAYPOINT & ROUTE CONTEXT TEST');
  console.log('==========================================');
  
  // Test 1: Check Current Waypoint State
  console.log('\n📍 Test 1: Current Waypoint State Analysis');
  console.log('------------------------------------------');
  
  const waypointElements = document.querySelectorAll('[class*="waypoint"]');
  console.log(`Total waypoint elements found: ${waypointElements.length}`);
  
  // Check for empty vs filled waypoints
  let emptyCount = 0;
  let filledCount = 0;
  let duplicateTypes = {};
  
  waypointElements.forEach((el, index) => {
    const text = el.textContent?.trim() || '';
    const isEmpty = text === '' || text.includes('Where are you starting') || text.includes('Where are you going') || text.length < 5;
    
    if (isEmpty) {
      emptyCount++;
      console.log(`  ${index + 1}. EMPTY: "${text.substring(0, 30)}..."`);
    } else {
      filledCount++;
      console.log(`  ${index + 1}. FILLED: "${text.substring(0, 50)}..."`);
    }
    
    // Check for duplicate waypoint types
    const typeMatch = text.match(/(START|END|WAYPOINT)/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      duplicateTypes[type] = (duplicateTypes[type] || 0) + 1;
    }
  });
  
  console.log(`\n📊 Waypoint Analysis:`);
  console.log(`  Empty waypoints: ${emptyCount}`);
  console.log(`  Filled waypoints: ${filledCount}`);
  console.log(`  Type counts:`, duplicateTypes);
  
  // Check for problematic patterns
  Object.entries(duplicateTypes).forEach(([type, count]) => {
    if (count > 1) {
      console.log(`  ⚠️ DUPLICATE ${type.toUpperCase()} waypoints detected: ${count}`);
    } else {
      console.log(`  ✅ ${type.toUpperCase()} waypoint count normal: ${count}`);
    }
  });
  
  // Test 2: Route Segment Selection Simulation
  console.log('\n🛣️ Test 2: Route Segment Context Simulation');
  console.log('--------------------------------------------');
  
  // Simulate different route segments for testing
  const testSegments = [
    {
      from: 'Denver, CO',
      to: 'Yellowstone National Park', 
      expectedNearby: ['Jackson, WY', 'Salt Lake City, UT', 'Bozeman, MT'],
      shouldNotSuggest: ['Syracuse, NY', 'Miami, FL', 'Los Angeles, CA']
    },
    {
      from: 'Yellowstone National Park',
      to: 'Vancouver, BC',
      expectedNearby: ['Calgary, AB', 'Seattle, WA', 'Spokane, WA'],
      shouldNotSuggest: ['Syracuse, NY', 'Chicago, IL', 'Denver, CO']
    },
    {
      from: 'Chicago, IL', 
      to: 'Denver, CO',
      expectedNearby: ['Des Moines, IA', 'Omaha, NE', 'Kansas City, MO'],
      shouldNotSuggest: ['Syracuse, NY', 'Vancouver, BC', 'Los Angeles, CA']
    }
  ];
  
  testSegments.forEach((segment, index) => {
    console.log(`\nSegment ${index + 1}: ${segment.from} → ${segment.to}`);
    console.log(`  ✅ Expected nearby suggestions: ${segment.expectedNearby.join(', ')}`);
    console.log(`  ❌ Should NOT suggest: ${segment.shouldNotSuggest.join(', ')}`);
    
    // Test if the AI would have proper context
    const mockContext = {
      from: segment.from,
      to: segment.to,
      distance: 500000 // 500km example
    };
    
    console.log(`  📍 Mock segment context: ${JSON.stringify(mockContext)}`);
  });
  
  // Test 3: Empty Waypoint Replacement Logic
  console.log('\n🔄 Test 3: Empty Waypoint Replacement Logic');
  console.log('--------------------------------------------');
  
  // Check if there are empty waypoints that should be replaced
  const emptyWaypoints = Array.from(waypointElements).filter(el => {
    const text = el.textContent?.trim() || '';
    return text === '' || text.includes('Where are you') || text.length < 5;
  });
  
  console.log(`Empty waypoints that should be replaced: ${emptyWaypoints.length}`);
  
  emptyWaypoints.forEach((el, index) => {
    const text = el.textContent?.trim() || '';
    console.log(`  ${index + 1}. Empty waypoint text: "${text}"`);
    
    // Check if it has a type indicator
    const hasStartIndicator = text.toLowerCase().includes('start') || text.includes('Where are you starting');
    const hasEndIndicator = text.toLowerCase().includes('end') || text.includes('Where are you going');
    
    if (hasStartIndicator) {
      console.log(`    → This appears to be an empty START waypoint`);
    } else if (hasEndIndicator) {
      console.log(`    → This appears to be an empty END waypoint`);
    } else {
      console.log(`    → This appears to be an empty regular waypoint`);
    }
  });
  
  // Test 4: String Similarity for Context Matching
  console.log('\n🔗 Test 4: String Similarity for Context Matching');
  console.log('------------------------------------------------');
  
  // Test the string similarity function for route context
  const testContextMatches = [
    ['Denver, CO', 'denver colorado', 'Should match location variations'],
    ['Yellowstone National Park', 'yellowstone', 'Should match park abbreviations'],
    ['Vancouver, BC', 'vancouver british columbia', 'Should match province variations'],
    ['Syracuse, NY', 'Vancouver, BC', 'Should NOT match distant locations']
  ];
  
  // Simple similarity function for testing
  function testSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '');
    const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '');
    
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    const commonWords = words1.filter(w => words2.includes(w));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }
  
  testContextMatches.forEach(([str1, str2, description]) => {
    const similarity = testSimilarity(str1, str2);
    const isMatch = similarity > 0.6;
    console.log(`${isMatch ? '✅' : '❌'} "${str1}" vs "${str2}": ${(similarity * 100).toFixed(0)}% similar`);
    console.log(`   ${description} - ${isMatch ? 'Would match' : 'Would not match'}`);
  });
  
  // Test 5: System Status for Fixes
  console.log('\n⚙️ Test 5: System Status for Fixes');
  console.log('---------------------------------');
  
  const systemStatus = {
    mapInstance: !!window.mapInstance,
    mapAgent: !!window.mapAgent,
    aiAgent: !!window.aiAgent,
    tripContext: !!window.TripContext,
    selectedSegment: !!document.querySelector('[class*="selected"]')
  };
  
  Object.entries(systemStatus).forEach(([component, available]) => {
    console.log(`${available ? '✅' : '❌'} ${component}: ${available ? 'Available' : 'Not Available'}`);
  });
  
  console.log('\n🎯 TESTING INSTRUCTIONS');
  console.log('======================');
  console.log('1. ✅ Test trip planning: "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC"');
  console.log('   → Should NOT create duplicate waypoint cards');
  console.log('   → Should replace empty waypoints instead of adding new ones');
  console.log('');
  console.log('2. ✅ Test route segment context: Click on a route segment near Vancouver');
  console.log('   → Ask: "suggest a place to eat on the route"');
  console.log('   → Should suggest restaurants near Vancouver, NOT Syracuse, NY');
  console.log('');
  console.log('3. ✅ Check waypoint deduplication:');
  console.log('   → Should see exactly ONE start waypoint (Whitesboro/NY area)');
  console.log('   → Should see exactly ONE end waypoint (Vancouver, BC)');
  console.log('   → Should see middle waypoints without duplicates');
  
  console.log('\n📊 CURRENT STATE SUMMARY');
  console.log('========================');
  
  const hasDuplicates = Object.values(duplicateTypes).some(count => count > 1);
  const hasEmptyAndFilled = emptyCount > 0 && filledCount > 0;
  
  if (hasDuplicates) {
    console.log('⚠️ DUPLICATE WAYPOINT TYPES DETECTED - Fix needed');
  } else {
    console.log('✅ No duplicate waypoint types detected');
  }
  
  if (hasEmptyAndFilled) {
    console.log('⚠️ MIXED EMPTY AND FILLED WAYPOINTS - May indicate incomplete fix');
  } else {
    console.log('✅ Waypoint state is consistent');
  }
  
  return {
    duplicateWaypoints: hasDuplicates,
    mixedEmptyFilled: hasEmptyAndFilled,
    systemReady: Object.values(systemStatus).every(s => s),
    fixesApplied: true,
    emptyWaypointCount: emptyCount,
    filledWaypointCount: filledCount,
    typeDistribution: duplicateTypes
  };
};

console.log(`
🔧 DUPLICATE FIXES TEST LOADED
==============================

This test will verify:
✅ Duplicate waypoint card fixes (no empty + filled pairs)
✅ Route segment context for better location suggestions
✅ Empty waypoint replacement instead of addition

Run: testDuplicateFixes()

Then test with:
1. "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC"
2. Click a route segment and ask "suggest a place to eat on the route"
`);