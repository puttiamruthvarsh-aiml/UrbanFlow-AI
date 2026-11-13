import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  SelectedMapEntity, 
  LayerVisibilityState, 
  RoadSegmentProperties,
  JunctionProperties,
  TrafficSignalProperties,
  EmergencyFacilityProperties 
} from '../../types/network';
import { EmergencyRouteResult, RouteEndpoint } from '../../types/emergency';
import { LayerControls } from '../Map/LayerControls';
import { MapInspector } from '../Map/MapInspector';

// Bundled datasets
import roadsGeoJSON from '../../data/hyderabad_roads.json';
import junctionsGeoJSON from '../../data/junctions_geo.json';
import signalsGeoJSON from '../../data/traffic_signals_geo.json';
import emergencyGeoJSON from '../../data/emergency_locations_geo.json';

interface EmergencyTrafficMapProps {
  selectedHubKey?: string;
  routeResult: EmergencyRouteResult | null;
  onSelectEntity?: (entity: SelectedMapEntity) => void;
  mapSelectionMode?: 'none' | 'source' | 'target';
  onSelectEndpointFromMap?: (nodeId: string, nodeName: string) => void;
  roadConditions?: Record<string, { status: string; incident_id: string }>;
}

const HYDERABAD_CENTER: [number, number] = [78.4350, 17.4200];
const INITIAL_ZOOM = 11.4;

