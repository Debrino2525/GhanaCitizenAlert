import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Crosshair, RefreshCw, Radio } from 'lucide-react-native';
import { GpsCoordinates, GpsLockStatus } from '../types';
import { TranslationMap } from '../constants/i18n';
import { tokens } from '../theme/tokens';

interface GpsTelemetryCardProps {
  coords: GpsCoordinates | null;
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
  const hasValidFix = coords && (coords.latitude !== 0 || coords.longitude !== 0) && gpsStatus === 'LOCKED';

  return (
    <View style={styles.gpsCard}>
      <View style={styles.gpsCardHeader}>
        <View style={styles.gpsIndicatorRow}>
          <Radio
            color={
              hasValidFix
                ? tokens.colors.status.success
                : isLocating
                ? tokens.colors.status.warning
                : tokens.colors.status.danger
            }
            size={16}
          />
          <Text style={styles.gpsCardTitle}>
            {isLocating
              ? t.gpsLocating
              : hasValidFix
              ? t.gpsLocked
              : 'GPS SIGNAL REQUIRED'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefreshGps}
          disabled={isLocating}
          style={styles.recalibrateBtn}
          accessibilityRole="button"
          accessibilityLabel="Recalibrate GPS Coordinates"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={tokens.colors.bg.base} />
          ) : (
            <View style={styles.btnInnerRow}>
              <RefreshCw color={tokens.colors.bg.base} size={12} />
              <Text style={styles.recalibrateBtnText}>Refresh GPS</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {hasValidFix ? (
        <View style={styles.gpsCoordsRow}>
          <View style={styles.gpsCoordItem}>
            <Text style={styles.gpsCoordLabel}>LATITUDE</Text>
            <Text style={styles.gpsCoordVal}>{coords.latitude.toFixed(5)}° N</Text>
          </View>
          <View style={styles.gpsCoordDivider} />
          <View style={styles.gpsCoordItem}>
            <Text style={styles.gpsCoordLabel}>LONGITUDE</Text>
            <Text style={styles.gpsCoordVal}>{coords.longitude.toFixed(5)}° W</Text>
          </View>
          <View style={styles.gpsCoordDivider} />
          <View style={styles.gpsCoordItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Crosshair color={tokens.colors.status.success} size={10} />
              <Text style={styles.gpsCoordLabel}>ACCURACY</Text>
            </View>
            <Text style={[styles.gpsCoordVal, { color: tokens.colors.status.success }]}>
              {gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'Live Fix'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.unavailableBox}>
          <Crosshair color={tokens.colors.status.warning} size={14} />
          <Text style={styles.unavailableText}>
            Location unavailable. Refresh GPS or move outdoors.
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  gpsCard: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.police.dark,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm
  },
  gpsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  gpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs
  },
  gpsCardTitle: {
    color: tokens.colors.police.badge,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  recalibrateBtn: {
    backgroundColor: tokens.colors.brand.gold,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    minHeight: 32,
    justifyContent: 'center'
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  recalibrateBtnText: {
    color: tokens.colors.bg.base,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  gpsCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  gpsCoordItem: {
    alignItems: 'center',
    flex: 1
  },
  gpsCoordDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.colors.border.subtle
  },
  gpsCoordLabel: {
    color: tokens.colors.text.muted,
    fontSize: 9,
    fontWeight: 'bold'
  },
  gpsCoordVal: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: 'bold',
    marginTop: 2
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  unavailableText: {
    color: tokens.colors.status.warning,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '600',
    flex: 1
  }
});
