import React, { useEffect, useRef, useState } from 'react';
import { IncidentReport, EmergencyAlert } from '../types';
import L from 'leaflet';
import {
  Navigation,
  Compass,
  ExternalLink,
  Layers,
  Car,
  Shield,
  Clock,
  MapPin,
  Sparkles,
  Radio,
  ChevronRight
} from 'lucide-react';
import {
  computeTacticalDispatchRoute,
  GHANA_COMMAND_STATIONS,
  CommandStation,
  TacticalRouteResult
} from '../services/googleMapsService';

interface IncidentMapProps {
  incidents: IncidentReport[];
  alerts: EmergencyAlert[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
}

export type BasemapStyle =
  | 'google-streets'
  | 'google-satellite'
  | 'google-hybrid'
  | 'google-terrain'
  | 'mapbox-dark'
  | 'osm';

interface TileConfig {
  url: string;
  attribution: string;
  subdomains?: string[];
  tileSize?: number;
  zoomOffset?: number;
  maxZoom?: number;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  alerts,
  selectedIncident,
  onSelectIncident
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const stationMarkerRef = useRef<L.Marker | null>(null);

  const [currentStyle, setCurrentStyle] = useState<BasemapStyle>('google-hybrid');
  const [selectedStation, setSelectedStation] = useState<CommandStation | null>(null);
  const [activeRoute, setActiveRoute] = useState<TacticalRouteResult | null>(null);
  const [showDispatchHud, setShowDispatchHud] = useState<boolean>(true);

