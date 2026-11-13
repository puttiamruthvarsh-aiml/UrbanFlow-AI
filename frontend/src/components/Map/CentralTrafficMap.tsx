import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  SelectedMapEntity, 
  LayerVisibilityState, 
  ActiveRole,
  RoadSegmentProperties,
  JunctionProperties,
  TrafficSignalProperties,
  EmergencyFacilityProperties 
} from '../../types/network';
import { LayerControls } from './LayerControls';
import { MapInspector } from './MapInspector';

// Import bundled GeoJSON datasets for guaranteed 0-latency instant loading
import roadsGeoJSON from '../../data/hyderabad_roads.json';
import junctionsGeoJSON from '../../data/junctions_geo.json';
import signalsGeoJSON from '../../data/traffic_signals_geo.json';
import emergencyGeoJSON from '../../data/emergency_locations_geo.json';

interface CentralTrafficMapProps {
  currentRole: ActiveRole;
  selectedHubKey?: string;
  onSelectEntity?: (entity: SelectedMapEntity) => void;
  roadConditions?: Record<string, { status: 'BLOCKED' | 'CONGESTED'; incident_id?: string }>;
  routeGeoJSON?: any;
}

const HYDERABAD_CENTER: [number, number] = [78.4350, 17.4200];
const INITIAL_ZOOM = 11.4;

