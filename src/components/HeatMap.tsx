import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Polyline, Popup } from 'react-leaflet';
import { MapSetup } from './MapSetup';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Point {
  lat: number;
  lng: number;
  intensity?: number;
}

interface FighterJet extends Point {
  id: string;
  type: string;
  callsign?: string; // Added callsign property
  threatLevel: number;  // 1-10 scale
  armamentLevel: number; // 1-10 scale
  strategicValue: number; // 1-10 scale, calculated from other attributes
  altitude: number; // in feet
  speed: number; // in knots
  heading: number; // in degrees
  lastUpdated: Date;
}

interface AnimatedPoint extends Point {
  // Simple elliptical movement properties
  radiusX: number; // X-axis radius (longitude)
  radiusY: number; // Y-axis radius (latitude)
  speed: number;   // Angular speed
  angle: number;   // Current angle
  centerLat: number; // Center of ellipse (latitude)
  centerLng: number; // Center of ellipse (longitude)
  clockwise: boolean; // Direction of movement
}

interface Scenario {
  name: string;
  markerCenter: [number, number];
  heatmapPoints: Point[];
}

interface HeatMapProps {
  center: [number, number];
  zoom: number;
}

interface MarkerPosition {
  position: [number, number];
  rotation: number;
}



// Define threat positions
const threatPositions = [
  { id: 't1', position: [24.5, 122.3], type: 'air', threat: 'high' },
  { id: 't2', position: [23.2, 121.8], type: 'air', threat: 'medium' },
  { id: 't3', position: [22.9, 120.5], type: 'air', threat: 'high' },
  { id: 't4', position: [23.8, 120.2], type: 'ground', threat: 'medium' },
  { id: 't5', position: [24.2, 121.2], type: 'air', threat: 'low' },
  { id: 't6', position: [22.5, 121.5], type: 'ground', threat: 'high' }
];

// Define flight paths
const flightPathLines = [
  { id: 'path1', positions: [[23.6978, 121.5605], [24.5, 122.3]], color: '#ffcc00' },
  { id: 'path2', positions: [[24.1, 122.1], [23.2, 121.8]], color: '#ffcc00' }
];

// Define multiple scenarios
// Fighter jet types with their base characteristics
const fighterJetTypes = [
  { type: 'SU-57', baseThreat: 9, baseArmament: 8 },
  { type: 'J-20', baseThreat: 8, baseArmament: 7 },
  { type: 'MiG-35', baseThreat: 7, baseArmament: 7 },
  { type: 'SU-35', baseThreat: 8, baseArmament: 8 },
  { type: 'J-16', baseThreat: 6, baseArmament: 7 },
  { type: 'J-10C', baseThreat: 6, baseArmament: 6 },
  { type: 'MiG-29', baseThreat: 5, baseArmament: 6 },
  { type: 'SU-30', baseThreat: 7, baseArmament: 7 },
  { type: 'JF-17', baseThreat: 4, baseArmament: 5 },
  { type: 'J-7', baseThreat: 3, baseArmament: 4 }
];

// Generate battlefield data with exactly 4 enemy fighter jets
const generateBattlefieldData = (center: [number, number], radius = 0.4): FighterJet[] => {
  const jets: FighterJet[] = [];
  
  // Create 4 specific positions for the jets
  const positions = [
    // Position 1 - North
    {
      lat: center[0] + radius *3,
      lng: center[1],
      type: 'SU-57'
    },
    // Position 2 - East
    {
      lat: center[0],
      lng: center[1] + radius * 4,
      type: 'J-20'
    },
    // Position 3 - South
    {
      lat: center[0] - radius * 12,
      lng: center[1],
      type: 'F-22'
    },
    // Position 4 - West
    {
      lat: center[0],
      lng: center[1] - radius * 9,
      type: 'SU-35'
    }
  ];
  
  // Create exactly 4 jets at the predetermined positions
  positions.forEach((pos, index) => {
    const jet = createSpecificJet(pos.lat, pos.lng, pos.type, index);
    jets.push(jet);
  });
  
  return jets;
};

