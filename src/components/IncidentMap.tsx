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
        center: [6.3, -1.0],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO &copy; GhanaPost GPS',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersRef.current = markersGroup;
      mapInstanceRef.current = map;

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

      L.marker(alert.centerCoordinates, { icon: alertIcon }).addTo(markersGroup);
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
            cursor: pointer;
          ">
            ${inc.category === 'GALAMSEY_ENVIRONMENTAL' ? '🌲' : inc.category === 'TRAFFIC_RECKLESS' ? '🚗' : inc.category === 'DOMESTIC_ABUSE' ? '🛡️' : '🚨'}
          </div>
        `,
        iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
        iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14]
      });

      const marker = L.marker(inc.coordinates, { icon: incidentIcon }).addTo(markersGroup);
      marker.on('click', () => onSelectIncident(inc));
    });

    if (selectedIncident) {
      map.setView(selectedIncident.coordinates, 13, { animate: true });
    }
  }, [incidents, alerts, selectedIncident]);

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full min-h-[440px]" />
    </div>
  );
};
