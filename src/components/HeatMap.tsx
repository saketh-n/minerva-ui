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
  friendly: boolean; // Whether the jet is friendly or enemy
  attribution?: number; // Attribution score (0-1 scale)
}

interface AnimatedPoint extends Point {
  // Simple forward movement with slight curve
  speed: number;    // Forward speed
  direction: number; // Direction of movement in degrees (0-360)
  startLat: number;  // Starting point latitude
  startLng: number;  // Starting point longitude
  distance: number;  // Total distance traveled so far
  curvature: number; // How much the path curves (very slight)
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



// Import entity simulation data
import simulationData from '../assets/entity_simulation.json';

// Get the first timestep entities
const firstTimestepEntities = simulationData.Timesteps[0].entities;

// Aircraft types for friendly and enemy entities
const friendlyAircraftTypes = [
  'F-35 Lightning II',
  'F-22 Raptor',
  'F-15EX Eagle II',
  'F/A-18E Super Hornet',
  'F-16 Fighting Falcon',
  'A-10 Thunderbolt II'
];

const enemyAircraftTypes = [
  'J-20',
  'Su-57',
  'Su-35',
  'J-16',
  'J-10C',
  'MiG-35'
];

// Define threat positions using entity data from JSON file
const threatPositions = firstTimestepEntities.map(entity => {
  // Assign aircraft type based on entity ID and friendly status
  const aircraftType = entity.friendly 
    ? friendlyAircraftTypes[(entity.id - 1) % friendlyAircraftTypes.length]
    : enemyAircraftTypes[(entity.id - 7) % enemyAircraftTypes.length];
  
  return {
    id: `e${entity.id}`,
    position: [entity.pos.y, entity.pos.x], // Note: Leaflet uses [lat, lng] format
    type: 'air', // All are aircraft now
    aircraftType: aircraftType,
    threat: entity.attribution_score > 0.8 ? 'high' : 
            entity.attribution_score > 0.6 ? 'medium' : 'low',
    friendly: entity.friendly
  };
});

// Define flight paths based on entity movements between first and last timestep
const lastTimestepEntities = simulationData.Timesteps[simulationData.Timesteps.length - 1].entities;

// Create flight paths for each entity showing movement from first to last position
const flightPathLines = firstTimestepEntities.map(entity => {
  const lastPosition = lastTimestepEntities.find(e => e.id === entity.id);
  return {
    id: `path${entity.id}`,
    positions: [
      [entity.pos.y, entity.pos.x], // Starting position [lat, lng]
      [lastPosition ? lastPosition.pos.y : entity.pos.y, lastPosition ? lastPosition.pos.x : entity.pos.x] // Ending position
    ],
    color: entity.friendly ? '#00ff00' : '#ff0000' // Green for friendly, red for enemy
  };
});

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
  
  // Create 12 specific positions for the jets with varied distances from center
  const positions = [
    // Friendly Forces (6 aircraft)
    // Position 1 - North
    {
      lat: center[0] + radius * 6,
      lng: center[1],
      type: 'F-35 Lightning II',
      friendly: true
    },
    // Position 2 - Northeast
    {
      lat: center[0] + radius * 5,
      lng: center[1] + radius * 5,
      type: 'F-22 Raptor',
      friendly: true
    },
    // Position 3 - East
    {
      lat: center[0],
      lng: center[1] + radius * 8,
      type: 'F-15EX Eagle II',
      friendly: true
    },
    // Position 4 - Southeast
    {
      lat: center[0] - radius * 5,
      lng: center[1] + radius * 5,
      type: 'F/A-18E Super Hornet',
      friendly: true
    },
    // Position 5 - South-Southeast
    {
      lat: center[0] - radius * 10,
      lng: center[1] + radius * 2,
      type: 'F-16 Fighting Falcon',
      friendly: true
    },
    // Position 6 - South
    {
      lat: center[0] - radius * 12,
      lng: center[1],
      type: 'A-10 Thunderbolt II',
      friendly: true
    },
    
    // Enemy Forces (6 aircraft)
    // Position 7 - West
    {
      lat: center[0],
      lng: center[1] - radius * 15,
      type: 'J-20',
      friendly: false
    },
    // Position 8 - Northwest
    {
      lat: center[0] + radius * 5,
      lng: center[1] - radius * 5,
      type: 'Su-57',
      friendly: false
    },
    // Position 9 - North-Northwest
    {
      lat: center[0] + radius * 10,
      lng: center[1] - radius * 2,
      type: 'Su-35',
      friendly: false
    },
    // Position 10 - Southwest
    {
      lat: center[0] - radius * 5,
      lng: center[1] - radius * 5,
      type: 'J-16',
      friendly: false
    },
    // Position 11 - South-Southwest
    {
      lat: center[0] - radius * 10,
      lng: center[1] - radius * 2,
      type: 'J-10C',
      friendly: false
    },
    // Position 12 - West-Southwest
    {
      lat: center[0] - radius * 2,
      lng: center[1] - radius * 10,
      type: 'MiG-35',
      friendly: false
    }
  ];
  
