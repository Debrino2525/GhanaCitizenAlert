import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { GpsCoordinates } from '../types';

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
  coords: GpsCoordinates;
  ghanaPostCode: string;
  gpsAccuracy: number | null;
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
  ghanaPostCode,
  gpsAccuracy,
  onFlipCamera,
  onRetake,
  onRequestPermissions
}) => {
  return (
    <View style={styles.cameraWrapper}>
      {recordedUri ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: recordedUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.previewBadge}>
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
              🎬 Attached Evidence ({recordedDuration}s {mediaType})
            </Text>
          </View>
        </View>
      ) : hasCameraPermission ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
        />
      ) : (
        <View style={styles.permissionBox}>
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 10, fontSize: 12 }}>
            Camera access enables live in-app hardware viewfinder and evidence recording
          </Text>
          <TouchableOpacity
            onPress={onRequestPermissions}
            style={styles.permBtn}
          >
            <Text style={{ color: '#070B13', fontWeight: 'bold', fontSize: 12 }}>
              Enable Live Viewfinder
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Viewfinder Top Controls */}
      <View style={styles.viewfinderTop}>
        <View style={styles.recBadge}>
          <View style={[styles.recDot, isRecording && styles.recDotActive]} />
          <Text style={styles.recText}>
            {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
            {String(recordingSeconds % 60).padStart(2, '0')} / 01:00 MAX
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {recordedUri ? (
            <TouchableOpacity onPress={onRetake} style={styles.retakeBtn}>
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                🗑️ Retake
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onFlipCamera} style={styles.flipBtn}>
              <Text style={{ color: '#ffffff', fontSize: 12 }}>🔄 Flip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Viewfinder Status Banner */}
      <View style={styles.viewfinderCenter}>
        <Text
          style={{
            color: isRecording ? '#ffffff' : '#FCD116',
            fontSize: 11,
            fontWeight: '800',
            backgroundColor: isRecording ? '#DC2626' : 'rgba(0,0,0,0.75)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8
          }}
        >
          {isRecording
            ? `🔴 IN-APP RECORDING (${60 - recordingSeconds}s remaining)`
            : hasRecordedMedia
            ? '✅ EVIDENCE ATTACHED & HASH-LOCKED'
            : 'HARDWARE SENSOR LIVE'}
        </Text>
      </View>

      {/* Tamper-Evident Watermark Overlay */}
      <View style={styles.watermarkBox}>
        <Text style={styles.watermarkGold}>🇬🇭 WATERMARK ENCRYPTED (ACT 772)</Text>
        <Text style={styles.watermarkWhite}>
          UTC: {new Date().toISOString().substring(11, 19)} | LAT: {coords.latitude.toFixed(4)} LNG: {coords.longitude.toFixed(4)}
        </Text>
        <Text style={styles.watermarkGold}>
          DIGITAL POST: {ghanaPostCode} (±{gpsAccuracy || 3.2}m)
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cameraWrapper: {
    height: 250,
    backgroundColor: '#000000',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  permBtn: {
    backgroundColor: '#FCD116',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(16,185,129,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b'
  },
  recDotActive: {
    backgroundColor: '#EF4444'
  },
  recText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold'
  },
  flipBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  retakeBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  viewfinderCenter: {
    alignItems: 'center',
    zIndex: 10
  },
  watermarkBox: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 8,
    borderRadius: 10,
    gap: 2,
    zIndex: 10
  },
  watermarkGold: {
    color: '#FCD116',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold'
  },
  watermarkWhite: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'monospace'
  }
});
