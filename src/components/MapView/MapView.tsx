import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import styles from './MapView.module.css';

// Fix for default marker icon in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  latitude: number;
  longitude: number;
  uncertainty: number; // meters
  onLocationChange?: (lat: number, lng: number) => void;
  editable?: boolean;
  /** When the map was hidden (e.g. tab switch), become true again to fix tile sizing. */
  active?: boolean;
}

function MapUpdater({
  latitude,
  longitude,
  active = true,
}: {
  latitude: number;
  longitude: number;
  active?: boolean;
}) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);

  useEffect(() => {
    if (!active) return;
    // After display:none, Leaflet needs a layout pass before tiles render correctly
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => cancelAnimationFrame(id);
  }, [active, map]);

  return null;
}

export function MapView({
  latitude,
  longitude,
  uncertainty,
  onLocationChange,
  editable = false,
  active = true,
}: MapViewProps) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (editable && markerRef.current && onLocationChange) {
      const marker = markerRef.current;
      
      const handleDragEnd = () => {
        const position = marker.getLatLng();
        onLocationChange(position.lat, position.lng);
      };

      marker.on('dragend', handleDragEnd);

      return () => {
        marker.off('dragend', handleDragEnd);
      };
    }
  }, [editable, onLocationChange]);

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className={styles.map}
      >
        <MapUpdater latitude={latitude} longitude={longitude} active={active} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[latitude, longitude]}
          draggable={editable}
          ref={markerRef}
        />
        <Circle
          center={[latitude, longitude]}
          radius={uncertainty}
          pathOptions={{ color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2 }}
        />
      </MapContainer>
    </div>
  );
}

