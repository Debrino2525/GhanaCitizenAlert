import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UploadCloud, CheckCircle2, ShieldCheck, FileVideo, FileImage } from 'lucide-react-native';
import { tokens } from '../theme/tokens';

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

  const displayProgress = isUploadingMedia ? uploadProgress : 100;

  return (
    <View style={styles.uploadProgressCard}>
      <View style={styles.uploadHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
          {isUploadingMedia ? (
            <UploadCloud color={tokens.colors.police.accent} size={16} />
          ) : (
            <CheckCircle2 color={tokens.colors.status.success} size={16} />
          )}
          <Text style={styles.uploadTitle}>
            {isUploadingMedia ? 'UPLOADING & ENCRYPTING EVIDENCE...' : 'EVIDENCE SECURELY ATTACHED & LOCKED'}
          </Text>
        </View>
        <Text style={styles.uploadPercentageText}>{displayProgress}%</Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${displayProgress}%`,
              backgroundColor: isUploadingMedia ? tokens.colors.police.accent : tokens.colors.status.success
            }
          ]}
        />
      </View>

      <View style={styles.uploadMetaRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ShieldCheck color={tokens.colors.text.muted} size={12} />
          <Text style={styles.uploadStatusSubtext}>
            {uploadStatusText || 'Act 772 Forensic Chain of Custody'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {mediaType === 'VIDEO' ? (
            <FileVideo color={tokens.colors.brand.sky} size={12} />
          ) : (
            <FileImage color={tokens.colors.brand.sky} size={12} />
          )}
          <Text style={styles.uploadSizeText}>
            {mediaType === 'VIDEO'
              ? `${recordedDuration}s • 720p HD`
              : 'Photo • JPEG'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  uploadProgressCard: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.police.accent,
    padding: tokens.spacing.md,
    marginVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    ...tokens.elevation.medium
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  uploadTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  uploadPercentageText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: tokens.typography.fontFamily.monoBold
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.xs,
    overflow: 'hidden',
    width: '100%'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: tokens.radius.xs
  },
  uploadMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  uploadStatusSubtext: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '500'
  },
  uploadSizeText: {
    color: tokens.colors.brand.sky,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  }
});