// Create a specific fighter jet with predetermined type
const createSpecificJet = (lat: number, lng: number, jetType: string, index: number): FighterJet => {
  // Find the jet type in our types array
  const jetTypeData = fighterJetTypes.find(t => t.type === jetType) || fighterJetTypes[0];
  
  // Generate a unique ID
  const id = `jet-${index}`;
  
  // Calculate strategic value based on threat and armament
  const strategicValue = Math.min(10, jetTypeData.baseThreat * 0.6 + jetTypeData.baseArmament * 0.4 + 1);
  
  // Specific callsigns for the 4 jets
  const callsigns = ['BONG', 'SATAN', 'SCAT', 'HOSS'];
  
  return {
    id,
    lat,
    lng,
    type: jetType,
    callsign: callsigns[index],
    threatLevel: jetTypeData.baseThreat,
    armamentLevel: jetTypeData.baseArmament,
    strategicValue,
    altitude: 25000 + (index * 5000), // Different altitudes
    speed: 600 + (index * 100), // Different speeds
    heading: index * 90, // Evenly spaced headings (0, 90, 180, 270)
    lastUpdated: new Date()
  };
};

const scenarios: Scenario[] = [
  {
    name: "Taiwan Straits",
    markerCenter: [25.047, 121.532], // Taipei area
    heatmapPoints: generateBattlefieldData([25.047, 121.532], 0.06) // 4 planes with spacing
  }
];

function useMovingMarker(center: [number, number]): MarkerPosition {
  const [markerData, setMarkerData] = useState<MarkerPosition>({
    position: center,
    rotation: 0
  });
  const radius = 0.03; // Larger radius for the circle path

  useEffect(() => {
    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.02;
      const lat = center[0] + radius * Math.cos(angle);
      const lng = center[1] + radius * Math.sin(angle);
      const newPos: [number, number] = [lat, lng];
      const rotationAngle = (angle * 180 / Math.PI) + 90;
      
      setMarkerData({
        position: newPos,
        rotation: rotationAngle
      });
    }, 50);

    return () => clearInterval(interval);
  }, [center]);

  return markerData;
}

// Empty component that accepts MarkerPosition props but doesn't render anything
function MarkerLayer({ position: _position, rotation: _rotation }: MarkerPosition): null {
  // Not using position and rotation props anymore, but keeping the interface
  // for compatibility with existing code
  return null;
}

function initializeAnimatedPoints(points: Point[]): AnimatedPoint[] {
  return points.map(point => {
    // Calculate the longitude correction factor based on latitude
    // This helps maintain shape despite longitude distortion
    const latitudeRadians = point.lat * (Math.PI / 180);
    const longitudeCorrectionFactor = Math.cos(latitudeRadians);
    
    // Create large elliptical patterns for planes
    // Higher value aircraft get slightly larger patterns
    const intensity = point.intensity || 0.5;
    
    // Convert km to degrees (approximately)
    // 1 degree of latitude is roughly 111 km
    // 1 degree of longitude varies with latitude, hence the correction factor
    const kmToLatDegrees = 1 / 111;
    const kmToLngDegrees = kmToLatDegrees / longitudeCorrectionFactor;
    
    // Create elliptical orbit parameters for at least 100 km length
    // For an ellipse, the perimeter is approximately 2π * sqrt((a² + b²)/2) where a and b are the semi-major and semi-minor axes
    // To ensure at least 100 km length, we need to make the axes large enough
    
    // Make major axis (longitude) significantly larger than minor axis (latitude) for elongated elliptical paths
    // Base values ensure minimum 100 km perimeter
    const minRadiusY = 0.45 * kmToLatDegrees; // ~50 km in latitude direction
    const minRadiusX = 0.9 * kmToLngDegrees;  // ~100 km in longitude direction
    
    // Add some randomness to make each path unique
    // Intensity affects the size - higher value aircraft get larger patterns
    const radiusY = minRadiusY + (0.1 * intensity * kmToLatDegrees) + (Math.random() * 0.1 * kmToLatDegrees);
    const radiusX = minRadiusX + (0.15 * intensity * kmToLngDegrees) + (Math.random() * 0.15 * kmToLngDegrees);
    
    // Adjust speed for larger ellipses - slower for larger paths to maintain reasonable movement
    const speed = 0.005 + (Math.random() * 0.003); // Slower for larger ellipses
    
    // Random starting angle and direction
    const angle = Math.random() * Math.PI * 2;
    const clockwise = Math.random() > 0.5;
    
    // Return the animated point with elliptical orbit parameters
    return {
      ...point,
      centerLat: point.lat, // Center of ellipse
      centerLng: point.lng,
      radiusX,
      radiusY,
      speed,
      angle,
      clockwise
    };
  });
}

