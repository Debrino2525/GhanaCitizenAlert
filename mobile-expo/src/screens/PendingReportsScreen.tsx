import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import {
  Clock,
  RotateCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileVideo,
  HardDrive,
  Download
} from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import {
  getPendingReports,
  removePendingReport,
  processPendingReport,
  PendingReportItem
} from '../services/pendingReportsQueue';
import { tokens } from '../theme/tokens';
import { safeHaptics } from '../utils/haptics';

interface PendingReportsScreenProps {
  onQueueCountChange?: (count: number) => void;
}

export const PendingReportsScreen: React.FC<PendingReportsScreenProps> = ({
  onQueueCountChange
}) => {
  const [reports, setReports] = useState<PendingReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');

  const loadQueue = useCallback(async () => {
    try {
      const items = await getPendingReports();
      setReports(items);
      onQueueCountChange?.(items.length);
    } catch (e) {
      console.warn('Error loading pending reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onQueueCountChange]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadQueue();
  }, [loadQueue]);

  const handleRetry = async (item: PendingReportItem) => {
    setProcessingId(item.id);
    setProgressText('Connecting to Evidence Vault...');
    safeHaptics.medium();

    try {
      const res = await processPendingReport(item, (_ratio, text) => {
        setProgressText(text);
      });

      if (res.success) {
        safeHaptics.success();
        Alert.alert('✅ Transmitted', `Incident ${item.trackingCode} is now live on the National Command Map.`);
        await loadQueue();
      } else {
        safeHaptics.warning();
        Alert.alert('⚠️ Transmission Failed', res.error || 'Could not verify evidence upload.');
        await loadQueue();
      }
    } catch (err: any) {
      safeHaptics.warning();
      Alert.alert('Retry Error', err?.message || 'Unexpected transmission error');
      await loadQueue();
    } finally {
      setProcessingId(null);
      setProgressText('');
    }
  };

  const handleDelete = (item: PendingReportItem) => {
    safeHaptics.warning();
    Alert.alert(
      'Delete Pending Report?',
      `Are you sure you want to permanently delete report ${item.trackingCode} and its local evidence? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removePendingReport(item.id, true);
            safeHaptics.medium();
            await loadQueue();
          }
        }
      ]
    );
  };

  const handleSaveToGallery = async (item: PendingReportItem) => {
    if (!item.permanentVideoUri) {
      Alert.alert('No Video', 'No local video file found for this report.');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library permission required to save video.');
        return;
      }

      await MediaLibrary.createAssetAsync(item.permanentVideoUri);
      safeHaptics.success();
      Alert.alert('Saved to Gallery', `A copy of ${item.trackingCode} video was saved to your device gallery.`);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save video to gallery.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={tokens.colors.brand.gold} size="large" />
        <Text style={styles.loadingText}>Loading offline queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <HardDrive color={tokens.colors.brand.gold} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Offline Report Queue</Text>
          <Text style={styles.bannerSubtitle}>
            Reports stored locally on this device when offline. Transmits to Police Command when connection returns.
          </Text>
        </View>
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShieldCheck color={tokens.colors.status.success} size={48} />
          <Text style={styles.emptyTitle}>All Evidence Synced & Live</Text>
          <Text style={styles.emptySubtitle}>
            There are no pending incident reports stored on your device. Every submitted dossier has been
            cryptographically verified on the National Command Center.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={tokens.colors.brand.gold}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isItemProcessing = processingId === item.id;
            const mbSize = (item.fileSizeBytes / (1024 * 1024)).toFixed(1);

            return (
              <View style={styles.card}>
                {/* Card Top Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.trackingBadge}>
                    <Text style={styles.trackingCodeText}>{item.trackingCode}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'FAILED'
                        ? styles.statusBadgeFailed
                        : item.status === 'UPLOADING'
                        ? styles.statusBadgeUploading
                        : styles.statusBadgeQueued
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {item.status === 'FAILED'
                        ? 'SYNC FAILED'
                        : item.status === 'UPLOADING'
                        ? 'TRANSMITTING'
                        : 'QUEUED OFFLINE'}
                    </Text>
                  </View>
                </View>

                {/* Title & Description */}
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Telemetry info */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <FileVideo color={tokens.colors.text.secondary} size={13} />
                    <Text style={styles.metaText}>
                      {item.recordedDuration}s Video • {mbSize} MB
                    </Text>
                  </View>
                  <Text style={styles.metaDate}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Error notice if failed */}
                {item.lastError && (
                  <View style={styles.errorBox}>
                    <AlertTriangle color={tokens.colors.status.danger} size={14} />
                    <Text style={styles.errorText} numberOfLines={2}>
                      {item.lastError}
                    </Text>
                  </View>
                )}

                {/* Processing status text */}
                {isItemProcessing && (
                  <View style={styles.processingRow}>
                    <ActivityIndicator color={tokens.colors.brand.gold} size="small" />
                    <Text style={styles.processingText}>{progressText || 'Transmitting...'}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() => handleSaveToGallery(item)}
                    style={styles.galleryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Save Video to Gallery"
                  >
                    <Download color={tokens.colors.text.secondary} size={14} />
                    <Text style={styles.galleryBtnText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    disabled={isItemProcessing}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Delete pending report"
                  >
                    <Trash2 color={tokens.colors.status.danger} size={14} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRetry(item)}
                    disabled={isItemProcessing}
                    style={[styles.retryBtn, isItemProcessing && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Retry uploading report"
                  >
                    <RotateCw color={tokens.colors.bg.base} size={14} />
                    <Text style={styles.retryBtnText}>Retry Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.base
  },
  centerContainer: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250
  },
  loadingText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    marginTop: tokens.spacing.sm
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bannerTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '700'
  },
  bannerSubtitle: {
    color: tokens.colors.text.secondary,
    fontSize: 11,
    marginTop: 2
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xxl,
    minHeight: 260,
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  emptyTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '800',
    marginTop: tokens.spacing.md
  },
  emptySubtitle: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
    maxWidth: 320
  },
  listContent: {
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.xxl
  },
  card: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  trackingBadge: {
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border.medium
  },
  trackingCodeText: {
    fontFamily: tokens.typography.fontFamily.mono,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '700',
    color: tokens.colors.brand.gold
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 3,
    borderRadius: tokens.radius.xs
  },
  statusBadgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: tokens.colors.status.danger
  },
  statusBadgeUploading: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: tokens.colors.police.accent
  },
  statusBadgeQueued: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: tokens.colors.status.amber
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: tokens.colors.text.white
  },
  cardTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '700',
    marginTop: 2
  },
  cardDesc: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: 16
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    color: tokens.colors.text.secondary,
    fontSize: 11
  },
  metaDate: {
    color: tokens.colors.text.muted,
    fontSize: 10
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 4
  },
  errorText: {
    color: tokens.colors.status.danger,
    fontSize: 10,
    flex: 1
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.bg.subtle,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.xs,
    marginTop: 4
  },
  processingText: {
    color: tokens.colors.brand.gold,
    fontSize: 11,
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.subtle
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm
  },
  galleryBtnText: {
    color: tokens.colors.text.secondary,
    fontSize: 11,
    fontWeight: '600'
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm
  },
  deleteBtnText: {
    color: tokens.colors.status.danger,
    fontSize: 11,
    fontWeight: '600'
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.brand.gold,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm
  },
  retryBtnText: {
    color: tokens.colors.bg.base,
    fontSize: 11,
    fontWeight: '800'
  }
});
