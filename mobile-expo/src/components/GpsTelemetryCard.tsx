import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Crosshair, RefreshCw, Radio, Clock, MapPin, AlertTriangle } from 'lucide-react-native';
import { GpsCoordinates, GpsLockStatus, LocationSource } from '../types';
import { TranslationMap } from '../constants/i18n';
import { tokens } from '../theme/tokens';

interface GpsTelemetryCardProps {
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  locationSource: LocationSource;
  gpsFixAgeSeconds: number | null;
  t: TranslationMap;
  onRefreshGps: () => void;
  onManualLocationPress?: () => void;
}

export const GpsTelemetryCard: React.FC<GpsTelemetryCardProps> = memo(({
  coords,
  gpsAccuracy,
  isLocating,
  gpsStatus,
  locationSource,
  gpsFixAgeSeconds,
  t,
  onRefreshGps,
  onManualLocationPress,
}) => {
  const isLive = !isLocating && locationSource === 'LIVE' && coords !== null;
  const isStale = !isLocating && locationSource === 'LAST_KNOWN' && coords !== null;
  const isManual = !isLocating && locationSource === 'MANUAL';
  const isUnavailable = !isLocating && (locationSource === 'UNAVAILABLE' || coords === null);

  const formatAgeText = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return '';
    if (seconds < 120) return `${seconds}s old`;
    const mins = Math.floor(seconds / 60);
    return `${mins} min old`;
  };

  return (
    <View
      style={[
        styles.gpsCard,
        isLocating && styles.gpsCardLocating,
        isLive && styles.gpsCardLive,
        isStale && styles.gpsCardStale,
        isManual && styles.gpsCardManual,
        isUnavailable && styles.gpsCardUnavailable,
      ]}
    >
      <View style={styles.gpsCardHeader}>
        <View style={styles.gpsIndicatorRow}>
          {isLocating ? (
            <ActivityIndicator size="small" color={tokens.colors.brand.gold} />
          ) : isLive ? (
            <Radio color={tokens.colors.status.success} size={16} />
          ) : isStale ? (
            <Clock color={tokens.colors.status.warning} size={16} />
          ) : isManual ? (
            <MapPin color={tokens.colors.text.secondary} size={16} />
          ) : (
            <AlertTriangle color={tokens.colors.status.danger} size={16} />
          )}

          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              style={[
                styles.gpsCardTitle,
                isLocating && { color: tokens.colors.brand.gold },
                isLive && { color: tokens.colors.status.success },
                isStale && { color: tokens.colors.status.warning },
                isManual && { color: tokens.colors.text.secondary },
                isUnavailable && { color: tokens.colors.status.danger },
              ]}
              numberOfLines={1}
            >
              {isLocating
                ? 'ACQUIRING HARDWARE GPS FIX…'
                : isLive
                ? 'GPS ACQUIRED (LIVE)'
                : isStale
                ? `Last known location, ${formatAgeText(gpsFixAgeSeconds)}. Not live.`
                : isManual
                ? 'Manual Location (Reported)'
                : 'LOCATION UNAVAILABLE'}
            </Text>
            {isLocating && coords && (
              <Text style={styles.staleNoticeText}>
                Acquiring fresh satellite pulse… (Previous fix: {formatAgeText(gpsFixAgeSeconds)})
              </Text>
            )}
            {isStale && (
              <Text style={styles.staleNoticeText}>
                Hardware GPS fix is older than 15s. Tap Refresh to acquire live fix.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            onPress={onRefreshGps}
            disabled={isLocating}
            style={[styles.recalibrateBtn, isLocating && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Acquire Fresh GPS Fix"
          >
            {isLocating ? (
              <View style={styles.btnInnerRow}>
                <ActivityIndicator size="small" color={tokens.colors.bg.base} />
                <Text style={styles.recalibrateBtnText}>Searching…</Text>
              </View>
            ) : (
              <View style={styles.btnInnerRow}>
                <RefreshCw color={tokens.colors.bg.base} size={12} />
                <Text style={styles.recalibrateBtnText}>Refresh GPS</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {coords ? (
        <View style={[styles.gpsCoordsRow, isLocating && { opacity: 0.45 }]}>
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
              <Crosshair
                color={isLive ? tokens.colors.status.success : tokens.colors.text.muted}
                size={10}
              />
              <Text style={styles.gpsCoordLabel}>ACCURACY</Text>
            </View>
            <Text
              style={[
                styles.gpsCoordVal,
                { color: isLive ? tokens.colors.status.success : tokens.colors.text.secondary },
              ]}
            >
              {isLocating ? 'Locking…' : gpsAccuracy !== null ? `±${gpsAccuracy}m` : isLive ? 'Live Fix' : 'Estimated'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.unavailableBox}>
          <Crosshair color={tokens.colors.status.warning} size={14} />
          <Text style={styles.unavailableText}>
            {isLocating ? 'Listening for GPS satellite signal…' : 'No live satellite lock. Move outdoors, tap Refresh GPS, or enter location manually below.'}
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
    gap: tokens.spacing.sm,
  },
  gpsCardLocating: {
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  gpsCardLive: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  gpsCardStale: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  gpsCardManual: {
    borderColor: tokens.colors.police.badge,
  },
  gpsCardUnavailable: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  gpsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  gpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  gpsCardTitle: {
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontSize: tokens.typography.fontSize.xs,
    letterSpacing: 0.8,
  },
  staleNoticeText: {
    fontFamily: tokens.typography.fontFamily.sansRegular,
    fontSize: 10,
    color: tokens.colors.status.warning,
    marginTop: 2,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recalibrateBtn: {
    backgroundColor: tokens.colors.brand.gold,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    minHeight: 28,
    justifyContent: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recalibrateBtnText: {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.bg.base,
  },
  gpsCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface.cardSubtle,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
  },
  gpsCoordItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  gpsCoordDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.colors.border.subtle,
  },
  gpsCoordLabel: {
    fontFamily: tokens.typography.fontFamily.mono,
    fontSize: 9,
    color: tokens.colors.text.muted,
    letterSpacing: 0.5,
  },
  gpsCoordVal: {
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.white,
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  unavailableText: {
    fontFamily: tokens.typography.fontFamily.sansMedium,
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.status.warning,
    flex: 1,
  },
});