export const EmergencyTrafficMap: React.FC<EmergencyTrafficMapProps> = ({
  selectedHubKey,
  routeResult,
  onSelectEntity,
  mapSelectionMode = 'none',
  onSelectEndpointFromMap,
  roadConditions = {}
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [layers, setLayers] = useState<LayerVisibilityState>({
    roads: true,
    junctions: true,
    signals: true,
    hospitals: true,
    police: true,
    fireStations: true,
    basemapMode: 'dark',
    labels: true
  });

  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'esri-dark-base': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors'
        },
        'esri-dark-reference': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        },
        'osm-streets': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'esri-dark-base-layer',
          type: 'raster',
          source: 'esri-dark-base',
          minzoom: 0,
          maxzoom: 19,
          layout: { visibility: 'visible' }
        },
        {
          id: 'osm-streets-layer',
          type: 'raster',
          source: 'osm-streets',
          minzoom: 0,
          maxzoom: 19,
          layout: { visibility: 'none' }
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: HYDERABAD_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 9,
      maxZoom: 18,
      pitch: 35,
      bearing: -5,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // 1. Roads Source
      map.addSource('hyderabad-roads', {
        type: 'geojson',
        data: roadsGeoJSON as any
      });

      // 2. Junctions Source
      map.addSource('hyderabad-junctions', {
        type: 'geojson',
        data: junctionsGeoJSON as any
      });

      // 3. Emergency Route Source (Empty initially)
      map.addSource('emergency-corridor-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Layer: Road Glow
      map.addLayer({
        id: 'roads-glow',
        type: 'line',
        source: 'hyderabad-roads',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'highway'],
            'motorway', '#06B6D4',
            'trunk', '#3B82F6',
            'primary', '#60A5FA',
            '#64748B'
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 7, 16, 11],
          'line-opacity': 0.3,
          'line-blur': 2
        }
      });

      // Layer: Main Roads
      map.addLayer({
        id: 'roads-layer',
        type: 'line',
        source: 'hyderabad-roads',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'match',
            ['get', 'highway'],
            'motorway', '#06B6D4',
            'trunk', '#3B82F6',
            'primary', '#60A5FA',
            'secondary', '#94A3B8',
            '#64748B'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2.0,
            14, 4.0
          ],
          'line-opacity': 0.8
        }
      });

      // Layer: Blocked Roads Highlight (Red striped / intense red glow)
      map.addLayer({
        id: 'roads-blocked-layer',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['in', 'id', ''],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#EF4444',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9],
          'line-opacity': 0.95
        }
      });

      // Layer: Emergency Corridor Outer Glow (Pulsing Red)
      map.addLayer({
        id: 'emergency-corridor-glow',
        type: 'line',
        source: 'emergency-corridor-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#EF4444',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 16],
          'line-opacity': 0.5,
          'line-blur': 5
        }
      });

      // Layer: Emergency Corridor Center Line (Bright Red / Neon White Core)
      map.addLayer({
        id: 'emergency-corridor-core',
        type: 'line',
        source: 'emergency-corridor-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#FCA5A5',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8],
          'line-opacity': 1.0
        }
      });

      // Layer: Selected Road Highlight
      map.addLayer({
        id: 'roads-selected',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['==', 'id', ''],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#FACC15',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9],
          'line-opacity': 0.95
        }
      });

      // Layer: Junctions Circles
      map.addLayer({
        id: 'junctions-circle',
        type: 'circle',
        source: 'hyderabad-junctions',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 14, 6.5],
          'circle-color': [
            'case',
            ['get', 'has_signal'],
            '#F59E0B',
            '#38BDF8'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0B0F19',
          'circle-opacity': 0.9
        }
      });

      // Layer: Esri Labels
      map.addLayer({
        id: 'esri-dark-ref-layer',
        type: 'raster',
        source: 'esri-dark-reference',
        minzoom: 0,
        maxzoom: 19,
        layout: { visibility: 'visible' }
      });

      // Clicks
      map.on('click', 'roads-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as RoadSegmentProperties;
        map.setFilter('roads-selected', ['==', 'id', props.id]);
        const entity: SelectedMapEntity = { type: 'road', data: props };
        setSelectedEntity(entity);
        if (onSelectEntity) onSelectEntity(entity);
      });

      map.on('click', 'junctions-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as JunctionProperties;

        if (onSelectEndpointFromMap) {
          onSelectEndpointFromMap(props.id, props.name);
        }

        const entity: SelectedMapEntity = { type: 'junction', data: props };
        setSelectedEntity(entity);
        if (onSelectEntity) onSelectEntity(entity);

        if (feature.geometry.type === 'Point') {
          const coords = (feature.geometry as any).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 13.5), duration: 600 });
        }
      });

      map.on('mouseenter', 'junctions-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'junctions-circle', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'roads-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'roads-layer', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route GeoJSON whenever routeResult changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('emergency-corridor-source') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (routeResult && routeResult.route_found && routeResult.geojson_linestring) {
      source.setData({
        type: 'FeatureCollection',
        features: [routeResult.geojson_linestring as any]
      });

      // Fit map bounds smoothly to the emergency route
      const coords = routeResult.geojson_linestring.geometry.coordinates;
      if (coords && coords.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 15,
          duration: 1200
        });
      }
    } else {
      source.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }, [routeResult]);

  // Update Blocked Roads Filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const blockedIds: string[] = [];
    Object.entries(roadConditions).forEach(([rId, cond]) => {
      if (cond.status === 'BLOCKED') {
        blockedIds.push(rId);
        blockedIds.push(`${rId}_rev`);
      }
    });

    if (map.getLayer('roads-blocked-layer')) {
      if (blockedIds.length > 0) {
        map.setFilter('roads-blocked-layer', ['in', 'id', ...blockedIds]);
      } else {
        map.setFilter('roads-blocked-layer', ['in', 'id', '']);
      }
    }
  }, [roadConditions]);

  // Update Waypoint Markers (Source & Destination)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    waypointMarkersRef.current.forEach(m => m.remove());
    waypointMarkersRef.current = [];

    if (!routeResult || !routeResult.route_found) return;

    // 1. Source Waypoint Marker (Green Staging Beacon)
    if (routeResult.source) {
      const el = document.createElement('div');
      el.className = 'source-waypoint-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-xl shadow-emerald-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 12h20"/></svg>
          </div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([routeResult.source.lon, routeResult.source.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #0f172a;">
            <strong>ORIGIN:</strong> ${routeResult.source.name}
          </div>
        `))
        .addTo(map);

      waypointMarkersRef.current.push(marker);
    }

    // 2. Destination Waypoint Marker (Red Siren Beacon)
    if (routeResult.destination) {
      const el = document.createElement('div');
      el.className = 'target-waypoint-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></div>
          <div class="w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-xl shadow-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([routeResult.destination.lon, routeResult.destination.lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #0f172a;">
            <strong>DESTINATION:</strong> ${routeResult.destination.name}
          </div>
        `))
        .addTo(map);

      waypointMarkersRef.current.push(marker);
    }
  }, [routeResult]);

  // Standard Facility Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Facilities
    if ((emergencyGeoJSON as any)?.features) {
      (emergencyGeoJSON as any).features.forEach((feat: any) => {
        const coords = feat.geometry.coordinates as [number, number];
        const props = feat.properties as EmergencyFacilityProperties;
        const cat = props.category;

        if (cat === 'hospital' && !layers.hospitals) return;
        if (cat === 'police' && !layers.police) return;
        if (cat === 'fire_station' && !layers.fireStations) return;

        const el = document.createElement('div');
        el.className = 'emergency-facility-marker group cursor-pointer';

        let badgeBg = 'bg-emerald-500/20 border-emerald-400 text-emerald-400';
        let iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';

        if (cat === 'police') {
          badgeBg = 'bg-indigo-500/20 border-indigo-400 text-indigo-400';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
        } else if (cat === 'fire_station') {
          badgeBg = 'bg-orange-500/20 border-orange-400 text-orange-400';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
        }

        el.innerHTML = `
          <div class="w-6 h-6 rounded-full border-2 ${badgeBg} p-1 flex items-center justify-center shadow-md hover:scale-125 transition-transform backdrop-blur-sm">
            ${iconSvg}
          </div>
        `;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (onSelectEndpointFromMap) {
            onSelectEndpointFromMap(props.id, props.name);
          }
          const entity: SelectedMapEntity = { type: 'emergency', data: props };
          setSelectedEntity(entity);
          if (onSelectEntity) onSelectEntity(entity);
          map.easeTo({ center: coords, zoom: 14.5, duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // Signals
    if (layers.signals && (signalsGeoJSON as any)?.features) {
      (signalsGeoJSON as any).features.forEach((feat: any) => {
        const coords = feat.geometry.coordinates as [number, number];
        const props = feat.properties as TrafficSignalProperties;

        const el = document.createElement('div');
        el.className = 'traffic-signal-marker group cursor-pointer';
        el.innerHTML = `
          <div class="w-5 h-5 rounded-full bg-amber-500/20 border-2 border-amber-400 p-0.5 flex items-center justify-center shadow-md hover:scale-125 transition-transform">
            <div class="w-2 h-2 rounded-full bg-amber-400"></div>
          </div>
        `;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const entity: SelectedMapEntity = { type: 'signal', data: props };
          setSelectedEntity(entity);
          if (onSelectEntity) onSelectEntity(entity);
          map.easeTo({ center: coords, zoom: 14.2, duration: 600 });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [layers.signals, layers.hospitals, layers.police, layers.fireStations]);

  // Hub Navigation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHubKey) return;

    const hubCoordinates: Record<string, { center: [number, number]; zoom: number }> = {
      all: { center: HYDERABAD_CENTER, zoom: 11.2 },
      hitech: { center: [78.3808, 17.4504], zoom: 13.8 },
      madhapur: { center: [78.3882, 17.4412], zoom: 14.0 },
      gachibowli: { center: [78.3610, 17.4358], zoom: 13.5 },
      jubilee: { center: [78.4073, 17.4319], zoom: 13.8 },
      banjara: { center: [78.4357, 17.4156], zoom: 13.8 },
      ameerpet: { center: [78.4483, 17.4375], zoom: 14.0 },
      secunderabad: { center: [78.4983, 17.4410], zoom: 13.8 },
      uppal: { center: [78.5602, 17.4019], zoom: 13.8 },
      lbnagar: { center: [78.5522, 17.3458], zoom: 13.8 }
    };

    const target = hubCoordinates[selectedHubKey];
    if (target) {
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        pitch: 40,
        bearing: -10,
        essential: true,
        duration: 1600
      });
    }
  }, [selectedHubKey]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl bg-[#0B0F19]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Selection Prompt Banner */}
      {mapSelectionMode !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/90 text-emerald-200 border border-emerald-600 px-4 py-2 rounded-full font-mono text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Click any intersection or facility on the map to set {mapSelectionMode.toUpperCase()}
        </div>
      )}

      {/* Layer Controls */}
      <LayerControls
        layers={layers}
        onToggleLayer={(k) => setLayers(prev => ({ ...prev, [k]: !prev[k] }))}
        onSetBasemapMode={(m) => setLayers(prev => ({ ...prev, basemapMode: m }))}
        onResetView={() => {
          if (mapRef.current) {
            mapRef.current.flyTo({ center: HYDERABAD_CENTER, zoom: INITIAL_ZOOM, pitch: 35, bearing: -5 });
          }
        }}
      />

      {/* Inspector Panel */}
      <MapInspector
        selectedEntity={selectedEntity}
        onClose={() => {
          setSelectedEntity(null);
          if (mapRef.current && mapRef.current.getLayer('roads-selected')) {
            mapRef.current.setFilter('roads-selected', ['==', 'id', '']);
          }
        }}
      />

      {/* Map Legend Overlay with Emergency Corridor Indicator */}
      <div className="absolute top-4 left-4 z-20 bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-xl text-[11px] text-slate-300 space-y-2 select-none pointer-events-auto max-w-xs hidden sm:block">
        <div className="font-mono uppercase tracking-wider text-red-400 font-bold text-[10px] pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Priority Corridor Layer</span>
          <span className="text-[9px] text-emerald-400 font-bold">ACTIVE</span>
        </div>
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded bg-red-500 shadow-sm shadow-red-500/80 animate-pulse"></span>
            <span className="font-bold text-white">Emergency Priority Corridor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1.5 rounded bg-red-900 border border-red-500"></span>
            <span className="text-red-300">Blocked Road Segment (Avoided)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Origin Staging Waypoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Emergency Destination Waypoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>OSM Traffic Signal Node</span>
          </div>
        </div>
      </div>
    </div>
  );
};
