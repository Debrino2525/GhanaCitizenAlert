import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [6.1, -1.0],
        zoom: 7,
        zoomControl: true
      });

      const CARTO_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfcTI3M2Y0anMiLCJqdGkiOiIzY2U3YTU2NzVlMjA4ZGVhM2EyZDYzZDM1ODU3ODM2YSJ9.J7aEh-YJQaJ4As_S2QTmrSw1j1LXaZbsPLCB0NRiIiI';
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`, {
        attribution: '&copy; OpenStreetMap &copy; CARTO &copy; GhanaPost GPS',
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersRef.current = markersGroup;
      mapInstanceRef.current = map;
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

      circle.bindTooltip(`<b>${alert.alertType} ALERT</b><br/>${alert.title}<br/>Broadcast Radius: ${alert.radiusKm} km`, {
        sticky: true
      });

      const alertIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">⚠️</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      L.marker(alert.centerCoordinates, { icon: alertIcon })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 200px;">
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
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            border: 3px solid ${isSelected ? '#FCD116' : '#ffffff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
          ">
            ${inc.category === 'GALAMSEY_ENVIRONMENTAL' ? '🌲' : inc.category === 'TRAFFIC_RECKLESS' ? '🚗' : inc.category === 'DOMESTIC_ABUSE' ? '🛡️' : '🚨'}
          </div>
        `,
        iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
        iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);

      marker.on('click', () => {
        onSelectIncident(inc);
      });
    });

    if (selectedIncident) {
      map.setView(selectedIncident.coordinates, 13, { animate: true });
    }
  }, [incidents, alerts, selectedIncident]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
