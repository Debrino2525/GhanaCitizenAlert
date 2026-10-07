import React, { useEffect, useRef, useState } from 'react';
import { IncidentReport, EmergencyAlert } from '../types';
import L from 'leaflet';

interface IncidentMapProps {
  incidents: IncidentReport[];
  alerts: EmergencyAlert[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  alerts,
  selectedIncident,
  onSelectIncident
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = useState<'carto-voyager' | 'carto-dark' | 'osm'>('carto-voyager');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Ghana bounding box & center
      const map = L.map(mapContainerRef.current, {
        center: [6.3, -1.0],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // High-Definition OpenStreetMap & CARTO Basemap without watermarks
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; GhanaPost GPS',
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Invalidate size after mount to prevent grey/broken tiles in flex containers
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      window.addEventListener('resize', () => map.invalidateSize());
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersRef.current;

    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Draw Red / Amber Alert Geofence Circles
    alerts.filter(a => a.isActive).forEach(alert => {
      const color = alert.alertType === 'RED' ? '#dc2626' : '#f59e0b';
      
      const circle = L.circle(alert.centerCoordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        radius: alert.radiusKm * 1000,
        dashArray: '6, 8',
        weight: 2
      }).addTo(markersGroup);

      circle.bindTooltip(`<b>${alert.alertType} ALERT GEOFENCE</b><br/>${alert.title}<br/>Broadcast Radius: ${alert.radiusKm} km`, {
        sticky: true
      });

      const alertIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">⚠️</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
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

    // 2. Draw Incident Markers
    incidents.forEach(inc => {
      let pinColor = '#3b82f6';
      if (inc.category === 'CRIMINAL_OFFENSE') pinColor = '#ef4444';
      if (inc.category === 'DOMESTIC_ABUSE') pinColor = '#ec4899';
      if (inc.category === 'GALAMSEY_ENVIRONMENTAL') pinColor = '#10b981';
      if (inc.category === 'TRAFFIC_RECKLESS') pinColor = '#f59e0b';
      if (inc.category === 'SANITATION_ZONING') pinColor = '#8b5cf6';

      const isSelected = selectedIncident?.id === inc.id;

      const incidentIcon = L.divIcon({
        className: 'custom-incident-icon',
        html: `
          <div style="
            background-color: ${pinColor};
            width: ${isSelected ? '36px' : '28px'};
            height: ${isSelected ? '36px' : '28px'};
            border-radius: 50%;
            border: 3px solid ${isSelected ? '#FCD116' : '#ffffff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '14px' : '12px'};
            font-weight: bold;
            transition: all 0.2s;
            cursor: pointer;
          ">
            ${inc.category === 'GALAMSEY_ENVIRONMENTAL' ? '🌲' : inc.category === 'TRAFFIC_RECKLESS' ? '🚗' : inc.category === 'DOMESTIC_ABUSE' ? '🛡️' : '🚨'}
          </div>
        `,
        iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
        iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);

      marker.on('click', () => {
        onSelectIncident(inc);
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 220px; padding: 4px;">
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
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />
      
      {/* Map Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs space-y-1 shadow-lg">
        <span className="font-bold text-slate-300 block mb-1">GHANA INCIDENT MAP</span>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Crime / Robbery (Police CID)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span>Domestic Abuse (DOVVSU)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Galamsey (EPA)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Reckless Driving (MTTD)</span>
        </div>
        <div className="pt-1 border-t border-slate-800 flex items-center space-x-2 text-amber-400 font-bold">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400" />
          <span>Geofence Broadcast Zone</span>
        </div>
      </div>
    </div>
  );
};
