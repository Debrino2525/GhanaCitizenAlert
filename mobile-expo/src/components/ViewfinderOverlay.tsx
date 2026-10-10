import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import {
  Camera,
  RotateCcw,
  Trash2,
  ShieldCheck,
  MapPin,
  Lock,
  Sparkles
} from 'lucide-react-native';
import { GpsCoordinates } from '../types';
import { tokens } from '../theme/tokens';

interface ViewfinderOverlayProps {
  cameraRef: React.RefObject<any>;
  hasCameraPermission: boolean | null;
  facing: CameraType;
  isRecording: boolean;
  recordingSeconds: number;
  recordedDuration: number;
  hasRecordedMedia: boolean;
  recordedUri: string | null;
  mediaType: 'VIDEO' | 'IMAGE';
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  locationSource?: string;
  onFlipCamera: () => void;
  onRetake: () => void;
  onRequestPermissions: () => void;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = memo(({
  cameraRef,
  hasCameraPermission,
  facing,
  isRecording,
  recordingSeconds,
  recordedDuration,
  hasRecordedMedia,
  recordedUri,
  mediaType,
  coords,
  gpsAccuracy,
  locationSource = 'LIVE',
  onFlipCamera,
  onRetake,
  onRequestPermissions
}) => {
  const hasValidFix = coords && (coords.latitude !== 0 || coords.longitude !== 0);

  return (
    <View style={styles.cameraWrapper}>
      {/* Tactical Corner Brackets Overlay */}
      <View style={[styles.cornerBracket, styles.cornerTopLeft]} pointerEvents="none" />
      <View style={[styles.cornerBracket, styles.cornerTopRight]} pointerEvents="none" />
      <View style={[styles.cornerBracket, styles.cornerBottomLeft]} pointerEvents="none" />
      <View style={[styles.cornerBracket, styles.cornerBottomRight]} pointerEvents="none" />

      {recordedUri ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: recordedUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.previewBadge}>
            <ShieldCheck color={tokens.colors.text.white} size={14} />
            <Text style={styles.previewBadgeText}>
              Attached Evidence ({recordedDuration}s {mediaType})
            </Text>
          </View>
        </View>
      ) : hasCameraPermission ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          videoQuality="480p"
          videoBitrate={1_800_000}
        />
      ) : (
        <View style={styles.permissionBox}>
          <Camera color={tokens.colors.brand.gold} size={40} style={{ marginBottom: tokens.spacing.sm }} />
          <Text style={styles.permissionText}>
            Camera access enables live hardware viewfinder and evidence capture
          </Text>
          <TouchableOpacity
            onPress={onRequestPermissions}
            style={styles.permBtn}
            accessibilityRole="button"
            accessibilityLabel="Enable Live Viewfinder"
          >
            <Text style={styles.permBtnText}>Enable Live Viewfinder</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Viewfinder Top Controls */}
      <View style={styles.viewfinderTop}>
        <View style={styles.recBadge}>
          <View style={[styles.recDot, isRecording && styles.recDotActive]} />
          <Text style={styles.recText}>
            {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
            {String(recordingSeconds % 60).padStart(2, '0')} / 00:45 MAX
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: tokens.spacing.xs }}>
          {recordedUri ? (
            <TouchableOpacity
              onPress={onRetake}
              style={styles.retakeBtn}
              accessibilityRole="button"
              accessibilityLabel="Retake evidence"
            >
              <Trash2 color={tokens.colors.text.white} size={14} />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onFlipCamera}
              style={styles.flipBtn}
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
            >
              <RotateCcw color={tokens.colors.text.white} size={14} />
              <Text style={styles.flipBtnText}>Flip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Viewfinder Status Banner */}
      <View style={styles.viewfinderCenter}>
        <View
          style={[
            styles.statusPill,
            isRecording ? styles.statusPillRecording : styles.statusPillIdle
          ]}
        >
          {isRecording ? (
            <View style={styles.pulseDot} />
          ) : (
            <Lock color={tokens.colors.brand.gold} size={12} />
          )}
          <Text
            style={[
              styles.statusPillText,
              isRecording ? { color: tokens.colors.text.white } : { color: tokens.colors.brand.gold }
            ]}
          >
            {isRecording
              ? `RECORDING (${45 - recordingSeconds}s left)`
              : hasRecordedMedia
              ? 'EVIDENCE HASH-LOCKED'
              : 'HARDWARE SENSOR LIVE'}
          </Text>
        </View>
      </View>

