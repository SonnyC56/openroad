// Test script for agentic AI trip creation with map plotting
// This simulates the "make me a trip from ny to la" request

import { createAgenticAI } from './src/services/agenticAI.js'

// Simulate the request
const testTripCreation = () => {
  console.log('🚀 Testing Agentic AI Trip Creation')
  
  // Sample user input
  const userInput = "make me a trip from ny to la"
  
  // Sample trip analysis
  const tripAnalysis = {
    hasTrip: false,
    waypointCount: 0,
    filledWaypoints: 0,
    hasRoute: false,
    tripLength: 0,
    estimatedDuration: 0,
    isEmpty: true,
    isComplete: false,
    needsOptimization: false,
    currentMapView: null
  }
  
  // Mock map instance
  const mockMap = {
    getCenter: () => ({ lat: 39.8283, lng: -98.5795 }),
    getZoom: () => 4,
    fitBounds: (bounds) => console.log('Map bounds fitted:', bounds),
    addLayer: (layer) => console.log('Layer added:', layer)
  }
  
  // Mock action handler
  const onAction = async (action) => {
    console.log('🎯 Action executed:', action.type)
    if (action.locations) {
      console.log('📍 Locations to plot:', action.locations)
    }
  }
  
  // Create agentic AI
  const aiAgent = createAgenticAI(mockMap, { state: { currentTrip: null } }, onAction)
  
  // Parse intent
  const intent = aiAgent.parseIntent(userInput)
  console.log('🧠 Parsed intent:', intent)
  
  // Expected locations for NY to LA trip
  const expectedLocations = [
    'New York, NY',
    'Los Angeles, CA',
    'Gettysburg National Park',
    'Shenandoah National Park',
    'Mammoth Cave National Park',
    'Kansas City, Missouri',
    'Rocky Mountain National Park',
    'Zion National Park'
  ]
  
  // Test location extraction
  const aiResponseText = `
    **Gettysburg National Military Park** (Gettysburg, PA)
    **Shenandoah National Park** (Skyline Drive, VA)
    **Mammoth Cave National Park** in Kentucky (Mammoth Cave, KY)
    **Kansas City, Missouri** for amazing BBQ
    **Rocky Mountain National Park** (Estes Park, CO)
    **Zion National Park** in Utah (Springdale, UT)
    And then... Los Angeles!
  `
  
  const extractedLocations = aiAgent.extractLocationsFromText(aiResponseText)
  console.log('🗺️ Extracted locations:', extractedLocations)
  
  // Test action planning
  const actions = aiAgent.planActions(intent, tripAnalysis, { text: aiResponseText })
  console.log('⚡ Planned actions:', actions)
  
  // Verify results
  const hasLocationAction = actions.some(a => a.type === 'plot_location')
  const hasLocations = actions.some(a => a.locations && a.locations.length > 0)
  
  console.log('\n📊 Test Results:')
  console.log(`✅ Intent parsed: ${intent.primary}`)
  console.log(`✅ Locations extracted: ${extractedLocations.length} found`)
  console.log(`✅ Actions planned: ${actions.length} actions`)
  console.log(`${hasLocationAction ? '✅' : '❌'} Plot location action created`)
  console.log(`${hasLocations ? '✅' : '❌'} Locations included in actions`)
  
  if (hasLocationAction && hasLocations) {
    console.log('\n🎉 SUCCESS: Agentic AI should plot locations on map!')
  } else {
    console.log('\n❌ ISSUE: Map plotting may not work correctly')
  }
}

// Run test
testTripCreation()