// Simple utility function to keep angle in 0-2π range
function normalizeAngle(angle: number): number {
  return angle % (Math.PI * 2);
}

function useMovingHeatPoints(points: Point[]) {
  const [animatedPoints, setAnimatedPoints] = useState<Point[]>(points);
  const animatedPointsRef = useRef<AnimatedPoint[]>(initializeAnimatedPoints(points));

  useEffect(() => {
    // Reset animated points when input points change
    animatedPointsRef.current = initializeAnimatedPoints(points);
  }, [points]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newPoints = animatedPointsRef.current.map(point => {
        // Update angle based on speed and direction
        const newAngle = normalizeAngle(point.angle + (point.clockwise ? 1 : -1) * point.speed);
        
        // Calculate new position on the ellipse
        const newLat = point.centerLat + point.radiusY * Math.sin(newAngle);
        const newLng = point.centerLng + point.radiusX * Math.cos(newAngle);
        
        // Calculate heading based on direction of movement
        // Use the derivative of the parametric equation of the ellipse to get tangent direction
        const dx = -point.radiusX * Math.sin(newAngle) * (point.clockwise ? -1 : 1);
        const dy = point.radiusY * Math.cos(newAngle) * (point.clockwise ? -1 : 1);
        const heading = Math.atan2(dx, dy) * (180 / Math.PI);
        
        // Update the point's angle for next iteration
        point.angle = newAngle;
        
        // If this is a FighterJet, preserve its properties
        if ('type' in point && 'strategicValue' in point) {
          const jet = point as unknown as FighterJet;
          return {
            ...jet,
            ...point, // Keep elliptical orbit properties
            lat: newLat,
            lng: newLng,
            heading: heading,
            // Update last position time
            lastUpdated: new Date()
          };
        }
        
        // Otherwise return a regular animated point
        return {
          ...point,
          lat: newLat,
          lng: newLng,
          intensity: point.intensity
        };
      });

      animatedPointsRef.current = newPoints;
      setAnimatedPoints(newPoints);
    }, 50); // Faster update interval for more visible movement

    return () => clearInterval(interval);
  }, []);

  return animatedPoints;
}

