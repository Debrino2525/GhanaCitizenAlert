import React, { useEffect, useRef, useState } from 'react';
import { IncidentReport, EmergencyAlert } from '../types';
import L from 'leaflet';
import {
  Navigation,
  Compass,
  Layers,
  Car,
  Radio,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw
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
  const tileErrorCountRef = useRef<number>(0);

  const [currentStyle, setCurrentStyle] = useState<BasemapStyle>('google-hybrid');
  const [selectedStation, setSelectedStation] = useState<CommandStation | null>(null);
  const [activeRoute, setActiveRoute] = useState<TacticalRouteResult | null>(null);

  // Responsive and collapsible overlay states
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState<boolean>(false);
  const [isLayerDropdownOpen, setIsLayerDropdownOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTileErrorNotice, setShowTileErrorNotice] = useState<boolean>(false);

  /**
   * Note: Direct mt1.google.com tile layer fetching is for prototyping.
   * Direct use of google.com tile endpoints without official API keys may violate Google Terms of Service.
   * The official Google Maps Tile API or a keyed provider is recommended for production deployments.
   */
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

  const layerOptions: { id: BasemapStyle; label: string; badge: string }[] = [
    { id: 'google-hybrid', label: 'Hybrid Satellite', badge: 'HD' },
    { id: 'google-satellite', label: 'Pure Satellite', badge: 'SAT' },
    { id: 'google-streets', label: 'Standard Streets', badge: 'MAP' },
    { id: 'google-terrain', label: 'Topography', badge: 'TER' },
    { id: 'mapbox-dark', label: 'Night Ops (Dark)', badge: 'TAC' },
    { id: 'osm', label: 'OpenStreetMap', badge: 'OSM' }
  ];

  // 1. Initialize Leaflet Map Instance
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
      zoomControl: false,
      scrollWheelZoom: true
    });

    // Custom repositioned zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const activeTile = getTileConfig(currentStyle);
    tileErrorCountRef.current = 0;
    const tileLayer = L.tileLayer(activeTile.url, {
      subdomains: activeTile.subdomains || ['a', 'b', 'c'],
      attribution: activeTile.attribution,
      maxZoom: activeTile.maxZoom || 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    });

    tileLayer.on('tileerror', () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= 4) {
        setShowTileErrorNotice(true);
      }
    });

    tileLayer.addTo(map);
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

    setShowTileErrorNotice(false);
    tileErrorCountRef.current = 0;
    const activeTile = getTileConfig(currentStyle);
    const newLayer = L.tileLayer(activeTile.url, {
      subdomains: activeTile.subdomains || ['a', 'b', 'c'],
      attribution: activeTile.attribution,
      maxZoom: activeTile.maxZoom || 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    });

    newLayer.on('tileerror', () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= 4) {
        setShowTileErrorNotice(true);
      }
    });

    newLayer.addTo(map);

    if (markersRef.current) {
      markersRef.current.bringToFront?.();
    }

    tileLayerRef.current = newLayer;
  }, [currentStyle]);

  // Trigger invalidateSize whenever fullscreen state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

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
      const isUrgent = inc.severity === 'RED' || inc.severity === 'HIGH' || inc.severity === 'CRITICAL';

      const incidentIcon = L.divIcon({
        className: 'custom-incident-icon',
        html: `
          <div class="relative flex items-center justify-center">
            ${isUrgent || isSelected ? `
              <span class="absolute inline-flex rounded-full ${isSelected ? 'w-12 h-12 bg-amber-400/40 border border-amber-400/80 animate-ping' : 'w-10 h-10 bg-red-500/30 animate-ping'}"></span>
            ` : ''}
            <div style="
              background-color: ${pinColor};
              width: ${isSelected ? '38px' : '30px'};
              height: ${isSelected ? '38px' : '30px'};
              border-radius: 50%;
              border: 2.5px solid ${isSelected ? '#FCD116' : '#ffffff'};
              box-shadow: 0 4px 18px ${isSelected ? 'rgba(252, 209, 22, 0.6)' : 'rgba(0,0,0,0.8)'};
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: ${isSelected ? '15px' : '12px'};
              font-weight: bold;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
            " class="relative z-10 ${isUrgent ? 'marker-pulse-red' : ''}">
              ${iconEmoji}
            </div>
          </div>
        `,
        iconSize: [isSelected ? 48 : 36, isSelected ? 48 : 36],
        iconAnchor: [isSelected ? 24 : 18, isSelected ? 24 : 18]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #0f172a; min-width: 230px; padding: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="background: #0B1E38; color: #FCD116; padding: 2px 7px; border-radius: 6px; font-weight: 800; font-family: 'JetBrains Mono', monospace; font-size: 10px;">${inc.trackingCode}</span>
            <span style="color: #475569; font-size: 11px; font-weight: 700;">${inc.assignedAgency}</span>
          </div>
          <h4 style="margin: 7px 0 4px 0; font-weight: 800; font-size: 13px; line-height: 1.3;">${inc.title}</h4>
          <p style="margin: 0; color: #475569; font-size: 11px;">${inc.locationName}</p>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #0284c7; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 11px;">📍 ${inc.ghanaPostCode}</span>
            <span style="color: #059669; font-weight: 700; font-size: 10px; background: #ecfdf5; padding: 1px 5px; border-radius: 4px;">Act 772 Sealed</span>
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
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 2px solid #FCD116;
            box-shadow: 0 4px 16px rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 15px;
            cursor: pointer;
          ">
            🚔
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
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
        weight: 4.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '8, 10'
      }).addTo(map);

      routeLayerRef.current = polyline;

      // Fit bounds smoothly with flyToBounds
      const bounds = L.latLngBounds([
        route.originStation.coordinates,
        selectedIncident.coordinates
      ]);
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 0.75 });
    } else {
      setActiveRoute(null);
    }
  }, [incidents, alerts, selectedIncident, selectedStation]);

  const currentLayerObj = layerOptions.find(l => l.id === currentStyle) || layerOptions[0];

  return (
    <div className={`relative isolate w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 transition-all ${
      isFullscreen ? 'fixed inset-0 z-modal rounded-none border-none' : ''
    }`}>
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-map" />

      {/* TOP-LEFT CORNER OVERLAY CONTAINER */}
      <div className="absolute top-3 left-3 z-map-ui pointer-events-none flex flex-col gap-2 max-w-[min(24rem,calc(100%-1.5rem))]">
        {selectedIncident && activeRoute && (
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-3.5 text-xs shadow-2xl space-y-2.5 transition-all">
            {/* Header / Collapse Bar */}
            <div 
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              className="flex items-center justify-between cursor-pointer select-none gap-2 pb-1.5 border-b border-slate-800/80"
              title="Click to expand/collapse CAD dispatch route"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-extrabold text-white text-[11px] tracking-wide truncate">
                  TACTICAL CAD DISPATCH
                </span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                  {selectedIncident.trackingCode}
                </span>
                <button 
                  aria-label={isHudCollapsed ? "Expand Tactical Dispatch HUD" : "Collapse Tactical Dispatch HUD"}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  {isHudCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsed One-Line Summary */}
            {isHudCollapsed ? (
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                <span className="text-amber-400 font-bold font-mono">Sirens: {activeRoute.emergencySirensEtaMinutes}m</span>
                <span className="text-blue-400 font-mono">({activeRoute.distanceKm} km)</span>
                <span className="text-slate-400 truncate max-w-[130px] font-mono">{activeRoute.originStation.name}</span>
              </div>
            ) : (
              <>
                {/* Station Selector Dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    POLICE COMMAND ORIGIN:
                  </label>
                  <select
                    value={selectedStation?.id || activeRoute.originStation.id}
                    onChange={(e) => {
                      const found = GHANA_COMMAND_STATIONS.find(s => s.id === e.target.value);
                      if (found) setSelectedStation(found);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {GHANA_COMMAND_STATIONS.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} ({station.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tactical ETA & Distance Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold">SIRENS ETA</p>
                      <p className="text-xs font-extrabold text-white font-mono">
                        {activeRoute.emergencySirensEtaMinutes} mins
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Navigation className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold">DISTANCE</p>
                      <p className="text-xs font-extrabold text-blue-400 font-mono">
                        {activeRoute.distanceKm} km
                      </p>
                    </div>
                  </div>
                </div>

                {/* Corridor */}
                <p className="text-[11px] text-slate-300 font-medium flex items-center space-x-1">
                  <Car className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{activeRoute.primaryHighway}</span>
                </p>

                {/* Navigation Deep Links */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                  <a
                    href={activeRoute.googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-md shadow-blue-600/20"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Google Maps GPS</span>
                  </a>

                  <a
                    href={activeRoute.googleStreetViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition"
                    title="Open Scene in Google Street View"
                  >
                    <Compass className="w-3 h-3" />
                    <span className="hidden sm:inline">Street View</span>
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* TOP-RIGHT CORNER OVERLAY CONTAINER (Layer Selector & Fullscreen Controls) */}
      <div className="absolute top-3 right-3 z-map-ui pointer-events-none flex items-center gap-2">
        {/* Layer Selector Dropdown */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setIsLayerDropdownOpen(!isLayerDropdownOpen)}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold flex items-center space-x-1.5 shadow-xl hover:bg-slate-800 transition"
            title="Switch Geospatial Map Layers"
          >
            <Layers className="w-3.5 h-3.5 text-ghana-gold" />
            <span className="hidden sm:inline font-bold">{currentLayerObj.label}</span>
            <span className="font-mono text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded sm:hidden">{currentLayerObj.badge}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLayerDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-1 shadow-2xl z-dropdown animate-fade-in space-y-0.5">
              {layerOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCurrentStyle(opt.id);
                    setIsLayerDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-medium flex items-center justify-between transition ${
                    currentStyle === opt.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                    currentStyle === opt.id ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {opt.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen Map Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-2 text-slate-300 hover:text-white hover:bg-slate-800 shadow-xl transition"
          title={isFullscreen ? 'Exit Fullscreen Map' : 'Expand Map Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen Map' : 'Expand Map Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* TILE ERROR / OFFLINE SATELLITE NOTICE */}
      {showTileErrorNotice && (
        <div className="absolute top-14 right-3 z-map-ui pointer-events-auto bg-amber-950/90 backdrop-blur-md border border-amber-600/60 rounded-xl p-2.5 max-w-xs text-xs text-amber-200 shadow-2xl animate-fade-in flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="text-[11px] leading-tight font-medium">
              Satellite tiles unavailable. Switch to Night Ops or OSM for active tracking.
            </p>
            <button
              onClick={() => {
                setCurrentStyle('mapbox-dark');
                setShowTileErrorNotice(false);
              }}
              className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch to Night Ops</span>
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT CORNER OVERLAY CONTAINER (Ghana Geospatial Radar Legend) */}
      <div className="absolute bottom-3 left-3 z-map-ui pointer-events-none flex flex-col gap-2">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-2.5 text-xs shadow-2xl space-y-1.5 max-w-[260px] transition-all">
          <div 
            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
            className="flex items-center justify-between cursor-pointer select-none pb-1 border-b border-slate-800 gap-2"
            title="Toggle Map Radar Legend"
          >
            <span className="font-extrabold text-slate-200 tracking-wider text-[10px] uppercase">
              GHANA GEOSPATIAL RADAR
            </span>
            <button aria-label="Toggle Legend" className="text-slate-400 hover:text-white">
              {isLegendCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {!isLegendCollapsed && (
            <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 text-[11px] pr-1">
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444] shrink-0" />
                <span className="truncate">Crime / Robbery (CID)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899] shrink-0" />
                <span className="truncate">Domestic Abuse (DOVVSU)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] shrink-0" />
                <span className="truncate">Galamsey / Mining (EPA)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] shrink-0" />
                <span className="truncate">Traffic Offense (MTTD)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_#8b5cf6] shrink-0" />
                <span className="truncate">Sanitation (MMDA)</span>
              </div>
              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
                <span className="text-cyan-400 font-bold flex items-center space-x-1">
                  <span>🚔</span>
                  <span>CAD Route</span>
                </span>
                <span className="text-amber-400 font-bold">⚠️ Geofence</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
