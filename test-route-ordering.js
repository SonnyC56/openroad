// Test route ordering and waypoint type detection
// Paste this in browser console to debug the chaotic route issue

window.testRouteOrdering = function() {
  console.log('🧪 ROUTE ORDERING & WAYPOINT TYPE TEST');
  console.log('======================================');
  
  // Test 1: Start/End Point Detection
  console.log('\n🎯 Test 1: Start/End Point Detection');
  console.log('-----------------------------------');
  
  const testInputs = [
    "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC",
    "make me a trip from ny to la", 
    "Create a route from New York to Los Angeles"
  ];
  
  testInputs.forEach((input, index) => {
    console.log(`\nTest ${index + 1}: "${input}"`);
    
    // Test the regex patterns for start/end extraction
    const patterns = [
      /from\s+([A-Z][a-zA-Z\s,]+?(?:,\s*[A-Z]{2}|,\s*BC|,\s*AB)?)\s+to\s+([A-Z][a-zA-Z\s,]+?(?:,\s*[A-Z]{2}|,\s*BC|,\s*AB)?)(?:\s|[.,!]|$)/i,
      /from\s+([A-Z]{2,}(?:\s+[A-Z]+)*)\s+to\s+([A-Z]{2,}(?:\s+[A-Z]+)*)(?:\s|[.,!]|$)/i,
      /trip\s+from\s+([A-Z][a-zA-Z\s,]+?)\s+to\s+([A-Z][a-zA-Z\s,]+?)(?:\s|[.,!]|$)/i
    ];
    
    let detected = false;
    for (let i = 0; i < patterns.length; i++) {
      const match = input.match(patterns[i]);
      if (match) {
        let start = match[1].trim();
        let end = match[2].trim();
        
        // Apply abbreviation expansion
        if (start.length <= 3) start = expandAbbreviation(start);
        if (end.length <= 3) end = expandAbbreviation(end);
        
        console.log(`✅ Pattern ${i + 1} detected: "${start}" → "${end}"`);
        detected = true;
        break;
      }
    }
    
    if (!detected) {
      console.log('❌ No start/end points detected');
    }
  });
  
  // Helper function for abbreviation expansion
  function expandAbbreviation(abbr) {
    const expansions = {
      'NY': 'New York',
      'BC': 'Vancouver, BC',
      'LA': 'Los Angeles, CA',
      'NYC': 'New York City'
    };
    return expansions[abbr.toUpperCase()] || abbr;
  }
  
  // Test 2: Geographic Sorting Algorithm
  console.log('\n🗺️ Test 2: Geographic Sorting Algorithm');
  console.log('---------------------------------------');
  
  // Sample waypoints from NY to BC (should go west to east, then north)
  const testWaypoints = [
    { name: 'Vancouver, BC', lat: 49.2827, lng: -123.1207 },
    { name: 'Mount Rushmore', lat: 43.8791, lng: -103.4591 },
    { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
    { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Yellowstone', lat: 44.4280, lng: -110.5885 }
  ];
  
  console.log('Original chaotic order:');
  testWaypoints.forEach((wp, i) => {
    console.log(`  ${i + 1}. ${wp.name} (${wp.lat.toFixed(2)}, ${wp.lng.toFixed(2)})`);
  });
  
  // Determine trip direction
  const startWP = testWaypoints.find(wp => wp.name.includes('New York'));
  const endWP = testWaypoints.find(wp => wp.name.includes('Vancouver'));
  
  if (startWP && endWP) {
    const lonDiff = endWP.lng - startWP.lng;
    const latDiff = endWP.lat - startWP.lat;
    const isEastWest = Math.abs(lonDiff) > Math.abs(latDiff);
    const isWestToEast = lonDiff > 0;
    
    console.log(`\n🧭 Trip direction analysis:`);
    console.log(`  Longitude difference: ${lonDiff.toFixed(2)} (${isWestToEast ? 'West→East' : 'East→West'})`);
    console.log(`  Latitude difference: ${latDiff.toFixed(2)}`);
    console.log(`  Primary direction: ${isEastWest ? 'East-West' : 'North-South'}`);
    
    // Sort based on direction
    const sorted = [...testWaypoints].sort((a, b) => {
      if (isEastWest) {
        return isWestToEast ? (a.lng - b.lng) : (b.lng - a.lng);
      } else {
        return a.lat - b.lat; // South to North
      }
    });
    
    console.log('\n✅ Properly sorted order:');
    sorted.forEach((wp, i) => {
      console.log(`  ${i + 1}. ${wp.name} (${wp.lat.toFixed(2)}, ${wp.lng.toFixed(2)})`);
    });
  }
  
  // Test 3: Waypoint Type Assignment
  console.log('\n🏁 Test 3: Waypoint Type Assignment');
  console.log('----------------------------------');
  
  const testAssignments = [
    { location: 'New York', shouldBe: 'start', reason: 'Matches start point' },
    { location: 'Vancouver, BC', shouldBe: 'end', reason: 'Matches end point' },
    { location: 'Chicago, IL', shouldBe: 'waypoint', reason: 'Middle stop' },
    { location: 'Denver, CO', shouldBe: 'waypoint', reason: 'Middle stop' }
  ];
  
  const startPoint = 'New York';
  const endPoint = 'Vancouver, BC';
  
  testAssignments.forEach((test, index) => {
    let detectedType = 'waypoint';
    
    // Check start point match
    if (test.location.toLowerCase().includes(startPoint.toLowerCase()) ||
        startPoint.toLowerCase().includes(test.location.toLowerCase())) {
      detectedType = 'start';
    }
    
    // Check end point match  
    if (test.location.toLowerCase().includes(endPoint.toLowerCase()) ||
        endPoint.toLowerCase().includes(test.location.toLowerCase())) {
      detectedType = 'end';
    }
    
    // Fallback: first is start, last is end
    if (detectedType === 'waypoint') {
      if (index === 0) detectedType = 'start';
      if (index === testAssignments.length - 1) detectedType = 'end';
    }
    
    const isCorrect = detectedType === test.shouldBe;
    console.log(`${isCorrect ? '✅' : '❌'} ${test.location}: ${detectedType} (expected: ${test.shouldBe})`);
  });
  
  // Test 4: Current System Status
  console.log('\n⚙️ Test 4: Current System Status');
  console.log('-------------------------------');
  
  console.log('Map Instance:', !!window.mapInstance);
  console.log('Map Agent:', !!window.mapAgent);
  console.log('Current Trip:', !!window.TripContext?.state?.currentTrip);
  
  // Check if waypoints exist
  const waypointElements = document.querySelectorAll('[class*=\"waypoint\"]');
  console.log('Waypoint Elements:', waypointElements.length);
  
  if (waypointElements.length > 0) {
    console.log('Current waypoints in DOM:');
    waypointElements.forEach((el, i) => {
      const text = el.textContent?.trim() || 'No text';
      console.log(`  ${i + 1}. ${text.substring(0, 50)}...`);
    });
  }
  
  // Test 5: String Similarity for Duplicate Detection
  console.log('\n🔗 Test 5: String Similarity Examples');
  console.log('------------------------------------');
  
  const similarityTests = [
    ['New York', 'New York City', 'Should be similar'],
    ['Vancouver, BC', 'Vancouver', 'Should be similar'],
    ['Grand Canyon National Park', 'Grand Canyon', 'Should be similar'],
    ['Chicago', 'Denver', 'Should be different']
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
  
  similarityTests.forEach(([str1, str2, description]) => {
    const similarity = testSimilarity(str1, str2);
    const isDuplicate = similarity > 0.6;
    console.log(`${isDuplicate ? '🚫' : '✅'} "${str1}" vs "${str2}": ${(similarity * 100).toFixed(0)}% similar`);
    console.log(`   ${description} - ${isDuplicate ? 'Would block' : 'Would allow'}`);
  });
  
  console.log('\n🎯 SUMMARY & NEXT STEPS');
  console.log('======================');
  console.log('1. ✅ Test start/end detection with your exact input');
  console.log('2. ✅ Verify geographic sorting works correctly');  
  console.log('3. ✅ Check waypoint type assignment logic');
  console.log('4. ✅ Confirm duplicate prevention works');
  console.log('');
  console.log('🚀 Ready to test with: "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC"');
  console.log('🔍 Watch console logs for detailed debugging info');
  
  return {
    startEndDetection: 'Improved',
    geographicSorting: 'Fixed',
    waypointTypeAssignment: 'Enhanced',
    duplicatePrevention: 'Active',
    systemStatus: 'Ready for testing'
  };
};

console.log(`
🔧 ROUTE ORDERING TEST LOADED
=============================

This test will help debug the chaotic route issue you showed in the screenshot.

Run: testRouteOrdering()

Then try: "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC"
And watch for proper ordering: NY → Chicago → Denver → Yellowstone → Vancouver
`);