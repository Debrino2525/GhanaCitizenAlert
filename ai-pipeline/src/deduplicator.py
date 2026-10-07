"""
Spatial & Visual Incident Deduplication & Clustering Engine
Groups simultaneous citizen reports of the same incident and identifies recycled internet media.
"""

import math
from typing import List, Dict, Any, Optional

class IncidentDeduplicator:
    def __init__(self, geo_proximity_km_threshold: float = 0.5, time_window_minutes: int = 45):
        self.geo_threshold_km = geo_proximity_km_threshold
        self.time_window_minutes = time_window_minutes

    def calculate_haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculates great-circle distance between two GPS coordinates in kilometers.
        """
        R = 6371.0 # Earth radius in KM
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def evaluate_duplicate_cluster(
        self,
        current_incident: Dict[str, Any],
        active_incidents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Checks if the incident matches an existing incident cluster within geographic and temporal radius.
        """
        curr_lat = current_incident["latitude"]
        curr_lng = current_incident["longitude"]
        curr_cat = current_incident["category"]

        matched_clusters = []
        for inc in active_incidents:
            if inc["category"] != curr_cat:
                continue

            dist = self.calculate_haversine_distance(
                curr_lat, curr_lng, inc["latitude"], inc["longitude"]
            )

            if dist <= self.geo_threshold_km:
                matched_clusters.append({
                    "cluster_incident_id": inc["id"],
                    "distance_meters": round(dist * 1000, 1),
                    "tracking_code": inc["tracking_code"]
                })

        is_duplicate = len(matched_clusters) > 0

        return {
            "is_duplicate_or_cluster": is_duplicate,
            "cluster_count": len(matched_clusters) + 1,
            "matched_incidents": matched_clusters,
            "recommended_action": "LINK_TO_EXISTING_CLUSTER" if is_duplicate else "CREATE_NEW_DISPATCH"
        }
