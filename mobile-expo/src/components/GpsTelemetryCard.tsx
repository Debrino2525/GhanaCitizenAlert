import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GpsCoordinates, GpsLockStatus } from '../types';
import { TranslationMap } from '../constants/i18n';

interface GpsTelemetryCardProps {
  coords: GpsCoordinates;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  t: TranslationMap;
  onRefreshGps: () => void;
}

export const GpsTelemetryCard: React.FC<GpsTelemetryCardProps> = memo(({
  coords,
  gpsAccuracy,
  isLocating,
  gpsStatus,
  t,
  onRefreshGps
}) => {
  return (
    <View style={styles.gpsCard}>
      <View style={styles.gpsCardHeader}>
        <View style={styles.gpsIndicatorRow}>
          <View
            style={[
              styles.gpsDot,
              gpsStatus === 'LOCKED'
                ? styles.gpsDotLocked
                : isLocating
                ? styles.gpsDotLocating
                : styles.gpsDotError
            ]}
          />
          <Text style={styles.gpsCardTitle}>
            {isLocating
              ? t.gpsLocating
              : gpsStatus === 'LOCKED'
              ? t.gpsLocked
              : 'GPS UNLOCKED'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefreshGps}
          disabled={isLocating}
          style={styles.recalibrateBtn}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#070B13" />
          ) : (
            <Text style={styles.recalibrateBtnText}>{t.recalibrateGps}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.gpsCoordsRow}>
        <View style={styles.gpsCoordItem}>
          <Text style={styles.gpsCoordLabel}>LATITUDE</Text>
          <Text style={styles.gpsCoordVal}>{coords.latitude.toFixed(5)}° N</Text>
        </View>
        <View style={styles.gpsCoordItem}>
          <Text style={styles.gpsCoordLabel}>LONGITUDE</Text>
          <Text style={styles.gpsCoordVal}>{coords.longitude.toFixed(5)}° W</Text>
        </View>
        <View style={styles.gpsCoordItem}>
          <Text style={styles.gpsCoordLabel}>PRECISION</Text>
          <Text style={[styles.gpsCoordVal, { color: '#10B981' }]}>
            ±{gpsAccuracy || 3.2}m
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  gpsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    padding: 12,
    gap: 8
  },
  gpsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  gpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  gpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  gpsDotLocked: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowRadius: 6,
    shadowOpacity: 0.8
  },
  gpsDotLocating: {
    backgroundColor: '#F59E0B'
  },
  gpsDotError: {
    backgroundColor: '#EF4444'
  },
  gpsCardTitle: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  recalibrateBtn: {
    backgroundColor: '#FCD116',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  recalibrateBtnText: {
    color: '#070B13',
    fontSize: 11,
    fontWeight: 'bold'
  },
  gpsCoordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#070B13',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  gpsCoordItem: {
    alignItems: 'center'
  },
  gpsCoordLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold'
  },
  gpsCoordVal: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 2
  }
});
