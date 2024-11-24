import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore } from '../stores/locationStore';

// Custom icon configuration
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when location changes
function MapRecenter() {
  const { currentLocation } = useLocationStore();
  const map = useMap();

  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lng], 15, {
        animate: true,
        duration: 1
      });
    }
  }, [currentLocation, map]);

  return null;
}

// Component to handle location updates
function LocationUpdater() {
  const { updateLocation, setError } = useLocationStore();

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        updateLocation({ lat, lng, accuracy });
      },
      (error) => {
        setError(error.message);
      },
      { enableHighAccuracy: true }
    );

    // Watch for position updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        updateLocation({ lat, lng, accuracy });
      },
      (error) => {
        setError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return null;
}

// Component to handle marker and its updates
function LocationMarker() {
  const { currentLocation } = useLocationStore();

  if (!currentLocation) return null;

  return (
    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={customIcon}>
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">Your Location</p>
          <p>Lat: {currentLocation.lat.toFixed(6)}</p>
          <p>Lng: {currentLocation.lng.toFixed(6)}</p>
          {currentLocation.accuracy && (
            <p>Accuracy: ±{Math.round(currentLocation.accuracy)}m</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

const Map: React.FC = () => {
  const { currentLocation, error } = useLocationStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [defaultCenter] = useState<[number, number]>([35.6532, -83.5070]); // Center of Great Smoky Mountains

  useEffect(() => {
    if (currentLocation) {
      setIsInitialLoad(false);
    }
  }, [currentLocation]);

  if (error) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-gray-600 mt-2">Please enable location services to use the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] relative rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={isInitialLoad ? defaultCenter : (currentLocation ? [currentLocation.lat, currentLocation.lng] : defaultCenter)}
        zoom={isInitialLoad ? 11 : 15}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
        <LocationUpdater />
        <MapRecenter />
      </MapContainer>
    </div>
  );
};

export default Map;