import L from 'leaflet';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Vite needs the MapLibre v6 worker bundled explicitly; without it the
// style can load while vector tiles never render in Safari or native WebViews.
setWorkerUrl(maplibreWorkerUrl);

const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> © <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

let pluginPromise: Promise<typeof import('leaflet')> | null = null;

export async function loadMapLibraries() {
  if (typeof window === 'undefined') return L;

  // The Leaflet plugin reads MapLibre from the global when it initializes.
  (window as Window & { L?: typeof L }).L = L;
  (window as Window & { maplibregl?: typeof maplibregl }).maplibregl = maplibregl;
  pluginPromise ??= import('@maplibre/maplibre-gl-leaflet').then(() => L);
  await pluginPromise;
  return L;
}

export function addOpenFreeMapLayer(map: L.Map) {
  return L.maplibreGL({
    style: 'https://tiles.openfreemap.org/styles/liberty',
    attributionControl: { customAttribution: OPENFREEMAP_ATTRIBUTION },
  } as any).addTo(map);
}
