// Popular road trip destinations with zoom level visibility
export const roadTripPOIs = [
  // Major National Parks (visible at zoom 4+)
  {
    id: 'yellowstone',
    name: 'Yellowstone',
    lat: 44.4280,
    lng: -110.5885,
    emoji: '🌋',
    category: 'national-park',
    minZoom: 4,
    maxZoom: 18,
    description: 'First national park with geysers and wildlife'
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon',
    lat: 36.1069,
    lng: -112.1129,
    emoji: '🏜️',
    category: 'national-park',
    minZoom: 4,
    maxZoom: 18,
    description: 'Iconic canyon with breathtaking views'
  },
  {
    id: 'yosemite',
    name: 'Yosemite',
    lat: 37.8651,
    lng: -119.5383,
    emoji: '🏔️',
    category: 'national-park',
    minZoom: 4,
    maxZoom: 18,
    description: 'Stunning valleys and waterfalls'
  },
  {
    id: 'zion',
    name: 'Zion',
    lat: 37.2982,
    lng: -113.0263,
    emoji: '⛰️',
    category: 'national-park',
    minZoom: 5,
    maxZoom: 18,
    description: 'Red rock canyons and hiking trails'
  },
  {
    id: 'glacier',
    name: 'Glacier',
    lat: 48.7596,
    lng: -113.7870,
    emoji: '🏔️',
    category: 'national-park',
    minZoom: 5,
    maxZoom: 18,
    description: 'Pristine wilderness and glacial lakes'
  },
  
  // Major Cities (visible at zoom 5+)
  {
    id: 'las-vegas',
    name: 'Las Vegas',
    lat: 36.1699,
    lng: -115.1398,
    emoji: '🎰',
    category: 'city',
    minZoom: 5,
    maxZoom: 18,
    description: 'Entertainment capital'
  },
  {
    id: 'nashville',
    name: 'Nashville',
    lat: 36.1627,
    lng: -86.7816,
    emoji: '🎸',
    category: 'city',
    minZoom: 5,
    maxZoom: 18,
    description: 'Music City USA'
  },
  {
    id: 'new-orleans',
    name: 'New Orleans',
    lat: 29.9511,
    lng: -90.0715,
    emoji: '🎺',
    category: 'city',
    minZoom: 5,
    maxZoom: 18,
    description: 'Jazz, culture, and cuisine'
  },
  {
    id: 'miami',
    name: 'Miami',
    lat: 25.7617,
    lng: -80.1918,
    emoji: '🏖️',
    category: 'city',
    minZoom: 5,
    maxZoom: 18,
    description: 'Beaches and Art Deco'
  },
  
  // Iconic Landmarks (visible at zoom 6+)
  {
    id: 'mount-rushmore',
    name: 'Mt. Rushmore',
    lat: 43.8791,
    lng: -103.4591,
    emoji: '🗿',
    category: 'landmark',
    minZoom: 6,
    maxZoom: 18,
    description: 'Presidential monument'
  },
  {
    id: 'niagara-falls',
    name: 'Niagara Falls',
    lat: 43.0962,
    lng: -79.0377,
    emoji: '💦',
    category: 'landmark',
    minZoom: 6,
    maxZoom: 18,
    description: 'Magnificent waterfalls'
  },
  {
    id: 'golden-gate',
    name: 'Golden Gate',
    lat: 37.8199,
    lng: -122.4783,
    emoji: '🌉',
    category: 'landmark',
    minZoom: 7,
    maxZoom: 18,
    description: 'Iconic San Francisco bridge'
  },
  {
    id: 'space-needle',
    name: 'Space Needle',
    lat: 47.6205,
    lng: -122.3493,
    emoji: '🗼',
    category: 'landmark',
    minZoom: 7,
    maxZoom: 18,
    description: 'Seattle landmark'
  },
  
  // Scenic Routes (visible at zoom 7+)
  {
    id: 'route-66',
    name: 'Route 66',
    lat: 35.0844,
    lng: -106.6504,
    emoji: '🛣️',
    category: 'scenic-route',
    minZoom: 7,
    maxZoom: 18,
    description: 'Historic highway'
  },
  {
    id: 'pacific-coast-highway',
    name: 'PCH',
    lat: 36.2704,
    lng: -121.8081,
    emoji: '🌊',
    category: 'scenic-route',
    minZoom: 7,
    maxZoom: 18,
    description: 'Coastal scenic drive'
  },
  {
    id: 'blue-ridge-parkway',
    name: 'Blue Ridge',
    lat: 36.4149,
    lng: -81.4916,
    emoji: '🍂',
    category: 'scenic-route',
    minZoom: 7,
    maxZoom: 18,
    description: 'Mountain scenic route'
  },
  
  // Hidden Gems (visible at zoom 8+)
  {
    id: 'sedona',
    name: 'Sedona',
    lat: 34.8697,
    lng: -111.7610,
    emoji: '🏜️',
    category: 'hidden-gem',
    minZoom: 8,
    maxZoom: 18,
    description: 'Red rock formations'
  },
  {
    id: 'savannah',
    name: 'Savannah',
    lat: 32.0809,
    lng: -81.0912,
    emoji: '🏛️',
    category: 'hidden-gem',
    minZoom: 8,
    maxZoom: 18,
    description: 'Historic southern charm'
  },
  {
    id: 'asheville',
    name: 'Asheville',
    lat: 35.5951,
    lng: -82.5515,
    emoji: '🎨',
    category: 'hidden-gem',
    minZoom: 8,
    maxZoom: 18,
    description: 'Arts and mountain culture'
  },
  {
    id: 'taos',
    name: 'Taos',
    lat: 36.4072,
    lng: -105.5734,
    emoji: '🎨',
    category: 'hidden-gem',
    minZoom: 8,
    maxZoom: 18,
    description: 'Art colony and skiing'
  },
  
  // Beaches (visible at zoom 6+)
  {
    id: 'myrtle-beach',
    name: 'Myrtle Beach',
    lat: 33.6891,
    lng: -78.8867,
    emoji: '🏖️',
    category: 'beach',
    minZoom: 6,
    maxZoom: 18,
    description: 'Popular beach destination'
  },
  {
    id: 'santa-monica',
    name: 'Santa Monica',
    lat: 34.0195,
    lng: -118.4912,
    emoji: '🎡',
    category: 'beach',
    minZoom: 7,
    maxZoom: 18,
    description: 'Beach and pier'
  },
  
  // Adventure Spots (visible at zoom 7+)
  {
    id: 'moab',
    name: 'Moab',
    lat: 38.5733,
    lng: -109.5498,
    emoji: '🚵',
    category: 'adventure',
    minZoom: 7,
    maxZoom: 18,
    description: 'Mountain biking and arches'
  },
  {
    id: 'jackson-hole',
    name: 'Jackson Hole',
    lat: 43.4799,
    lng: -110.7624,
    emoji: '⛷️',
    category: 'adventure',
    minZoom: 7,
    maxZoom: 18,
    description: 'Skiing and western charm'
  }
];

// Helper function to get POIs for current zoom level
export function getPOIsForZoom(zoomLevel, bounds) {
  return roadTripPOIs.filter(poi => {
    // Check zoom level
    if (zoomLevel < poi.minZoom || zoomLevel > poi.maxZoom) {
      return false;
    }
    
    // Check if POI is within map bounds
    if (bounds) {
      const inLat = poi.lat >= bounds.south && poi.lat <= bounds.north;
      const inLng = poi.lng >= bounds.west && poi.lng <= bounds.east;
      return inLat && inLng;
    }
    
    return true;
  });
}

// Get category styling
export function getCategoryStyle(category) {
  const styles = {
    'national-park': { color: '#059669', size: 'large' },
    'city': { color: '#3B82F6', size: 'medium' },
    'landmark': { color: '#8B5CF6', size: 'medium' },
    'scenic-route': { color: '#F59E0B', size: 'small' },
    'hidden-gem': { color: '#EC4899', size: 'small' },
    'beach': { color: '#06B6D4', size: 'medium' },
    'adventure': { color: '#10B981', size: 'medium' }
  };
  
  return styles[category] || { color: '#6B7280', size: 'small' };
}