// Manual test for map plotting - add this to browser console
// This will manually test the map plotting functionality

window.testMapPlotting = async function() {
  console.log('🧪 Testing Manual Map Plotting...')
  
  // Check if map agent is available
  if (!window.mapAgent) {
    console.error('❌ Map agent not available! Make sure the app is loaded.')
    return
  }
  
  // Sample NY to LA trip locations
  const tripLocations = [
    { location: 'New York, NY', name: 'New York City', description: 'Starting point' },
    { location: 'Gettysburg, PA', name: 'Gettysburg National Park', description: 'Historical battlefield' },
    { location: 'Shenandoah National Park, VA', name: 'Shenandoah', description: 'Blue Ridge Mountains' },
    { location: 'Mammoth Cave, KY', name: 'Mammoth Cave National Park', description: 'Underground cave system' },
    { location: 'Kansas City, MO', name: 'Kansas City', description: 'BBQ capital' },
    { location: 'Rocky Mountain National Park, CO', name: 'Rocky Mountains', description: 'Alpine scenery' },
    { location: 'Zion National Park, UT', name: 'Zion', description: 'Red rock formations' },
    { location: 'Los Angeles, CA', name: 'Los Angeles', description: 'Destination' }
  ]
  
  try {
    console.log('📍 Plotting', tripLocations.length, 'locations...')
    
    // Plot the suggestions
    const results = await window.mapAgent.plotAISuggestions(tripLocations, {
      animate: true,
      showRoutes: true,
      highlightBest: true
    })
    
    console.log('✅ Successfully plotted:', results.length, 'locations')
    console.log('🗺️ Check the map for animated markers!')
    
    return results
    
  } catch (error) {
    console.error('❌ Error plotting locations:', error)
  }
}

// Instructions
console.log(`
🧪 MANUAL MAP PLOTTING TEST
============================

1. Open your browser console
2. Make sure the OpenRoad app is loaded
3. Run: testMapPlotting()
4. Watch the map for animated markers appearing

This will test if the map plotting system works independently
of the AI response processing.
`);