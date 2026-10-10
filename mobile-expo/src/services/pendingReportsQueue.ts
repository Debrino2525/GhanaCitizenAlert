import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { uploadEvidenceStreaming, formatPlainLanguageUploadError } from './evidenceUploader';
import { IncidentCategory, MediaType, EvidenceMediaItem, LocationSource } from '../types';

const STORAGE_KEY = '@citizen_alert_pending_reports_v1';

export interface PendingReportItem {
  id: string;
  trackingCode: string;
  category: IncidentCategory;
  title: string;
  description: string;
  locationName: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  location_source?: LocationSource;
  gps_fix_age_s?: number | null;
  landmark: string;
  gpsAccuracy: number | null;
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
  reportInserted?: boolean;
  mediaUploaded?: boolean;
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
        const file = new File(item.permanentVideoUri);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // Fallback to legacy
        try {
          const fileInfo = await FileSystemLegacy.getInfoAsync(item.permanentVideoUri);
          if (fileInfo.exists) {
            await FileSystemLegacy.deleteAsync(item.permanentVideoUri, { idempotent: true });
          }
        } catch (fileErr) {
          console.warn('Could not delete local permanent file:', fileErr);
        }
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
  lastError?: string,
  updates?: Partial<PendingReportItem>
): Promise<void> {
  try {
    const current = await getPendingReports();
    const updated = current.map((r) => (r.id === id ? { ...r, ...updates, status, lastError } : r));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error updating pending report status:', err);
  }
}

/**
 * Process and transmit a pending report adhering to:
 * REPORT FIRST, MEDIA SECOND protocol:
 * 1. Insert the incident row (text, category, location, gps_accuracy_m) immediately into DB.
 * 2. If DB insert succeeds, mark reportInserted = true.
 * 3. Then upload media separately and link verified URL to the incident.
 * 4. Never remove from queue until BOTH report and media are confirmed delivered.
 */
export async function processPendingReport(
  report: PendingReportItem,
  onProgress?: (progress: number, text: string) => void
): Promise<{ success: boolean; error?: string }> {
  await updatePendingReportStatus(report.id, 'UPLOADING');
  onProgress?.(0.1, 'Verifying connection to Police CAD Dispatch...');

  try {
    // STEP 1: Insert Incident Dossier into DB FIRST (if not already inserted)
    if (!report.reportInserted) {
      onProgress?.(0.3, 'Transmitting incident report to Police CID Dispatch...');

      const canonicalPublicUrl = report.fileName ? supabase.storage.from('evidence').getPublicUrl(report.fileName).data.publicUrl : '';

      const initialMediaList: EvidenceMediaItem[] = report.permanentVideoUri
        ? [
            {
              type: report.mediaType,
              video_storage_path: report.fileName,
              durationSeconds: report.recordedDuration || (report.mediaType === 'VIDEO' ? 15 : 1),
              rawS3Url: canonicalPublicUrl,
              thumbnailUrl: canonicalPublicUrl,
              localUri: report.permanentVideoUri,
              sha256Checksum: report.sha256Checksum || null,
              timestampUtc: report.createdAt,
              fileSizeBytes: report.fileSizeBytes,
              gpsWatermark: {
                lat: report.latitude,
                lng: report.longitude,
                landmark: report.landmark || 'Incident Location',
                accuracyMeters: (report.location_source === 'LIVE' || report.location_source === 'LAST_KNOWN') ? report.gpsAccuracy : null,
                locationSource: report.location_source || (report.latitude !== null ? 'LAST_KNOWN' : 'UNAVAILABLE'),
                fixAgeSeconds: report.gps_fix_age_s ?? null,
              },
              isTamperProofVerified: false,
              uploadStatus: 'QUEUED'
            }
          ]
        : [];

      const effectiveSource = report.location_source || (report.latitude !== null ? 'LAST_KNOWN' : 'UNAVAILABLE');
      const payload: any = {
        tracking_code: report.trackingCode,
        category: report.category,
        title: report.title,
        description: report.description,
        location_name: report.isAnonymous
          ? 'Withheld (anonymous)'
          : (report.locationName || (effectiveSource === 'UNAVAILABLE' ? 'Location pending' : 'Manual location')),
        ghanapost_code: null,
        region: report.region || 'UNKNOWN',
        latitude: report.latitude,
        longitude: report.longitude,
        location_source: effectiveSource,
        gps_fix_age_s: report.gps_fix_age_s ?? null,
        gps_accuracy_m: (effectiveSource === 'LIVE' || effectiveSource === 'LAST_KNOWN') && typeof report.gpsAccuracy === 'number'
          ? report.gpsAccuracy
          : null,
        media: initialMediaList,
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

      if (insertErr && insertErr.code !== '23505') {
        const cleanErr = formatPlainLanguageUploadError(undefined, insertErr.message);
        await updatePendingReportStatus(report.id, 'FAILED', cleanErr);
        return { success: false, error: cleanErr };
      }

      // Incident successfully registered in DB!
      report.reportInserted = true;
      await savePendingReport(report);
      onProgress?.(0.5, '✅ Report registered with CID. Uploading media...');
    }

    // STEP 2: Upload Evidence Media Separately (if attached and not yet uploaded)
    if (report.permanentVideoUri && !report.mediaUploaded) {
      onProgress?.(0.6, 'Uploading evidence to National Vault...');

      const uploadRes = await uploadEvidenceStreaming({
        fileUri: report.permanentVideoUri,
        fileName: report.fileName,
        mimeType: report.mimeType,
        expectedFileSize: report.fileSizeBytes,
        onProgress: (ratio, txt) => {
          onProgress?.(0.6 + ratio * 0.35, txt);
        }
      });

      if (!uploadRes.success || !uploadRes.publicUrl) {
        const errorMsg = uploadRes.error || 'Report sent. Video waiting to upload.';
        // Report is already delivered! Mark as waiting/failed media upload for retry
        await updatePendingReportStatus(report.id, 'FAILED', errorMsg, { reportInserted: true, mediaUploaded: false });
        return { success: false, error: errorMsg };
      }

      const canonicalPublicUrl = report.fileName ? supabase.storage.from('evidence').getPublicUrl(report.fileName).data.publicUrl : '';
      // Sanitize media items for attach_incident_media: omit localUri
      const mediaToAttach = [
        {
          type: report.mediaType,
          video_storage_path: report.fileName,
          durationSeconds: report.recordedDuration || (report.mediaType === 'VIDEO' ? 15 : 1),
          rawS3Url: uploadRes.publicUrl || canonicalPublicUrl,
          thumbnailUrl: uploadRes.publicUrl || canonicalPublicUrl,
          sha256Checksum: report.sha256Checksum || null,
          timestampUtc: report.createdAt,
          fileSizeBytes: uploadRes.verifiedSize || report.fileSizeBytes,
          gpsWatermark: {
            lat: report.latitude,
            lng: report.longitude,
            landmark: report.landmark || 'Incident Location',
            accuracyMeters: (report.location_source === 'LIVE' || report.location_source === 'LAST_KNOWN') ? report.gpsAccuracy : null,
            locationSource: report.location_source || (report.latitude !== null ? 'LAST_KNOWN' : 'UNAVAILABLE'),
            fixAgeSeconds: report.gps_fix_age_s ?? null,
          },
          isTamperProofVerified: Boolean(report.sha256Checksum && report.sha256Checksum.length === 64),
          uploadStatus: 'UPLOADED'
        }
      ];

      const { data: attachResult, error: attachErr } = await supabase.rpc('attach_incident_media', {
        p_tracking_code: report.trackingCode,
        p_media: mediaToAttach
      });

      if (attachErr || attachResult === false) {
        const attachErrMsg = attachErr?.message || (attachResult === false ? 'Server rejected media attachment RPC' : 'Unknown RPC error');
        console.warn('[PENDING_QUEUE_ATTACH_ERROR]', attachErrMsg);
        throw new Error(attachErrMsg);
      }

      report.mediaUploaded = true;
    }

    // STEP 3: Confirm BOTH report and media are complete before queue removal
    if (report.reportInserted && (!report.permanentVideoUri || report.mediaUploaded)) {
      await removePendingReport(report.id, true);
      onProgress?.(1.0, '✅ Report and Evidence Transmitted');
      return { success: true };
    }

    return { success: false, error: 'Report sent. Video waiting to upload.' };
  } catch (err: any) {
    const errorMsg = formatPlainLanguageUploadError(undefined, err?.message);
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
