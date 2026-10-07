import React, { useEffect, useRef, useState } from 'react';
import { IncidentReport, EmergencyAlert } from '../types';
import L from 'leaflet';

interface IncidentMapProps {
  incidents: IncidentReport[];
  alerts: EmergencyAlert[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
}

type BasemapStyle = 'mapbox-dark' | 'mapbox-streets' | 'mapbox-satellite' | 'mapbox-nav' | 'osm';

interface TileConfig {
  url: string;
  attribution: string;
  subdomains?: string[];
  tileSize?: number;
  zoomOffset?: number;
}

// Built-in Mapbox access token decoded safely at runtime
const DEFAULT_MAPBOX_TOKEN = typeof atob !== 'undefined'
  ? atob('cGsuZXlKMUlqb2ljbUZ3Y0dsaGFERXdOeUlzSW1FaU9pSmpiWFY1TVROamNUVXdOR0kwTW5oeGNtTmlhWGMxWnpZMkluMC5NUGVMTVRVRjF4VDFuRE5uUGMtM1hR')
  : '';

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
  const [currentStyle, setCurrentStyle] = useState<BasemapStyle>('mapbox-dark');

  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string) || DEFAULT_MAPBOX_TOKEN;

  const getTileConfig = (style: BasemapStyle): TileConfig => {
    if (mapboxToken) {
      if (style === 'mapbox-dark') {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
          attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; GhanaPost GPS',
          tileSize: 512,
          zoomOffset: -1
        };
      }
      if (style === 'mapbox-streets') {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
          attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; GhanaPost GPS',
          tileSize: 512,
          zoomOffset: -1
        };
      }
      if (style === 'mapbox-satellite') {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
          attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1
        };
      }
      if (style === 'mapbox-nav') {
        return {
          url: `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
          attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
          tileSize: 512,
          zoomOffset: -1
        };
      }
    }

    // High Quality OpenStreetMap Fallback
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; GhanaPost GPS'
    };
  };

  // 1. Initialize Map Instance (Only once per container mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove any leftover instance if re-mounting in StrictMode
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
      maxZoom: 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Continuous resize observer to handle flexbox animations & tab changes
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
  }, []); // Run on mount/unmount

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
      maxZoom: 20,
      tileSize: activeTile.tileSize || 256,
      zoomOffset: activeTile.zoomOffset || 0
    }).addTo(map);

    // Keep markers on top
    if (markersRef.current) {
      markersRef.current.bringToFront?.();
    }

    tileLayerRef.current = newLayer;
  }, [currentStyle]);

  // 3. Render Geofences & Incident Markers when data changes
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
        fillOpacity: 0.24,
        radius: alert.radiusKm * 1000,
        dashArray: '6, 8',
        weight: 2
      }).addTo(markersGroup);

      circle.bindTooltip(`<b>${alert.alertType} ALERT GEOFENCE</b><br/>${alert.title}<br/>Radius: ${alert.radiusKm} km`, {
        sticky: true
      });

      const alertIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 16px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; cursor: pointer;">⚠️</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
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
            width: ${isSelected ? '38px' : '30px'};
            height: ${isSelected ? '38px' : '30px'};
            border-radius: 50%;
            border: 3px solid ${isSelected ? '#FCD116' : '#ffffff'};
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '15px' : '13px'};
            font-weight: bold;
            transition: all 0.2s;
            cursor: pointer;
          ">
            ${iconEmoji}
          </div>
        `,
        iconSize: [isSelected ? 38 : 30, isSelected ? 38 : 30],
        iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 230px; padding: 4px;">
          <span style="background: #0B1E38; color: #FCD116; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${inc.trackingCode}</span>
          <span style="color: #64748b; margin-left: 6px; font-size: 11px;">${inc.assignedAgency}</span>
          <h4 style="margin: 6px 0 3px 0; font-weight: bold; font-size: 13px;">${inc.title}</h4>
          <p style="margin: 0; color: #475569;">${inc.locationName}</p>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <span style="color: #0284c7; font-weight: bold;">📍 ${inc.ghanaPostCode}</span>
            <span style="color: #64748b;">${inc.media.length} 60s Evidence</span>
          </div>
        </div>
      `);
    });

    if (selectedIncident) {
      map.setView(selectedIncident.coordinates, 13, { animate: true });
    }
  }, [incidents, alerts, selectedIncident]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-[1]" />
      
      {/* Mapbox Style Switcher (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 flex space-x-1 shadow-xl">
        <button
          onClick={() => setCurrentStyle('mapbox-dark')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'mapbox-dark'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Mapbox Dark Tactical"
        >
          Mapbox Dark
        </button>
        <button
          onClick={() => setCurrentStyle('mapbox-streets')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'mapbox-streets'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Mapbox Streets v12"
        >
          Streets
        </button>
        <button
          onClick={() => setCurrentStyle('mapbox-satellite')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'mapbox-satellite'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Mapbox Satellite Imagery"
        >
          Satellite
        </button>
        <button
          onClick={() => setCurrentStyle('mapbox-nav')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'mapbox-nav'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Mapbox Navigation Night"
        >
          Nav Night
        </button>
        <button
          onClick={() => setCurrentStyle('osm')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
            currentStyle === 'osm'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="OpenStreetMap Standard"
        >
          OSM
        </button>
      </div>

      {/* Map Floating Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 shadow-2xl">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="font-extrabold text-slate-200 tracking-wider text-[11px]">GHANA MAPBOX RADAR</span>
          <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
            {mapboxToken ? 'MAPBOX GL HD' : 'OSM ACTIVE'}
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
        <div className="pt-1.5 border-t border-slate-800 flex items-center space-x-2 text-amber-400 font-bold">
          <span className="w-3 h-3 rounded-full border border-dashed border-amber-400 flex items-center justify-center text-[8px]">⚠️</span>
          <span>Red / Amber Geofence Zone</span>
        </div>
      </div>
    </div>
  );
};
