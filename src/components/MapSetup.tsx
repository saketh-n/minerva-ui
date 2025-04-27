import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Custom component to handle setting map view (center and zoom)
export function MapSetup({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}