export const CentralTrafficMap: React.FC<CentralTrafficMapProps> = ({
  currentRole,
  selectedHubKey,
  onSelectEntity,
  roadConditions,
  routeGeoJSON
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);

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

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Basemap style specification using open Esri World Dark Gray Canvas and OpenStreetMap
    // No API key required, no watermarks, full street & neighbourhood label coverage
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
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      },
      layers: [
        {
          id: 'esri-dark-base-layer',
          type: 'raster',
          source: 'esri-dark-base',
          minzoom: 0,
          maxzoom: 19,
          layout: {
            visibility: 'visible'
          }
        },
        {
          id: 'osm-streets-layer',
          type: 'raster',
          source: 'osm-streets',
          minzoom: 0,
          maxzoom: 19,
          layout: {
            visibility: 'none'
          }
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

    // Add navigation controls (zoom, pitch, rotation)
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // 1. Add Roads GeoJSON Source
      map.addSource('hyderabad-roads', {
        type: 'geojson',
        data: roadsGeoJSON as any
      });

      // 2. Add Junctions GeoJSON Source
      map.addSource('hyderabad-junctions', {
        type: 'geojson',
        data: junctionsGeoJSON as any
      });

      // Layer 1: Road Glow Effect (Cyan for motorways/trunk)
      map.addLayer({
        id: 'roads-glow',
        type: 'line',
        source: 'hyderabad-roads',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'highway'],
            'motorway', '#06B6D4',
            'trunk', '#3B82F6',
            'primary', '#60A5FA',
            '#64748B'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            14, 9,
            16, 14
          ],
          'line-opacity': 0.35,
          'line-blur': 3
        }
      });

      // Layer 2: Main Road Lines by Classification
      map.addLayer({
        id: 'roads-layer',
        type: 'line',
        source: 'hyderabad-roads',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'highway'],
            'motorway', '#06B6D4',  // Cyan for ORR & PVNR Expressway
            'trunk', '#3B82F6',     // Blue for NH 65 & Inner Ring Road
            'primary', '#60A5FA',   // Light Blue for Hitech / Jubilee Hills Corridors
            'secondary', '#94A3B8', // Slate for arterial connectors
            '#64748B'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, [
              'match',
              ['get', 'highway'],
              'motorway', 3.5,
              'trunk', 2.8,
              'primary', 2.2,
              1.6
            ],
            14, [
              'match',
              ['get', 'highway'],
              'motorway', 7.0,
              'trunk', 5.5,
              'primary', 4.5,
              3.0
            ]
          ],
          'line-opacity': 0.95
        }
      });

      // Layer 2.1: Congested Road Highlight Layer
      map.addLayer({
        id: 'roads-congested',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['==', 'id', ''],
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#F59E0B',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 5,
            14, 9,
            16, 14
          ],
          'line-opacity': 0.95
        }
      });

      // Layer 2.2: Blocked Road Glow Layer
      map.addLayer({
        id: 'roads-blocked-glow',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['==', 'id', ''],
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#EF4444',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 8,
            14, 15,
            16, 22
          ],
          'line-opacity': 0.7,
          'line-blur': 4
        }
      });

      // Layer 2.3: Blocked Road Line Layer
      map.addLayer({
        id: 'roads-blocked',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['==', 'id', ''],
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#EF4444',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 5,
            14, 9,
            16, 14
          ],
          'line-opacity': 1.0
        }
      });

      // Layer 3: Selected Road Highlight Layer
      map.addLayer({
        id: 'roads-selected',
        type: 'line',
        source: 'hyderabad-roads',
        filter: ['==', 'id', ''],
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FACC15', // Neon gold highlight
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 6,
            14, 11
          ],
          'line-opacity': 0.95
        }
      });

      // User Dynamic Route Source and Layers
      map.addSource('user-route-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'user-route-glow',
        type: 'line',
        source: 'user-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06B6D4',
          'line-width': 10,
          'line-opacity': 0.6,
          'line-blur': 4
        }
      });

      map.addLayer({
        id: 'user-route-line',
        type: 'line',
        source: 'user-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#38BDF8',
          'line-width': 5,
          'line-opacity': 0.95
        }
      });

      // Layer 4: Intersections / Junctions
      map.addLayer({
        id: 'junctions-circle',
        type: 'circle',
        source: 'hyderabad-junctions',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3.5,
            14, 6.5
          ],
          'circle-color': [
            'case',
            ['get', 'has_signal'],
            '#F59E0B', // Amber if traffic signal
            '#38BDF8'  // Cyan-blue if standard intersection
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0B0F19',
          'circle-opacity': 0.9
        }
      });

      // Layer 5: Esri Dark Reference Layer (Geographical & Street Labels on top of basemap)
      map.addLayer({
        id: 'esri-dark-ref-layer',
        type: 'raster',
        source: 'esri-dark-reference',
        minzoom: 0,
        maxzoom: 19,
        layout: {
          visibility: 'visible'
        }
      });

      // Road Segment Click Listener
      map.on('click', 'roads-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as RoadSegmentProperties;

        // Highlight selected road
        map.setFilter('roads-selected', ['==', 'id', props.id]);

        const entity: SelectedMapEntity = { type: 'road', data: props };
        setSelectedEntity(entity);
        if (onSelectEntity) onSelectEntity(entity);
      });

      // Cursor changes on hover
      map.on('mouseenter', 'roads-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'roads-layer', () => {
        map.getCanvas().style.cursor = '';
      });

      // Junction Click Listener
      map.on('click', 'junctions-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as JunctionProperties;

        const entity: SelectedMapEntity = { type: 'junction', data: props };
        setSelectedEntity(entity);
        if (onSelectEntity) onSelectEntity(entity);

        // Center smoothly on junction
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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers (Traffic Signals, Hospitals, Police, Fire Stations)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Traffic Signals Markers
    if (layers.signals && (signalsGeoJSON as any)?.features) {
      (signalsGeoJSON as any).features.forEach((feat: any) => {
        const coords = feat.geometry.coordinates as [number, number];
        const props = feat.properties as TrafficSignalProperties;

        const el = document.createElement('div');
        el.className = 'traffic-signal-marker group cursor-pointer';
        el.innerHTML = `
          <div class="w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-400 p-1 flex items-center justify-center shadow-lg shadow-amber-500/40 hover:scale-125 transition-transform">
            <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
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

    // 2. Emergency Facilities Markers (Hospitals, Police, Fire Stations)
    if ((emergencyGeoJSON as any)?.features) {
      (emergencyGeoJSON as any).features.forEach((feat: any) => {
        const coords = feat.geometry.coordinates as [number, number];
        const props = feat.properties as EmergencyFacilityProperties;
        const cat = props.category;

        // Check layer visibility
        if (cat === 'hospital' && !layers.hospitals) return;
        if (cat === 'police' && !layers.police) return;
        if (cat === 'fire_station' && !layers.fireStations) return;

        const el = document.createElement('div');
        el.className = 'emergency-facility-marker group cursor-pointer';

        let badgeBg = 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-emerald-500/40';
        let iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';

        if (cat === 'police') {
          badgeBg = 'bg-indigo-500/20 border-indigo-400 text-indigo-400 shadow-indigo-500/40';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
        } else if (cat === 'fire_station') {
          badgeBg = 'bg-orange-500/20 border-orange-400 text-orange-400 shadow-orange-500/40';
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
        }

        el.innerHTML = `
          <div class="w-7 h-7 rounded-full border-2 ${badgeBg} p-1 flex items-center justify-center shadow-lg hover:scale-125 transition-transform backdrop-blur-sm">
            ${iconSvg}
          </div>
        `;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
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
  }, [layers.signals, layers.hospitals, layers.police, layers.fireStations]);

  // Handle Layer Visibility Toggles on MapLibre map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('roads-layer')) {
      map.setLayoutProperty('roads-layer', 'visibility', layers.roads ? 'visible' : 'none');
    }
    if (map.getLayer('roads-glow')) {
      map.setLayoutProperty('roads-glow', 'visibility', layers.roads ? 'visible' : 'none');
    }
    if (map.getLayer('junctions-circle')) {
      map.setLayoutProperty('junctions-circle', 'visibility', layers.junctions ? 'visible' : 'none');
    }

    // Basemap switcher: Dark Canvas vs OSM Streets
    if (map.getLayer('esri-dark-base-layer')) {
      map.setLayoutProperty('esri-dark-base-layer', 'visibility', layers.basemapMode === 'dark' ? 'visible' : 'none');
    }
    if (map.getLayer('osm-streets-layer')) {
      map.setLayoutProperty('osm-streets-layer', 'visibility', layers.basemapMode === 'osm' ? 'visible' : 'none');
    }

    // Geographical & street labels
    if (map.getLayer('esri-dark-ref-layer')) {
      map.setLayoutProperty('esri-dark-ref-layer', 'visibility', (layers.labels && layers.basemapMode === 'dark') ? 'visible' : 'none');
    }
  }, [layers.roads, layers.junctions, layers.basemapMode, layers.labels]);

  // Dynamically update Blocked and Congested road highlight layers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRoadConditionFilters = () => {
      const blockedIds: string[] = [];
      const congestedIds: string[] = [];

      if (roadConditions) {
        Object.entries(roadConditions).forEach(([roadId, cond]) => {
          if (cond && cond.status === 'BLOCKED') {
            blockedIds.push(roadId);
          } else if (cond && cond.status === 'CONGESTED') {
            congestedIds.push(roadId);
          }
        });
      }

      if (map.getLayer('roads-blocked')) {
        const blockedFilter = blockedIds.length > 0
          ? ['in', 'id', ...blockedIds]
          : ['==', 'id', ''];
        map.setFilter('roads-blocked', blockedFilter as any);
      }
      if (map.getLayer('roads-blocked-glow')) {
        const blockedFilter = blockedIds.length > 0
          ? ['in', 'id', ...blockedIds]
          : ['==', 'id', ''];
        map.setFilter('roads-blocked-glow', blockedFilter as any);
      }
      if (map.getLayer('roads-congested')) {
        const congestedFilter = congestedIds.length > 0
          ? ['in', 'id', ...congestedIds]
          : ['==', 'id', ''];
        map.setFilter('roads-congested', congestedFilter as any);
      }
    };

    if (map.isStyleLoaded()) {
      applyRoadConditionFilters();
    } else {
      map.once('load', applyRoadConditionFilters);
    }
  }, [roadConditions]);

  // Handle Hub Teleportation / Fly-To
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

  // Dynamically update Route GeoJSON on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyRoute = () => {
      const source = map.getSource('user-route-source') as maplibregl.GeoJSONSource;
      if (!source) return;

      // Clear existing route waypoint markers
      routeMarkersRef.current.forEach(m => m.remove());
      routeMarkersRef.current = [];

      if (routeGeoJSON && (routeGeoJSON.features?.length > 0 || routeGeoJSON.type === 'Feature')) {
        const featCollection = routeGeoJSON.type === 'FeatureCollection' 
          ? routeGeoJSON 
          : { type: 'FeatureCollection', features: [routeGeoJSON] };
        source.setData(featCollection);

        // Smoothly fit bounds and place waypoint markers
        const coords: [number, number][] = [];
        featCollection.features.forEach((f: any) => {
          if (f.geometry?.type === 'LineString') {
            f.geometry.coordinates.forEach((pt: [number, number]) => coords.push(pt));
          }
        });

        if (coords.length > 1) {
          const bounds = new maplibregl.LngLatBounds();
          coords.forEach(pt => bounds.extend(pt));
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: 15,
            duration: 900
          });

          // 1. Origin Waypoint Marker (Green)
          const startEl = document.createElement('div');
          startEl.className = 'route-start-marker';
          startEl.innerHTML = `
            <div class="flex items-center gap-1 bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-lg shadow-emerald-950/80 backdrop-blur-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>START</span>
            </div>
          `;
          const startMarker = new maplibregl.Marker({ element: startEl, anchor: 'bottom' })
            .setLngLat(coords[0])
            .addTo(map);
          routeMarkersRef.current.push(startMarker);

          // 2. Destination Waypoint Marker (Red)
          const endEl = document.createElement('div');
          endEl.className = 'route-end-marker';
          endEl.innerHTML = `
            <div class="flex items-center gap-1 bg-red-950/90 border-2 border-red-400 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-lg shadow-red-950/80 backdrop-blur-sm">
              <span class="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span>DEST</span>
            </div>
          `;
          const endMarker = new maplibregl.Marker({ element: endEl, anchor: 'bottom' })
            .setLngLat(coords[coords.length - 1])
            .addTo(map);
          routeMarkersRef.current.push(endMarker);
        }
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    if (map.isStyleLoaded()) {
      applyRoute();
    } else {
      map.once('load', applyRoute);
    }
  }, [routeGeoJSON]);

  const handleToggleLayer = (key: keyof LayerVisibilityState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetBasemapMode = (mode: 'dark' | 'osm') => {
    setLayers(prev => ({ ...prev, basemapMode: mode }));
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: HYDERABAD_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: 35,
        bearing: -5,
        duration: 1200
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl bg-[#0B0F19]">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Layer Visibility Floating Controls */}
      <LayerControls
        layers={layers}
        onToggleLayer={handleToggleLayer}
        onSetBasemapMode={handleSetBasemapMode}
        onResetView={handleResetView}
      />

      {/* Inspector Panel for Clicked Roads/Junctions/Signals/Emergency Facilities */}
      <MapInspector
        selectedEntity={selectedEntity}
        onClose={() => {
          setSelectedEntity(null);
          if (mapRef.current && mapRef.current.getLayer('roads-selected')) {
            mapRef.current.setFilter('roads-selected', ['==', 'id', '']);
          }
        }}
      />

      {/* Map Legend Overlay */}
      <div className="absolute top-4 left-4 z-20 bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-xl text-[11px] text-slate-300 space-y-2 select-none pointer-events-auto max-w-xs hidden sm:block">
        <div className="font-mono uppercase tracking-wider text-cyan-400 font-bold text-[10px] pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Hyderabad Road Hierarchy</span>
          <span className="text-[9px] text-slate-400">Step 1 Network</span>
        </div>
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 rounded bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            <span>Motorway (ORR, PVNR Expressway)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 rounded bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            <span>Trunk / NH 65 &amp; Inner Ring Road</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 rounded bg-blue-400"></span>
            <span>Primary Arterials (Hitech, Jubilee, Secunderabad)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 rounded bg-slate-400"></span>
            <span>Secondary Connecting Roads</span>
          </div>
          <div className="pt-1.5 border-t border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-1.5 rounded bg-red-500 shadow-sm shadow-red-500/80 animate-pulse"></span>
              <span className="text-red-400 font-semibold">Blocked Road (Accident / Hazard)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1.5 rounded bg-amber-400 shadow-sm shadow-amber-400/80"></span>
              <span className="text-amber-400 font-semibold">Congested Flow (Bottleneck)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