  // Create exactly 12 jets at the predetermined positions
  positions.forEach((pos, index) => {
    const jet = createSpecificJet(pos.lat, pos.lng, pos.type, index, pos.friendly);
    jets.push(jet);
  });
  
  return jets;
};

// Create a specific fighter jet with predetermined type
const createSpecificJet = (lat: number, lng: number, jetType: string, index: number, friendly: boolean = index < 6): FighterJet => {
  // Find the jet type in our types array
  const jetTypeData = fighterJetTypes.find(t => t.type === jetType) || fighterJetTypes[0];
  
  // Generate a unique ID
  const id = `jet-${index}`;
  
  // Calculate strategic value based on threat and armament
  const strategicValue = Math.min(10, jetTypeData.baseThreat * 0.6 + jetTypeData.baseArmament * 0.4 + 1);
  
  // Specific callsigns for the jets
  const callsigns = ['EAGLE', 'VIPER', 'RAPTOR', 'THUNDER', 'FALCON', 'WARTHOG', 
                     'DRAGON', 'FLANKER', 'FOXHOUND', 'FELON', 'FIREBIRD', 'FULCRUM'];
  
  // For enemy jets, generate an attribution score (0-1)
  // Higher values for more threatening enemies
  const attribution = !friendly ? 
    Math.min(1, Math.max(0, 0.4 + (jetTypeData.baseThreat / 10) * 0.6 + Math.random() * 0.2)) : 
    undefined;
  
  return {
    id,
    lat,
    lng,
    type: jetType,
    callsign: callsigns[index % callsigns.length],
    threatLevel: jetTypeData.baseThreat,
    armamentLevel: jetTypeData.baseArmament,
    strategicValue,
    altitude: 25000 + (index * 5000), // Different altitudes
    speed: 600 + (index * 100), // Different speeds
    heading: index * 30, // More varied headings
    lastUpdated: new Date(),
    friendly: friendly, // Set the friendly property explicitly
    attribution: attribution // Add attribution score for enemy jets
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
    
    // Get point intensity or use default
    // Determine if the point is a friendly aircraft
    const isFriendly = 'friendly' in point ? (point as any).friendly : false;
    
    // Set intensity based on friendly status - this will affect the heat map color intensity
    const intensity = isFriendly ? 0.7 : 0.8; // Slightly higher intensity for enemy aircraft
    
    // Convert km to degrees (approximately)
    // 1 degree of latitude is roughly 111 km
    // 1 degree of longitude varies with latitude, hence the correction factor
    const kmToLatDegrees = 1 / 111;
    const kmToLngDegrees = kmToLatDegrees / longitudeCorrectionFactor;
    
    // Set speed for forward movement, slightly different for friendly vs enemy
    // Friendly aircraft move slightly faster
    const speed = isFriendly ? 
      ((0.006 + (0.002 * intensity)) * 30) / 10 : 
      ((0.004 + (0.002 * intensity)) * 30) / 10;
    
    // Each plane gets a different random direction (0-360 degrees)
    // Spread them out in different directions
    const direction = Math.random() * 360;
    
    // Slight curvature for the path
    // Small positive or negative value to determine if it curves left or right
    // Increased slightly to be more noticeable with slower speeds
    const curvature = (Math.random() * 0.002 - 0.001) * 30;
    
    // Return the animated point with forward movement parameters
    return {
      ...point,
      startLat: point.lat,
      startLng: point.lng,
      speed,
      direction,
      curvature,
      intensity, // Add the calculated intensity
      distance: 0 // Start with zero distance traveled
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
  const timeStepRef = useRef<number>(0);
  const maxTimeSteps = 100; // Set the maximum time steps to 100

  useEffect(() => {
    // Reset animated points when input points change
    animatedPointsRef.current = initializeAnimatedPoints(points);
    timeStepRef.current = 0;
  }, [points]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Increment time step
      timeStepRef.current += 1;
      
      const newPoints = animatedPointsRef.current.map(point => {
        // If we've reached the maximum time steps, don't move the point anymore
        if (timeStepRef.current >= maxTimeSteps) {
          // Return the point at its final position
          return {
            ...point,
            distance: point.distance // Keep the distance at final value
          };
        }
        
        // Increase distance traveled based on speed
        const newDistance = point.distance + point.speed;
        
        // Convert direction from degrees to radians
        const directionRad = point.direction * (Math.PI / 180);
        
        // Calculate the curved path
        // As distance increases, the curvature gradually changes the direction
        const curvedDirectionRad = directionRad + (point.curvature * newDistance);
        
        // Calculate movement vector based on the curved direction
        const dx = Math.cos(curvedDirectionRad) * point.speed;
        const dy = Math.sin(curvedDirectionRad) * point.speed;
        
        // Calculate new position based on straight-line distance plus curve
        const newLng = point.startLng + Math.cos(directionRad) * newDistance + 
                     // Additional offset from curvature
                     Math.sin(directionRad) * point.curvature * newDistance * newDistance * 0.5;
        const newLat = point.startLat + Math.sin(directionRad) * newDistance - 
                     // Additional offset from curvature
                     Math.cos(directionRad) * point.curvature * newDistance * newDistance * 0.5;
        
        // Calculate heading based on the curved direction
        const heading = (curvedDirectionRad * (180 / Math.PI) + 360) % 360;
        
        // Update the point's distance for next iteration
        point.distance = newDistance;
        
        // If this is a FighterJet, preserve its properties
        if ('type' in point && 'strategicValue' in point) {
          const jet = point as unknown as FighterJet;
          return {
            ...jet,
            ...point, // Keep orbit properties
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
    }, 200); // Maximum interval for extremely slow, smooth movement

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
      // Create a custom icon based on jet properties
      const icon = createJetIcon(jet, 24, jet.heading);
      
      // Create marker
      const marker = L.marker([jet.lat, jet.lng], { icon }).addTo(map);
      
      // Add tooltip with jet information
      marker.bindTooltip(
        `<div class="fighter-jet-tooltip">
          <strong>${jet.type} - ${jet.callsign || ''}</strong><br/>
          ${jet.friendly ? '<span class="friendly-tag">FRIENDLY</span>' : '<span class="enemy-tag">ENEMY</span>'}<br/>
          Threat: ${jet.threatLevel.toFixed(1)}/10<br/>
          Armament: ${jet.armamentLevel.toFixed(1)}/10<br/>
          ${!jet.friendly && jet.attribution !== undefined ? `Attribution: ${(jet.attribution * 100).toFixed(1)}%<br/>` : ''}
          Alt: ${jet.altitude.toLocaleString()} ft<br/>
          Speed: ${jet.speed} kts<br/>
          Heading: ${jet.heading.toFixed(1)}°
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
  
  // Create a custom icon for fighter jets with rotation
  function createJetIcon(jet: FighterJet, size: number = 24, heading: number = 0) {
    // Determine color based on friendly status or attribution value
    const getColor = () => {
      // Check if the jet has a friendly property
      if (jet.friendly) {
        return '#0080FF'; // Blue for friendly
      } else {
        // For enemy aircraft, use attribution-based coloring
        if (jet.attribution !== undefined) {
          if (jet.attribution >= 0.8) return '#FF0000'; // High attribution - bright red
          if (jet.attribution >= 0.6) return '#FF4500'; // Medium-high attribution - orange-red
          if (jet.attribution >= 0.4) return '#FF8C00'; // Medium attribution - dark orange
          return '#FFA500'; // Low attribution - orange
        } else {
          // Fallback to strategic value if attribution isn't available
          if (jet.strategicValue >= 8) return '#FF3B30'; // High value - red
          if (jet.strategicValue >= 6) return '#FF9500'; // Medium-high value - orange
          if (jet.strategicValue >= 4) return '#FFCC00'; // Medium value - yellow
          return '#34C759'; // Low value - green
        }
      }
    };
    
    const color = getColor();
    
    // Set rotation to 0 as requested
    const rotation = 0;
    
    return L.divIcon({
      className: 'fighter-jet-icon',
      html: `<div style="
        width: ${size}px; 
        height: ${size}px; 
        background-image: url('/images/fighter-jet.svg'); 
        background-size: contain; 
        background-repeat: no-repeat;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.7)) drop-shadow(0 0 4px ${color});
        transform: rotate(${rotation}deg);
        transform-origin: center;
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
      // Separate friendly and enemy points for different colors
      const friendlyPoints: [number, number, number][] = [];
      const enemyPoints: [number, number, number][] = [];
      
      // Create a separate array for attribution-based heat map
      const attributionPoints: [number, number, number][] = [];
      
      // Process each point and categorize as friendly or enemy
      animatedPoints.forEach(point => {
        // Check if the point has fighter jet properties
        if ('type' in point && 'heading' in point) {
          const jet = point as FighterJet;
          
          // Create the formatted point for friendly/enemy categorization
          const formattedPoint: [number, number, number] = [
            point.lat,
            point.lng,
            point.intensity || 1
          ];
          
          // Add to the appropriate array
          if (jet.friendly) {
            friendlyPoints.push(formattedPoint);
          } else {
            enemyPoints.push(formattedPoint);
            
            // For enemy jets with attribution, add to the attribution heat map
            if (jet.attribution !== undefined) {
              attributionPoints.push([
                point.lat,
                point.lng,
                jet.attribution // Use attribution as intensity
              ]);
            }
          }
        } else {
          // For regular points, add based on intensity
          const formattedPoint: [number, number, number] = [
            point.lat,
            point.lng,
            point.intensity || 1
          ];
          
          // Check if the point has a 'friendly' property
          const isFriendly = 'friendly' in point ? (point as any).friendly : false;
          
          if (isFriendly) {
            friendlyPoints.push(formattedPoint);
          } else {
            enemyPoints.push(formattedPoint);
          }
        }
      });
      
      // Create a blue heat layer for friendly aircraft
      if (friendlyPoints.length > 0) {
        const friendlyHeatLayer = L.heatLayer(friendlyPoints, {
          radius: 55,
          blur: 25,
          maxZoom: 10,
          minOpacity: 0.2,
          max: 1.0,
          gradient: {
            0.0: 'rgba(0, 0, 255, 0.2)',    // Light blue
            0.5: 'rgba(30, 144, 255, 0.6)',  // Medium blue
            1.0: 'rgba(0, 0, 128, 1.0)'      // Dark blue
          }
        });
        friendlyHeatLayer.addTo(map);
      }
      
      // Create a red heat layer for enemy aircraft
      if (enemyPoints.length > 0) {
        const enemyHeatLayer = L.heatLayer(enemyPoints, {
          radius: 55,
          blur: 25,
          maxZoom: 10,
          minOpacity: 0.2,
          max: 1.0,
          gradient: {
            0.0: 'rgba(255, 0, 0, 0.2)',     // Light red
            0.5: 'rgba(220, 20, 60, 0.6)',    // Medium red
            1.0: 'rgba(139, 0, 0, 1.0)'       // Dark red
          }
        });
        enemyHeatLayer.addTo(map);
      }
      
      // Create a separate attribution-based heat layer for enemy aircraft
      if (attributionPoints.length > 0) {
        const attributionHeatLayer = L.heatLayer(attributionPoints, {
          radius: 85, // Larger radius to show attribution influence area
          blur: 35,   // More blur for smoother gradient
          maxZoom: 10,
          minOpacity: 0.3,
          max: 1.0,
          gradient: {
            0.0: 'rgba(255, 255, 0, 0.2)',    // Light yellow
            0.3: 'rgba(255, 165, 0, 0.4)',    // Orange
            0.6: 'rgba(255, 69, 0, 0.6)',     // Red-orange
            0.8: 'rgba(255, 0, 0, 0.7)',      // Bright red
            1.0: 'rgba(128, 0, 0, 0.8)'       // Dark red
          }
        });
        attributionHeatLayer.addTo(map);
      }

      // Force map invalidation to ensure proper sizing
      map.invalidateSize();

      return () => {
        // Remove all heat layers
        map.eachLayer(layer => {
          if (layer instanceof L.HeatLayer) {
            map.removeLayer(layer);
          }
        });
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
        font-size: 1.1em;
      }
      .friendly-tag {
        display: inline-block;
        background-color: #0080FF;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.8em;
        font-weight: bold;
      }
      .enemy-tag {
        display: inline-block;
        background-color: #FF0000;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.8em;
        font-weight: bold;
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