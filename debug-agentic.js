// Debug script for browser console - paste this into dev tools

window.debugAgenticAI = function() {
  console.log('🔍 DEBUGGING AGENTIC AI SYSTEM')
  console.log('===============================')
  
  // Check if components are loaded
  console.log('1. Map Instance:', !!window.mapInstance)
  console.log('2. Map Agent:', !!window.mapAgent)
  
  // Check if AI overlay is present
  const aiOverlay = document.querySelector('[class*="aiOverlay"]')
  console.log('3. AI Overlay Element:', !!aiOverlay)
  
  // Test intent parsing
  const testInput = "make me a trip from ny to la"
  console.log('\\n🧠 Testing Intent Parsing:')
  console.log('Input:', testInput)
  
  // Mock the parsing (since we can't import the module directly)
  const intentPatterns = {
    plan_trip: /plan.*trip|create.*itinerary|help.*plan|make.*trip|trip.*from.*to/i.test(testInput),
    requiresMapAction: true
  }
  console.log('Intent matches plan_trip:', intentPatterns.plan_trip)
  
  // Test location extraction patterns
  const locationPatterns = [
    /from\\s+([A-Za-z]{2,}(?:\\s+[A-Za-z]+)*)\\s+to\\s+([A-Za-z]{2,}(?:\\s+[A-Za-z]+)*)/gi,
    /\\b(NY|NYC|LA|SF|CHI|DC|SEA|ATL|MIA|DAL|HOU|PHX)\\b/gi
  ]
  
  console.log('\\n📍 Testing Location Extraction:')
  locationPatterns.forEach((pattern, index) => {
    const matches = testInput.match(pattern)
    console.log(`Pattern ${index + 1}:`, matches)
  })
  
  // Test AI response location extraction
  const sampleResponse = `
    **Gettysburg National Military Park** (Gettysburg, PA)
    **Shenandoah National Park** (Skyline Drive, VA)
    **Kansas City, Missouri** for BBQ
    **Rocky Mountain National Park** (Estes Park, CO)
    Los Angeles!
  `
  
  console.log('\\n🗺️ Testing Response Location Extraction:')
  const responsePatterns = [
    /\\*\\*([^*]+?National Park)\\*\\*/gi,
    /\\*\\*([A-Z][a-zA-Z\\s]+,\\s*[A-Z]{2})\\*\\*/gi,
    /\\(([A-Z][a-zA-Z\\s]+,\\s*[A-Z]{2})\\)/gi
  ]
  
  responsePatterns.forEach((pattern, index) => {
    const matches = []
    let match
    while ((match = pattern.exec(sampleResponse)) !== null) {
      matches.push(match[1])
    }
    console.log(`Response Pattern ${index + 1}:`, matches)
    pattern.lastIndex = 0
  })
  
  console.log('\\n🎯 Next Steps:')
  console.log('1. Try saying: "make me a trip from ny to la"')
  console.log('2. Check browser console for:')
  console.log('   - "🧠 Using Agentic AI Mode..."')
  console.log('   - "🎯 Processing action: plot_location"')
  console.log('   - "📍 Plotting X locations..."')
  console.log('3. Watch the map for animated markers')
  
  // If map agent exists, test direct plotting
  if (window.mapAgent) {
    console.log('\\n🧪 Running Direct Plot Test...')
    window.mapAgent.plotAISuggestions([
      { location: 'New York, NY', name: 'New York', description: 'Test marker' }
    ], { animate: true }).then(() => {
      console.log('✅ Direct plotting test completed - check map!')
    }).catch(err => {
      console.error('❌ Direct plotting test failed:', err)
    })
  }
}

// Auto-run on load
console.log('🔧 Debug tools loaded. Run debugAgenticAI() to test the system.');