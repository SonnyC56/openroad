// Test improved waypoint system - paste this in browser console

window.testImprovedWaypoints = function() {
  console.log('🧪 Testing Improved Waypoint System');
  console.log('====================================');
  
  // Test the start/end point extraction
  const testInputs = [
    "Plan me a roadtrip from Whitesboro, NY to Vancouver, BC",
    "make me a trip from ny to la",
    "road trip from Chicago to Seattle",
    "plan a trip from DC to SF visiting national parks"
  ];
  
  console.log('🔍 Testing Start/End Point Detection:');
  
  testInputs.forEach((input, index) => {
    console.log(`\\nTest ${index + 1}: "${input}"`);
    
    // Test the regex patterns manually
    const patterns = [
      /from\\s+([A-Z][a-zA-Z\\s,]+?(?:,\\s*[A-Z]{2}|,\\s*BC|,\\s*AB)?)\\s+to\\s+([A-Z][a-zA-Z\\s,]+?(?:,\\s*[A-Z]{2}|,\\s*BC|,\\s*AB)?)(?:\\s|[.,!]|$)/i,
      /from\\s+([A-Z]{2,}(?:\\s+[A-Z]+)*)\\s+to\\s+([A-Z]{2,}(?:\\s+[A-Z]+)*)(?:\\s|[.,!]|$)/i,
      /trip\\s+from\\s+([A-Z][a-zA-Z\\s,]+?)\\s+to\\s+([A-Z][a-zA-Z\\s,]+?)(?:\\s|[.,!]|$)/i
    ];
    
    let detected = false;
    for (let i = 0; i < patterns.length; i++) {
      const match = input.match(patterns[i]);
      if (match) {
        console.log(`✅ Pattern ${i + 1} matched: "${match[1]}" → "${match[2]}"`);
        detected = true;
        break;
      }
    }
    
    if (!detected) {
      console.log('❌ No pattern matched');
    }
  });
  
  console.log('\\n🗺️ Testing Geographic Sorting:');
  
  // Sample locations that should be sorted west to east
  const testLocations = [
    { name: 'Vancouver, BC', coords: { lat: 49.2827, lng: -123.1207 } },
    { name: 'Denver, CO', coords: { lat: 39.7392, lng: -104.9903 } },
    { name: 'Chicago, IL', coords: { lat: 41.8781, lng: -87.6298 } },
    { name: 'New York, NY', coords: { lat: 40.7128, lng: -74.0060 } }
  ];
  
  console.log('Original order:', testLocations.map(l => l.name));
  
  const sorted = testLocations.sort((a, b) => {
    if (Math.abs(a.coords.lng - b.coords.lng) > 2) {
      return a.coords.lng - b.coords.lng; // West to East
    }
    return a.coords.lat - b.coords.lat; // South to North
  });
  
  console.log('Sorted order (W→E):', sorted.map(l => l.name));
  
  console.log('\\n📍 System Status Check:');
  console.log('1. Map Instance:', !!window.mapInstance);
  console.log('2. Map Agent:', !!window.mapAgent);
  
  const waypointContainer = document.querySelector('[class*="waypoint"], [class*="tripPlanner"]');
  console.log('3. Trip Planner:', !!waypointContainer);
  
  console.log('\\n🎯 Expected Improvements:');
  console.log('✅ Whitesboro, NY should become START waypoint');
  console.log('✅ Vancouver, BC should become END waypoint');
  console.log('✅ No duplicate waypoints');
  console.log('✅ Waypoints in geographic order (west to east)');
  console.log('✅ All suggested locations automatically added');
  
  console.log('\\n🚀 Ready to test! Try:');
  console.log('"Plan me a roadtrip from Whitesboro, NY to Vancouver, BC"');
  
  return {
    startEndDetection: 'Ready',
    geographicSorting: 'Ready',
    systemComponents: {
      mapInstance: !!window.mapInstance,
      mapAgent: !!window.mapAgent,
      tripPlanner: !!waypointContainer
    }
  };
};

console.log('🔧 Improved waypoint test loaded. Run testImprovedWaypoints() to verify fixes.');