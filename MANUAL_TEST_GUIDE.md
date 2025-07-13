# Manual Testing Guide for AI Improvements

## 🎯 Testing AI Waypoint Persistence

### Setup
1. Open the app at `http://localhost:5174`
2. Open browser developer tools (F12) and go to the Console tab
3. Look for debugging messages that start with 🔧

### Test Steps

#### 1. Create a Basic Trip
- Add "New York" as start location
- Add "Los Angeles" as end location  
- Wait for route calculation

#### 2. Test AI Suggestions
- Click in the AI chat input box
- Type: "Suggest a cool National Park to visit on my road trip"
- Press Enter
- Wait for AI response (may take 5-10 seconds)

#### 3. Monitor Console Output
Look for these debugging messages:
```
🔧 Adding waypoint to trip: [location data]
🔧 Current trip exists: true
🔧 Current waypoints count: [number]
🔧 Created new waypoint: [waypoint object]
🔧 New waypoints array length: [number]
🔧 Setting updated trip with waypoints: [number]
🔧 Route calculation delay completed, checking waypoints...
```

#### 4. Test Suggestion Buttons
- Look for clickable buttons below the AI response
- The buttons should show National Park names (not random roads)
- Click on a suggestion button
- Watch the sidebar for new waypoint appearing

#### 5. Verify Persistence
- Count waypoints immediately after clicking (should increase by 1)
- Wait 5 seconds and count again (should stay the same)
- Check console for verification message:
```
🔍 Verification: waypoints count after 1 second: [number]
```

### Expected Results ✅

1. **Suggestion Extraction**: Buttons should show "Zion National Park", "Grand Canyon National Park", etc. - NOT "Bourgoin Road" or similar
2. **Waypoint Addition**: New waypoint appears in sidebar between start and end points
3. **Persistence**: Waypoint stays visible and doesn't disappear after 5+ seconds
4. **Route Calculation**: Route automatically recalculates to include new waypoint after 2 seconds
5. **No Waypoint Wiping**: All existing waypoints should remain intact when adding a new one

### Latest Fix (Current Issue) 🔧

**Problem**: When adding waypoint via AI, it was wiping all existing waypoints instead of just adding one.

**Solution**: 
- Removed the state callback from `triggerRouteCalculation` that was interfering with waypoint addition
- Increased delay before route calculation to 2 seconds to ensure state is fully settled
- Route calculation now reads current state directly without modifying waypoints

### Troubleshooting 🔧

#### If waypoints get wiped:
- Check console for state update conflicts
- Look for multiple "Setting updated trip" messages close together
- Verify route calculation isn't overwriting waypoint state

#### If suggestions don't appear:
- Check if you have a valid Gemini API key
- Look for error messages in console
- Try a different prompt like "Tell me about attractions in Utah"

#### If waypoint disappears:
- Check console for any error messages
- Look for 🔧 messages showing what's happening
- Try adding waypoint again and watch console output

#### If suggestions show wrong places:
- This indicates the extraction function is still having issues
- Note what the AI actually suggested vs what the buttons show
- Check console for extraction debugging messages

### Fixed Issues 🎉

1. **Smart Scrolling**: You can now scroll up in AI chat without being forced to bottom
2. **Context Awareness**: AI knows about your current trip and previous messages  
3. **Toolbar Position**: Content no longer appears behind header on page load
4. **Suggestion Matching**: Buttons should now match what AI recommends
5. **Trip Management**: New Trip and Save Trip buttons now work correctly
6. **Waypoint Deletion on Route Update**: Fixed stale closure issue in route calculation

### New Features ✨

1. **Collapsible AI**: Click the down arrow to collapse AI assistant
2. **API Key Management**: Click trash icon to clear API key
3. **Auto Route Calculation**: Routes update automatically when waypoints change
4. **Interactive Route Segments**: Click on route lines to ask AI about that segment
5. **Trip Management**: Save and create new trips with local storage persistence

---

## 🐛 If You Still See Issues

Please note:
- What AI suggested in text
- What buttons appeared  
- Whether waypoint was added
- Whether it disappeared and when
- Any console error messages
- Whether existing waypoints were preserved or wiped

This will help us identify any remaining issues with the waypoint persistence system.