      {/* Tamper-Evident Watermark Overlay (Act 772) */}
      <View style={styles.watermarkBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ShieldCheck color={tokens.colors.brand.gold} size={12} />
          <Text style={styles.watermarkGold}>FORENSIC WATERMARK (ACT 772)</Text>
        </View>
        <Text style={styles.watermarkWhite}>
          UTC: {new Date().toISOString().substring(11, 19)} | {hasValidFix ? `LAT: ${coords.latitude.toFixed(4)} LNG: ${coords.longitude.toFixed(4)}` : 'Location unavailable'}
        </Text>
        {hasValidFix ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin color={tokens.colors.brand.gold} size={11} />
            <Text style={styles.watermarkGold}>
              {locationSource === 'LIVE' ? 'LIVE FIX' : 'LAST KNOWN FIX'}{gpsAccuracy !== null ? ` | ACCURACY: ±${gpsAccuracy}m` : ''}
            </Text>
          </View>
        ) : (
          <Text style={[styles.watermarkWhite, { color: tokens.colors.status.warning, fontSize: 10 }]}>
            Digital address unavailable
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cameraWrapper: {
    height: 225,
    backgroundColor: '#000000',
    borderRadius: tokens.radius.xl,
    borderWidth: 1.5,
    borderColor: tokens.colors.border.medium,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: tokens.spacing.sm
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: tokens.colors.brand.gold,
    zIndex: 5
  },
  cornerTopLeft: {
    top: 10,
    left: 10,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5
  },
  cornerTopRight: {
    top: 10,
    right: 10,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5
  },
  cornerBottomLeft: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5
  },
  cornerBottomRight: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg
  },
  permissionText: {
    color: tokens.colors.text.secondary,
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs
  },
  permBtn: {
    backgroundColor: tokens.colors.brand.gold,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md
  },
  permBtnText: {
    color: tokens.colors.bg.base,
    fontWeight: '800',
    fontSize: tokens.typography.fontSize.xs
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    zIndex: 10
  },
  previewBadgeText: {
    color: tokens.colors.text.white,
    fontWeight: 'bold',
    fontSize: tokens.typography.fontSize.xs
  },
  viewfinderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 19, 0.85)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border.glass
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.text.muted
  },
  recDotActive: {
    backgroundColor: tokens.colors.status.danger
  },
  recText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: 'bold'
  },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(7, 11, 19, 0.85)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.glass
  },
  flipBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.status.danger,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md
  },
  retakeBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  viewfinderCenter: {
    alignItems: 'center',
    zIndex: 10
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md
  },
  statusPillIdle: {
    backgroundColor: 'rgba(7, 11, 19, 0.85)',
    borderWidth: 1,
    borderColor: tokens.colors.brand.goldMuted
  },
  statusPillRecording: {
    backgroundColor: tokens.colors.status.emergency
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff'
  },
  statusPillText: {
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  watermarkBox: {
    backgroundColor: 'rgba(7, 11, 19, 0.92)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.xxs,
    zIndex: 10,
    borderWidth: 1,
    borderColor: tokens.colors.border.glass
  },
  watermarkGold: {
    color: tokens.colors.brand.gold,
    fontSize: 9,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: 'bold'
  },
  watermarkWhite: {
    color: tokens.colors.text.white,
    fontSize: 9,
    fontFamily: tokens.typography.fontFamily.mono
  }
});