  const getTileConfig = (style: BasemapStyle): TileConfig => {
    switch (style) {
      case 'google-streets':
        return {
          url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps &copy; GhanaPost GPS',
          maxZoom: 20
        };
      case 'google-satellite':
        return {
          url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Earth / Satellite Imagery &copy; CNES / Airbus',
          maxZoom: 20
        };
      case 'google-hybrid':
        return {
          url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps Satellite &copy; Maxar Technologies',
          maxZoom: 20
        };
      case 'google-terrain':
        return {
          url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          attribution: '&copy; Google Maps Topography &copy; USGS',
          maxZoom: 20
        };
      case 'mapbox-dark':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          attribution: '&copy; CartoDB &copy; OpenStreetMap &copy; Ghana National Security',
          maxZoom: 19
        };
      case 'osm':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; GhanaPost GPS',
          maxZoom: 19
        };
    }
  };

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [6.3, -1.0],
      zoom: 7,
      minZoom: 5,
      maxZoom: 20,
      zoomControl: true,
      scrollWheelZoom: true
    });

    const activeTile = getTileConfig(currentStyle);
    const tileLayer = L.tileLayer(activeTile.url, {
      subdomains: activeTile.subdomains || ['a', 'b', 'c'],
      attribution: activeTile.attribution,
      maxZoom: activeTile.maxZoom || 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersRef.current = markersGroup;
    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    const initialTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(initialTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // 2. Handle Basemap Style Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const activeTile = getTileConfig(currentStyle);
    const newLayer = L.tileLayer(activeTile.url, {
      subdomains: activeTile.subdomains || ['a', 'b', 'c'],
      attribution: activeTile.attribution,
      maxZoom: activeTile.maxZoom || 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    }).addTo(map);

    if (markersRef.current) {
      markersRef.current.bringToFront?.();
    }

    tileLayerRef.current = newLayer;
  }, [currentStyle]);

  // 3. Render Incidents, Geofences, & Compute Tactical Dispatch Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // A. Draw Red / Amber Alert Geofence Circles
    alerts.filter(a => a.isActive).forEach(alert => {
      const color = alert.alertType === 'RED' ? '#dc2626' : '#f59e0b';
      
      const circle = L.circle(alert.centerCoordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.22,
        radius: alert.radiusKm * 1000,
        dashArray: '6, 8',
        weight: 2
      }).addTo(markersGroup);

      circle.bindTooltip(`<b>${alert.alertType} ALERT GEOFENCE</b><br/>${alert.title}<br/>Radius: ${alert.radiusKm} km`, {
        sticky: true
      });

      const alertIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 18px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 15px; cursor: pointer;">⚠️</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker(alert.centerCoordinates, { icon: alertIcon })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 220px; padding: 4px;">
            <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${alert.alertType} ALERT</span>
            <h4 style="margin: 6px 0 3px 0; font-weight: bold; font-size: 13px;">${alert.title}</h4>
            <p style="margin: 0; color: #475569;">Last seen: ${alert.lastSeenLocation}</p>
            <p style="margin: 2px 0 0 0; color: #b45309; font-weight: bold;">GhanaPost: ${alert.ghanaPostCode}</p>
          </div>
        `);
    });

    // B. Draw Incident Markers
    incidents.forEach(inc => {
      let pinColor = '#3b82f6';
      let iconEmoji = '🚨';
      if (inc.category === 'CRIMINAL_OFFENSE') { pinColor = '#ef4444'; iconEmoji = '🚨'; }
      if (inc.category === 'DOMESTIC_ABUSE') { pinColor = '#ec4899'; iconEmoji = '🛡️'; }
      if (inc.category === 'GALAMSEY_ENVIRONMENTAL') { pinColor = '#10b981'; iconEmoji = '🌲'; }
      if (inc.category === 'TRAFFIC_RECKLESS') { pinColor = '#f59e0b'; iconEmoji = '🚗'; }
      if (inc.category === 'SANITATION_ZONING') { pinColor = '#8b5cf6'; iconEmoji = '🏙️'; }

      const isSelected = selectedIncident?.id === inc.id;

      const incidentIcon = L.divIcon({
        className: 'custom-incident-icon',
        html: `
          <div style="
            background-color: ${pinColor};
            width: ${isSelected ? '40px' : '32px'};
            height: ${isSelected ? '40px' : '32px'};
            border-radius: 50%;
            border: 3px solid ${isSelected ? '#FCD116' : '#ffffff'};
            box-shadow: 0 4px 16px rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '16px' : '13px'};
            font-weight: bold;
            transition: all 0.2s;
            cursor: pointer;
          ">
            ${iconEmoji}
          </div>
        `,
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 230px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="background: #0B1E38; color: #FCD116; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${inc.trackingCode}</span>
            <span style="color: #64748b; font-size: 11px;">${inc.assignedAgency}</span>
          </div>
          <h4 style="margin: 6px 0 3px 0; font-weight: bold; font-size: 13px;">${inc.title}</h4>
          <p style="margin: 0; color: #475569;">${inc.locationName}</p>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #0284c7; font-weight: bold;">📍 ${inc.ghanaPostCode}</span>
            <span style="color: #10b981; font-weight: bold; font-size: 11px;">Act 772 Sealed</span>
          </div>
        </div>
      `);
    });

    // C. Compute Tactical Route Polyline for Selected Incident
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (stationMarkerRef.current) {
      map.removeLayer(stationMarkerRef.current);
      stationMarkerRef.current = null;
    }

    if (selectedIncident) {
      const route = computeTacticalDispatchRoute(
        selectedIncident.coordinates,
        selectedIncident.locationName,
        selectedIncident.assignedAgency,
        selectedStation || undefined
      );

      setActiveRoute(route);

      // Station Marker
      const stationIcon = L.divIcon({
        className: 'custom-station-icon',
        html: `
          <div style="
            background: linear-gradient(135deg, #1e3a8a, #0284c7);
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 2.5px solid #FCD116;
            box-shadow: 0 4px 18px rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            cursor: pointer;
          ">
            🚔
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const stMarker = L.marker(route.originStation.coordinates, { icon: stationIcon })
        .addTo(map)
        .bindTooltip(`<b>DISPATCH ORIGIN</b><br/>${route.originStation.name}<br/>Units: ${route.originStation.patrolUnitsAvailable}`, {
          sticky: true
        });

      stationMarkerRef.current = stMarker;

      // Draw Glowing Tactical Route Polyline
      const polyline = L.polyline(route.routePolyline, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '8, 12'
      }).addTo(map);

      routeLayerRef.current = polyline;

      // Fit bounds to show both station and destination
      const bounds = L.latLngBounds([
        route.originStation.coordinates,
        selectedIncident.coordinates
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else {
      setActiveRoute(null);
    }
  }, [incidents, alerts, selectedIncident, selectedStation]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px] z-[1]" />
      
      {/* Google Maps Layer Switcher (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-2xl">
        <div className="flex items-center space-x-1.5 px-2 py-1 text-[11px] font-extrabold text-ghana-gold border-r border-slate-800 mr-1">
          <Layers className="w-3.5 h-3.5" />
          <span>MAP PLATFORM</span>
        </div>

        <button
          onClick={() => setCurrentStyle('google-hybrid')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'google-hybrid'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Google Maps Hybrid (Satellite + Roads)"
        >
          Google Hybrid
        </button>
        <button
          onClick={() => setCurrentStyle('google-satellite')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'google-satellite'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Google Earth Pure Satellite"
        >
          Satellite
        </button>
        <button
          onClick={() => setCurrentStyle('google-streets')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'google-streets'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Google Maps Standard Streets"
        >
          Google Streets
        </button>
        <button
          onClick={() => setCurrentStyle('google-terrain')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'google-terrain'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Google Topographic Terrain"
        >
          Terrain
        </button>
        <button
          onClick={() => setCurrentStyle('mapbox-dark')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'mapbox-dark'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Tactical Dark Mode"
        >
          Night Ops
        </button>
        <button
          onClick={() => setCurrentStyle('osm')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'osm'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="OpenStreetMap Standard"
        >
          OSM
        </button>
      </div>

      {/* TACTICAL PATROL DISPATCH & GOOGLE MAPS ROUTE HUD (Top Left Overlay) */}
      {selectedIncident && activeRoute && showDispatchHud && (
        <div className="absolute top-3 left-3 z-[400] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 text-xs space-y-3 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold text-white text-[11px] tracking-wide">
                TACTICAL CAD PATROL DISPATCH
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {selectedIncident.trackingCode}
            </span>
          </div>

          {/* Station Selector Dropdown */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              DISPATCH ORIGIN (POLICE COMMAND DEPOT):
            </label>
            <select
              value={selectedStation?.id || activeRoute.originStation.id}
              onChange={(e) => {
                const found = GHANA_COMMAND_STATIONS.find(s => s.id === e.target.value);
                if (found) setSelectedStation(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              {GHANA_COMMAND_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.region})
                </option>
              ))}
            </select>
          </div>

          {/* Tactical ETA & Distance Metrics */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold">SIRENS ETA</p>
                <p className="text-sm font-extrabold text-white font-mono">
                  {activeRoute.emergencySirensEtaMinutes} mins
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold">DISTANCE</p>
                <p className="text-sm font-extrabold text-blue-400 font-mono">
                  {activeRoute.distanceKm} km
                </p>
              </div>
            </div>
          </div>

          {/* Primary Highway Transit */}
          <p className="text-[11px] text-slate-300 font-medium flex items-center space-x-1">
            <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="line-clamp-1">{activeRoute.primaryHighway}</span>
          </p>

          {/* Direct Google Maps Action Buttons */}
          <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
            <a
              href={activeRoute.googleMapsDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-lg shadow-blue-600/20"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps GPS</span>
            </a>

            <a
              href={activeRoute.googleStreetViewUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition"
              title="Open Google Street View"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Street View</span>
            </a>
          </div>
        </div>
      )}

      {/* Map Floating Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 shadow-2xl">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="font-extrabold text-slate-200 tracking-wider text-[11px]">GHANA GEOSPATIAL RADAR</span>
          <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
            GOOGLE MAPS HD
          </span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span>Crime / Robbery (Police CID)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
          <span>Domestic Abuse (DOVVSU)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span>Galamsey / Illegal Mining (EPA)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span>Traffic Offense (MTTD)</span>
        </div>
        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
          <span className="text-cyan-400 font-bold flex items-center space-x-1">
            <span>🚔</span>
            <span>Tactical Dispatch Route</span>
          </span>
          <span className="text-amber-400 font-bold">⚠️ Geofence</span>
        </div>
      </div>
    </div>
  );
};