// Aircraft icon component that displays fighter jets on the map
function AircraftIcons({ jets }: { jets: FighterJet[] }) {
  const map = useMap();
  
  useEffect(() => {
    // Create markers for each jet
    const markers = jets.map(jet => {
      // Create a custom icon based on strategic value
      const icon = createJetIcon(jet.strategicValue);
      
      // Create marker
      const marker = L.marker([jet.lat, jet.lng], { icon }).addTo(map);
      
      // Add tooltip with jet information
      marker.bindTooltip(
        `<div class="fighter-jet-tooltip">
          <strong>${jet.type} - ${jet.callsign || ''}</strong><br/>
          Threat: ${jet.threatLevel.toFixed(1)}/10<br/>
          Armament: ${jet.armamentLevel.toFixed(1)}/10<br/>
          Alt: ${jet.altitude.toLocaleString()} ft<br/>
          Speed: ${jet.speed} kts<br/>
          Heading: ${jet.heading}°
        </div>`,
        { className: 'fighter-jet-tooltip' }
      );
      
      return marker;
    });
    
    // Cleanup function
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [map, jets]);
  
  // Create a custom icon for fighter jets
  function createJetIcon(strategicValue: number, size: number = 24) {
    // Determine color based on strategic value
    const getColor = () => {
      if (strategicValue >= 8) return '#FF3B30'; // High value - red
      if (strategicValue >= 6) return '#FF9500'; // Medium-high value - orange
      if (strategicValue >= 4) return '#FFCC00'; // Medium value - yellow
      return '#34C759'; // Low value - green
    };
    
    const color = getColor();
    
    // Create a custom fighter jet icon that looks like a plane
    return L.divIcon({
      className: 'fighter-jet-icon',
      html: `<div style="
        width: ${size}px; 
        height: ${size}px; 
        background-image: url('/images/fighter-jet.svg'); 
        background-size: contain; 
        background-repeat: no-repeat;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.7)) drop-shadow(0 0 4px ${color});
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }
  
  // Component must return something for React
  return null;
}

function HeatMapLayer({ points }: { points: Point[] }) {
  const map = useMap();
  const animatedPoints = useMovingHeatPoints(points);
  const [mapReady, setMapReady] = useState(false);
  
  // Cast the animated points to FighterJet[] if they are fighter jets
  const fighterJets = animatedPoints.filter(point => 
    'type' in point && 'heading' in point
  ) as FighterJet[];

  // Ensure map is fully initialized before adding layers
  useEffect(() => {
    if (!map) return;
    
    // Wait for map to be ready
    const handleMapReady = () => {
      setMapReady(true);
    };
    
    map.whenReady(handleMapReady);
    
    // Also set ready after a small delay as a fallback
    const timeout = setTimeout(() => {
      setMapReady(true);
    }, 500);
    
    return () => {
      clearTimeout(timeout);
      map.off('ready', handleMapReady);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !mapReady || animatedPoints.length === 0) return;
    
    try {
      const formattedPoints = animatedPoints.map(point => [
        point.lat,
        point.lng,
        point.intensity || 1
      ]);

      const heatLayer = L.heatLayer(formattedPoints as [number, number, number][], {
        radius: 55,       // Smaller radius for more defined individual points
        blur: 25,         // Less blur to prevent overlap between dispersed points
        maxZoom: 10,
        minOpacity: 0.2,  // Slightly higher minimum opacity
        max: 1.0,         // Full intensity range
        gradient: {
          0.0: 'rgba(0, 0, 255, 0.2)',     // Low value - blue (minimal threat)
          0.3: 'rgba(0, 255, 255, 0.5)',   // Low-medium value - cyan
          0.5: 'rgba(0, 255, 0, 0.6)',     // Medium value - green
          0.7: 'rgba(255, 255, 0, 0.7)',   // Medium-high value - yellow
          0.8: 'rgba(255, 165, 0, 0.8)',   // High value - orange
          0.9: 'rgba(255, 69, 0, 0.9)',    // Very high value - red-orange
          1.0: 'rgba(255, 0, 0, 1.0)'      // Maximum value - bright red (critical threat)
        }
      });

      // Force map invalidation to ensure proper sizing
      map.invalidateSize();
      heatLayer.addTo(map);

      return () => {
        map.removeLayer(heatLayer);
      };
    } catch (error) {
      console.error("Error creating heat layer:", error);
    }
  }, [map, mapReady, animatedPoints]);

  // Add custom CSS for tooltips
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .fighter-jet-tooltip {
        background-color: rgba(0, 0, 0, 0.8);
        border: 1px solid #444;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        padding: 5px 8px;
      }
      .fighter-jet-tooltip strong {
        color: #FF3B30;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <AircraftIcons jets={fighterJets} />
      
      {/* Render threat markers */}
      {threatPositions.map((threat) => (
        <CircleMarker
          key={threat.id}
          center={threat.position as [number, number]}
          radius={10}
          pathOptions={{
            color: threat.threat === 'high' ? '#f56565' : 
                   threat.threat === 'medium' ? '#ed8936' : '#ecc94b',
            fillColor: threat.threat === 'high' ? '#f56565' : 
                       threat.threat === 'medium' ? '#ed8936' : '#ecc94b',
            fillOpacity: 0.5
          }}
        >
          <Popup>
            Threat Level: {threat.threat}<br />
            Type: {threat.type}
          </Popup>
        </CircleMarker>
      ))}
      
      {/* Render flight paths */}
      {flightPathLines.map((path) => (
        <Polyline
          key={path.id}
          positions={path.positions as [number, number][]}
          pathOptions={{ color: path.color, weight: 3, dashArray: '5, 5' }}
        />
      ))}
    </>
  );
}

// Custom zoom controls component that properly accesses the Leaflet map
function ZoomControls() {
  const map = useMap();
  
  return (
    <div className="map-controls" style={{
      position: 'absolute',
      right: '10px',
      top: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '5px'
    }}>
      <button 
        className="map-control-button" 
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '18px'
        }}
        onClick={() => map.setZoom(map.getZoom() + 1)}
      >+</button>
      <button 
        className="map-control-button"
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '18px'
        }}
        onClick={() => map.setZoom(map.getZoom() - 1)}
      >-</button>
    </div>
  );
}

function Tabs({ activeTab, setActiveTab }: { activeTab: number, setActiveTab: (index: number) => void }) {
  return (
    <div className="tabs" style={{
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '8px',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
      display: 'flex',
      gap: '5px'
    }}>
      {scenarios.map((scenario, index) => (
        <button
          key={index}
          onClick={() => setActiveTab(index)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: activeTab === index ? '#ff3b30' : '#333333',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          {scenario.name}
        </button>
      ))}
    </div>
  );
}

export default function HeatMap({ zoom = 8 }: HeatMapProps) { // Default zoom level
  const [activeTab, setActiveTab] = useState(0);
  const [routing, setRouting] = useState<boolean>(false);
  const currentScenario = scenarios[activeTab];
  const markerData = useMovingMarker(currentScenario.markerCenter);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Toggle routing mode
  const toggleRouting = (): void => {
    setRouting(!routing);
  };

  // Ensure we have CSS for the map container
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-container {
        width: 100%;
        height: 100%;
        min-height: 300px;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Force re-render when the component's parent size changes
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (mapContainerRef.current) {
        // This triggers a re-render
        mapContainerRef.current.style.display = 'none';
        setTimeout(() => {
          if (mapContainerRef.current) {
            mapContainerRef.current.style.display = 'block';
          }
        }, 0);
      }
    });
    
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      ref={mapContainerRef}
      style={{ 
        position: 'relative', 
        height: '100%', 
        minHeight: '300px',
        width: '100%'
      }}
    >
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Routing controls */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 16px',
        borderRadius: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: 'white',
        fontWeight: 'bold'
      }}>
        <button
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: routing ? '#4299e1' : '#2d3748',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={toggleRouting}
        >
          ⚙
        </button>
        <div>ROUTING {routing ? 'ON' : 'OFF'}</div>
        <button style={{
          width: '36px',
          height: '36px',
          backgroundColor: '#2d3748',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          ⟲
        </button>
      </div>
      
      <MapContainer
        className="leaflet-container"
        style={{ height: '100%', width: '100%' }}
      >
        {/* Add map controls */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#f6ad55',
          color: '#000',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>⚠ SIMULATION ONLY</div>
        {/* MapController to handle center and zoom */}
        <MapSetup center={currentScenario.markerCenter} zoom={zoom} />
        <ZoomControls />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Add a second tile layer for terrain visualization */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <MarkerLayer {...markerData} />
        <HeatMapLayer points={currentScenario.heatmapPoints} />
      </MapContainer>
    </div>
  );
} 