/**
 * Traffic Service for OpenRoad
 * Provides real-time traffic data and route optimization
 */

// Mock traffic data until real API integration
const TRAFFIC_CONDITIONS = {
  CLEAR: { level: 0, color: '#10b981', text: 'Clear', delay: 0 },
  LIGHT: { level: 1, color: '#3b82f6', text: 'Light Traffic', delay: 5 },
  MODERATE: { level: 2, color: '#f59e0b', text: 'Moderate Traffic', delay: 15 },
  HEAVY: { level: 3, color: '#ef4444', text: 'Heavy Traffic', delay: 30 },
  SEVERE: { level: 4, color: '#dc2626', text: 'Severe Delays', delay: 60 }
};

class TrafficService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get traffic conditions for a route segment
   */
  async getSegmentTraffic(start, end) {
    const cacheKey = `${start.lat},${start.lng}-${end.lat},${end.lng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Simulate traffic data based on time and location
    const traffic = this.simulateTrafficConditions(start, end);
    
    this.cache.set(cacheKey, {
      data: traffic,
      timestamp: Date.now()
    });

    return traffic;
  }

  /**
   * Get traffic for entire route
   */
  async getRouteTraffic(waypoints) {
    if (waypoints.length < 2) return [];

    const segments = [];
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i].location;
      const end = waypoints[i + 1].location;
      const traffic = await this.getSegmentTraffic(start, end);
      
      segments.push({
        from: waypoints[i].name,
        to: waypoints[i + 1].name,
        distance: this.calculateDistance(start, end),
        traffic,
        estimatedDelay: traffic.delay,
        alternateRoutes: this.generateAlternateRoutes(start, end, traffic)
      });
    }

    return segments;
  }

  /**
   * Simulate traffic conditions (replace with real API)
   */
  simulateTrafficConditions(start, end) {
    const hour = new Date().getHours();
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
    const distance = this.calculateDistance(start, end);
    
    // Simulate traffic based on various factors
    let trafficLevel = 0;
    
    // Rush hour traffic
    if (isRushHour && isWeekday) {
      trafficLevel += 2;
    }
    
    // Distance factor (longer routes may have more traffic)
    if (distance > 50) {
      trafficLevel += 1;
    }
    
    // Random factor for variability
    trafficLevel += Math.floor(Math.random() * 2);
    
    // Cap at maximum level
    trafficLevel = Math.min(trafficLevel, 4);
    
    const conditions = Object.values(TRAFFIC_CONDITIONS)[trafficLevel];
    
    // Add incident simulation (10% chance)
    const hasIncident = Math.random() < 0.1;
    
    return {
      ...conditions,
      incidents: hasIncident ? [{
        type: 'accident',
        severity: 'minor',
        description: 'Minor accident reported',
        delay: 15,
        location: {
          lat: (start.lat + end.lat) / 2,
          lng: (start.lng + end.lng) / 2
        }
      }] : [],
      lastUpdated: new Date(),
      congestionLevel: trafficLevel / 4, // 0-1 scale
      averageSpeed: this.calculateAverageSpeed(conditions.level)
    };
  }

  /**
   * Calculate average speed based on traffic level
   */
  calculateAverageSpeed(level) {
    const baseSpeed = 65; // mph
    const speedReductions = [0, 10, 25, 40, 50];
    return baseSpeed - speedReductions[level];
  }

  /**
   * Generate alternate route suggestions
   */
  generateAlternateRoutes(start, end, currentTraffic) {
    if (currentTraffic.level < 2) return []; // No alternates needed for light traffic
    
    return [
      {
        name: 'Scenic Route',
        additionalDistance: 15,
        estimatedTimeSaving: currentTraffic.level > 2 ? 10 : -5,
        features: ['Scenic views', 'Less traffic', 'More rest stops']
      },
      {
        name: 'Highway Route',
        additionalDistance: -5,
        estimatedTimeSaving: currentTraffic.level > 3 ? -10 : 5,
        features: ['Faster speeds', 'Direct path', 'May have tolls']
      }
    ];
  }

  /**
   * Calculate distance between two points (haversine formula)
   */
  calculateDistance(start, end) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(end.lat - start.lat);
    const dLon = this.toRad(end.lng - start.lng);
    const lat1 = this.toRad(start.lat);
    const lat2 = this.toRad(end.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return Math.round(R * c);
  }

  toRad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Get traffic predictions for future times
   */
  async getTrafficPredictions(route, departureTime) {
    const predictions = [];
    const times = [0, 2, 4, 6, 8]; // Hours from departure
    
    for (const hoursAhead of times) {
      const predictedTime = new Date(departureTime.getTime() + hoursAhead * 3600000);
      const hour = predictedTime.getHours();
      const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      
      predictions.push({
        time: predictedTime,
        hoursFromNow: hoursAhead,
        expectedCondition: isRushHour ? 'Heavy' : 'Light',
        recommendation: isRushHour ? 
          'Consider departing earlier or later to avoid rush hour' : 
          'Good time to travel with lighter traffic'
      });
    }
    
    return predictions;
  }

  /**
   * Get real-time incidents along route
   */
  async getRouteIncidents(waypoints) {
    // Simulate incidents (would connect to real incident API)
    const incidents = [];
    
    // 20% chance of incident on route
    if (Math.random() < 0.2) {
      const segmentIndex = Math.floor(Math.random() * (waypoints.length - 1));
      
      incidents.push({
        id: Date.now(),
        type: ['accident', 'construction', 'weather'][Math.floor(Math.random() * 3)],
        severity: ['minor', 'moderate', 'major'][Math.floor(Math.random() * 3)],
        location: {
          lat: waypoints[segmentIndex].location.lat,
          lng: waypoints[segmentIndex].location.lng
        },
        description: 'Incident reported on route',
        estimatedClearTime: new Date(Date.now() + Math.random() * 3600000 * 3),
        impact: {
          delay: Math.floor(Math.random() * 30) + 10,
          lanesClosed: Math.floor(Math.random() * 2) + 1
        }
      });
    }
    
    return incidents;
  }

  /**
   * Calculate optimal departure time
   */
  async calculateOptimalDeparture(route, targetArrival) {
    const predictions = await this.getTrafficPredictions(route, new Date());
    
    // Find the departure time with least traffic
    const optimal = predictions.reduce((best, current) => {
      if (current.expectedCondition === 'Light' && best.expectedCondition !== 'Light') {
        return current;
      }
      return best;
    });
    
    return {
      recommendedDeparture: optimal.time,
      reason: optimal.recommendation,
      alternativeTimes: predictions.filter(p => p !== optimal).slice(0, 2)
    };
  }
}

export default new TrafficService();