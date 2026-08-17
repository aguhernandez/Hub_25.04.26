import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

interface ActivityMapViewerProps {
  gpsPoints: GPSPoint[];
  title?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function ActivityMapViewer({ gpsPoints, title }: ActivityMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (gpsPoints.length < 2) return;

    let cancelled = false;

    const initializeMap = () => {
      if (cancelled || !mapContainerRef.current) return;

      const container = mapContainerRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(initializeMap, 100);
        return;
      }

      const L = window.L;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      try {
        const map = L.map(container, { preferCanvas: true });
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const latLngs = gpsPoints
          .filter(p => p.latitude != null && p.longitude != null)
          .map(p => [p.latitude, p.longitude] as [number, number]);

        if (latLngs.length < 2) {
          setIsLoading(false);
          return;
        }

        map.invalidateSize();

        const polyline = L.polyline(latLngs, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        L.circleMarker(latLngs[0], {
          radius: 8,
          fillColor: '#22C55E',
          color: '#16A34A',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map).bindPopup('Start');

        L.circleMarker(latLngs[latLngs.length - 1], {
          radius: 8,
          fillColor: '#EF4444',
          color: '#DC2626',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map).bindPopup('End');

        map.fitBounds(polyline.getBounds().pad(0.15));

        if (!cancelled) setIsLoading(false);
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };

    const loadLeaflet = () => {
      if (window.L) {
        setTimeout(initializeMap, 50);
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initializeMap, 50);
      document.head.appendChild(script);
    };

    loadLeaflet();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [gpsPoints]);

  if (gpsPoints.length < 2) {
    return (
      <div className="w-full h-64 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">No GPS data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
      )}
      <div className="relative w-full h-96 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
