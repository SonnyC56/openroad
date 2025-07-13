import { useEffect, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Construction, Car } from 'lucide-react';
import trafficService from '../../services/traffic';
import styles from './TrafficOverlay.module.css';

const TrafficOverlay = ({ waypoints, visible = true, map }) => {
  const [trafficData, setTrafficData] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [trafficLayer, setTrafficLayer] = useState(null);

  useEffect(() => {
    if (!map || !visible || waypoints.length < 2) {
      if (trafficLayer && map) {
        map.removeLayer(trafficLayer);
      }
      return;
    }

    fetchTrafficData();
  }, [waypoints, visible, map]);

  const fetchTrafficData = async () => {
    try {
      const [traffic, routeIncidents] = await Promise.all([
        trafficService.getRouteTraffic(waypoints),
        trafficService.getRouteIncidents(waypoints)
      ]);
      
      setTrafficData(traffic);
      setIncidents(routeIncidents);
      
      drawTrafficOverlay(traffic);
      drawIncidents(routeIncidents);
    } catch (error) {
      console.error('Traffic data fetch error:', error);
    }
  };

  const drawTrafficOverlay = (traffic) => {
    // Remove existing layer
    if (trafficLayer && map) {
      map.removeLayer(trafficLayer);
    }

    const trafficLines = [];
    
    traffic.forEach((segment, index) => {
      if (index < waypoints.length - 1) {
        const start = waypoints[index].location;
        const end = waypoints[index + 1].location;
        
        // Create colored polyline based on traffic condition
        const line = L.polyline(
          [[start.lat, start.lng], [end.lat, end.lng]], 
          {
            color: segment.traffic.color,
            weight: 6,
            opacity: 0.8,
            className: styles.trafficLine
          }
        );
        
        // Add popup with traffic info
        line.bindPopup(`
          <div class="${styles.trafficPopup}">
            <h4>${segment.from} → ${segment.to}</h4>
            <p><strong>Condition:</strong> ${segment.traffic.text}</p>
            <p><strong>Estimated Delay:</strong> ${segment.traffic.delay} min</p>
            <p><strong>Average Speed:</strong> ${segment.traffic.averageSpeed} mph</p>
            ${segment.traffic.incidents.length > 0 ? `
              <div class="${styles.incident}">
                <strong>⚠️ Incident:</strong> ${segment.traffic.incidents[0].description}
              </div>
            ` : ''}
          </div>
        `);
        
        trafficLines.push(line);
      }
    });

    const layer = L.layerGroup(trafficLines);
    if (map) {
      layer.addTo(map);
      setTrafficLayer(layer);
    }
  };

  const drawIncidents = (incidents) => {
    if (!map) return;
    
    incidents.forEach(incident => {
      const icon = L.divIcon({
        html: `
          <div class="${styles.incidentMarker} ${styles[incident.severity]}">
            ${incident.type === 'accident' ? '🚨' : 
              incident.type === 'construction' ? '🚧' : '⚠️'}
          </div>
        `,
        className: 'traffic-incident-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([incident.location.lat, incident.location.lng], { icon })
        .bindPopup(`
          <div class="${styles.incidentPopup}">
            <h4>${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}</h4>
            <p><strong>Severity:</strong> ${incident.severity}</p>
            <p><strong>Description:</strong> ${incident.description}</p>
            <p><strong>Estimated Delay:</strong> ${incident.impact.delay} min</p>
            <p><strong>Lanes Closed:</strong> ${incident.impact.lanesClosed}</p>
            <p><strong>Clear by:</strong> ${new Date(incident.estimatedClearTime).toLocaleTimeString()}</p>
          </div>
        `)
        .addTo(map);
    });
  };

  if (!visible) return null;

  return (
    <div className={styles.legend}>
      <h4>Traffic Conditions</h4>
      <div className={styles.legendItems}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }}></div>
          <span>Clear</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Light</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Moderate</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ef4444' }}></div>
          <span>Heavy</span>
        </div>
      </div>
      
      {incidents.length > 0 && (
        <div className={styles.incidentsList}>
          <h5>Active Incidents</h5>
          {incidents.map((incident, index) => (
            <div key={index} className={styles.incidentItem}>
              <span className={styles.incidentIcon}>
                {incident.type === 'accident' ? <AlertTriangle size={14} /> :
                 incident.type === 'construction' ? <Construction size={14} /> :
                 <Car size={14} />}
              </span>
              <span>{incident.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrafficOverlay;