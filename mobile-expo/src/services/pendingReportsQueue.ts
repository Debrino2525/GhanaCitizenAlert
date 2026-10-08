import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { uploadEvidenceStreaming } from './evidenceUploader';
import { IncidentCategory, MediaType } from '../types';

const STORAGE_KEY = '@citizen_alert_pending_reports_v1';

export interface PendingReportItem {
  id: string;
  trackingCode: string;
  category: IncidentCategory;
  title: string;
  description: string;
  locationName: string;
  ghanaPostCode: string;
  region: string;
  latitude: number;
  longitude: number;
  landmark: string;
  gpsAccuracy: number;
  mediaType: MediaType;
  recordedDuration: number;
  permanentVideoUri: string;
  fileName: string;
  mimeType: string;
  sha256Checksum: string | null;
  fileSizeBytes: number;
  isAnonymous: boolean;
  reporterPhone?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterTrustScore?: number;
  reporterLoginMethod?: string;
  status: 'QUEUED' | 'UPLOADING' | 'FAILED';
  lastError?: string;
  createdAt: string;
}

/**
 * Retrieve all pending reports stored locally on device.
 */
export async function getPendingReports(): Promise<PendingReportItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading pending reports queue:', err);
    return [];
  }
}

/**
 * Save or update a pending report in local storage.
 */
export async function savePendingReport(item: PendingReportItem): Promise<void> {
  try {
    const current = await getPendingReports();
    const existingIndex = current.findIndex((r) => r.id === item.id);
    let updated: PendingReportItem[];

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...current];
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving pending report:', err);
  }
}

/**
 * Remove a pending report from local storage and cleanup permanent media file.
 */
export async function removePendingReport(id: string, deleteLocalFile = true): Promise<void> {
  try {
    const current = await getPendingReports();
    const item = current.find((r) => r.id === id);

    if (item && deleteLocalFile && item.permanentVideoUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(item.permanentVideoUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(item.permanentVideoUri, { idempotent: true });
        }
      } catch (fileErr) {
        console.warn('Could not delete local permanent file:', fileErr);
      }
    }

    const updated = current.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error removing pending report:', err);
  }
}

/**
 * Update the status of a pending report item.
 */
export async function updatePendingReportStatus(
  id: string,
  status: PendingReportItem['status'],
  lastError?: string
): Promise<void> {
  try {
    const current = await getPendingReports();
    const updated = current.map((r) => (r.id === id ? { ...r, status, lastError } : r));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error updating pending report status:', err);
  }
}

/**
 * Process and transmit a pending report:
 * 1. Uploads media to Supabase storage with verification.
 * 2. Inserts the incident row into Supabase database.
 * 3. On verified success, removes from queue and deletes local permanent media.
 */
export async function processPendingReport(
  report: PendingReportItem,
  onProgress?: (progress: number, text: string) => void
): Promise<{ success: boolean; error?: string }> {
  await updatePendingReportStatus(report.id, 'UPLOADING');
  onProgress?.(0.1, 'Starting evidence upload to Vault...');

  try {
    let rawS3Url = '';
    let uploadStatus = 'UPLOADED';

    if (report.permanentVideoUri) {
      const uploadRes = await uploadEvidenceStreaming({
        fileUri: report.permanentVideoUri,
        fileName: report.fileName,
        mimeType: report.mimeType,
        expectedFileSize: report.fileSizeBytes,
        onProgress
      });

      if (!uploadRes.success || !uploadRes.publicUrl) {
        const errMsg = uploadRes.error || `Upload failed with status ${uploadRes.statusCode || 'unknown'}`;
        await updatePendingReportStatus(report.id, 'FAILED', errMsg);
        return { success: false, error: errMsg };
      }

      rawS3Url = uploadRes.publicUrl;
    }

    onProgress?.(0.92, 'Transmitting dossier to Police CID Dispatch...');

    const mediaList = report.permanentVideoUri
      ? [
          {
            type: report.mediaType,
            video_storage_path: report.fileName,
            durationSeconds: report.recordedDuration || 15,
            rawS3Url,
            thumbnailUrl: rawS3Url,
            localUri: report.permanentVideoUri,
            sha256Checksum: report.sha256Checksum || null,
            timestampUtc: report.createdAt,
            fileSizeBytes: report.fileSizeBytes,
            gpsWatermark: {
              lat: report.latitude,
              lng: report.longitude,
              landmark: report.landmark,
              ghanaPostCode: report.ghanaPostCode,
              accuracyMeters: report.gpsAccuracy
            },
            isTamperProofVerified: Boolean(report.sha256Checksum && report.sha256Checksum.length === 64 && uploadStatus === 'UPLOADED'),
            uploadStatus
          }
        ]
      : [];

    const payload = {
      tracking_code: report.trackingCode,
      category: report.category,
      title: report.title,
      description: report.description,
      location_name: report.isAnonymous
        ? 'Withheld (anonymous)'
        : (report.locationName || (report.landmark ? `${report.landmark}` : 'Unknown location')),
      ghanapost_code: report.isAnonymous ? '' : (report.ghanaPostCode ? report.ghanaPostCode.toUpperCase() : ''),
      region: report.region || 'Unknown',
      latitude: report.latitude,
      longitude: report.longitude,
      media: mediaList,
      is_anonymous: report.isAnonymous,
      reporter_data: report.isAnonymous
        ? { isAnonymous: true, trustScore: 85, reporterType: 'ANONYMOUS_WHISTLEBLOWER' }
        : {
            isAnonymous: false,
            name: report.reporterName || 'Citizen Reporter',
            email: report.reporterEmail || '',
            phone: report.reporterPhone || null,
            landmarkNote: report.landmark,
            trustScore: report.reporterTrustScore || 95,
            isGoogleVerified: report.reporterLoginMethod === 'GOOGLE',
            loginMethod: report.reporterLoginMethod || 'GOOGLE'
          },
      assigned_agency:
        report.category === 'DOMESTIC_ABUSE'
          ? 'DOVVSU'
          : report.category === 'GALAMSEY_ENVIRONMENTAL'
          ? 'EPA'
          : report.category === 'TRAFFIC_RECKLESS'
          ? 'MTTD'
          : 'GPS_CID',
      status: 'RECEIVED_PENDING_TRIAGE',
      severity:
        report.category === 'CRIMINAL_OFFENSE'
          ? 'RED'
          : report.category === 'DOMESTIC_ABUSE' || report.category === 'GALAMSEY_ENVIRONMENTAL'
          ? 'HIGH'
          : 'NORMAL',
      is_public_eligible: false,
      is_public_published: false,
      public_corroborations: 0
    };

    const { error: insertErr } = await supabase.from('incidents').insert(payload);

    if (insertErr) {
      await updatePendingReportStatus(report.id, 'FAILED', insertErr.message);
      return { success: false, error: insertErr.message };
    }

    // Success! Remove from queue and cleanup permanent local copy
    await removePendingReport(report.id, true);
    onProgress?.(1.0, '✅ Report Transmitted & Live');
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || 'Processing error';
    await updatePendingReportStatus(report.id, 'FAILED', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Initialize automatic background sync when internet connection returns.
 */
let isAutoSyncing = false;
export function initAutoSyncNetworkListener(onSyncEvent?: () => void): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable && !isAutoSyncing) {
      isAutoSyncing = true;
      try {
        const pending = await getPendingReports();
        const queuedItems = pending.filter((r) => r.status === 'QUEUED' || r.status === 'FAILED');

        for (const item of queuedItems) {
          const res = await processPendingReport(item);
          if (res.success) {
            onSyncEvent?.();
          }
        }
      } catch (syncErr) {
        console.warn('Auto sync execution error:', syncErr);
      } finally {
        isAutoSyncing = false;
      }
    }
  });

  return unsubscribe;
}
