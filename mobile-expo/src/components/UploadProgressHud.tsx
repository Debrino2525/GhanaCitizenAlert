import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface UploadProgressHudProps {
  uploadProgress: number;
  uploadStatusText: string;
  isUploadingMedia: boolean;
  hasRecordedMedia: boolean;
  mediaType: 'VIDEO' | 'IMAGE';
  recordedDuration: number;
}

export const UploadProgressHud: React.FC<UploadProgressHudProps> = memo(({
  uploadProgress,
  uploadStatusText,
  isUploadingMedia,
  hasRecordedMedia,
  mediaType,
  recordedDuration
}) => {
  if (!isUploadingMedia && !hasRecordedMedia) return null;

  return (
    <View style={styles.uploadProgressCard}>
      <View style={styles.uploadHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={[
              styles.statusDot,
              isUploadingMedia ? styles.statusDotUploading : styles.statusDotComplete
            ]}
          />
          <Text style={styles.uploadTitle}>
            {isUploadingMedia ? 'UPLOADING & ENCRYPTING EVIDENCE...' : 'EVIDENCE SECURELY ATTACHED & LOCKED'}
          </Text>
        </View>
        <Text style={styles.uploadPercentageText}>{uploadProgress}%</Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${uploadProgress}%`,
              backgroundColor: isUploadingMedia ? '#3B82F6' : '#10B981'
            }
          ]}
        />
      </View>

      <View style={styles.uploadMetaRow}>
        <Text style={styles.uploadStatusSubtext}>
          {uploadStatusText || 'Act 772 Forensic Chain of Custody'}
        </Text>
        <Text style={styles.uploadSizeText}>
          {mediaType === 'VIDEO'
            ? `${recordedDuration}s • 720p HD • MP4`
            : 'High-Res Photo • JPEG'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  uploadProgressCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 12,
    marginVertical: 4,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusDotUploading: {
    backgroundColor: '#3B82F6'
  },
  statusDotComplete: {
    backgroundColor: '#10B981'
  },
  uploadTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  uploadPercentageText: {
    color: '#FCD116',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace'
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  uploadMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  uploadStatusSubtext: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500'
  },
  uploadSizeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: 'bold'
  }
});
