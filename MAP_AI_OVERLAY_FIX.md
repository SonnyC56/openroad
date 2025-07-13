# 🗺️ Map & AI Overlay Position Fix

## Issue
The sidebar (itinerary) was correctly positioned below the header, but the map and AI overlay were still overlapping with the header toolbar.

## Root Cause
- Map container was using absolute positioning which ignored parent boundaries
- AI overlay was using viewport height (100vh) instead of container height (100%)
- This caused both elements to extend beyond their container

## Fixes Applied

### 1. **Map Container Layout**
Changed from absolute to relative positioning:
```css
.mapContainer {
  position: relative;  /* Changed from absolute */
  width: 100%;
  height: 100%;
  display: flex;
}

.map {
  flex: 1;  /* Changed from absolute positioning */
  width: 100%;
  height: 100%;
}
```

### 2. **AI Overlay Height Fix**
Changed from viewport-based to container-based height:
```css
/* Before - Used viewport height */
height: calc(100vh - 2rem);
max-height: calc(100vh - 2rem);

/* After - Uses container height */
height: calc(100% - 1rem);
max-height: calc(100% - 1rem);
```

### 3. **Container Containment**
Added layout containment to prevent overflow:
```css
.map-container {
  contain: layout;
}
```

## Why This Works
1. **Relative positioning** respects parent container boundaries
2. **Container-based heights** ensure children don't exceed parent size
3. **Layout containment** prevents child elements from affecting parent layout
4. **Flex layout** ensures proper space distribution

## Result
- Sidebar continues to work correctly
- Map now respects the main container boundaries
- AI overlay is contained within the map area
- Search overlay and controls are properly visible
- No more header overlap

## Files Modified
- `/src/App.css` - Added containment to map-container
- `/src/components/Map/Map.module.css` - Changed to relative/flex layout
- `/src/components/AI/AIOverlay.module.css` - Fixed height calculations

The map and AI overlay should now display correctly within their container without overlapping the header.