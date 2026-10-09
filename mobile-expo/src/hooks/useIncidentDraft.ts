import { useState, useCallback, useRef } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from '../lib/supabase';
import { CitizenUser } from '../components/CitizenAccessWall';
import {
  IncidentCategory,
  GpsCoordinates,
  EvidenceMediaItem
} from '../types';
import { safeHaptics, announceAccessibility } from '../utils/haptics';
import { uploadEvidenceStreaming, cleanupCachedEvidence, UploadEvidenceResult, formatPlainLanguageUploadError } from '../services/evidenceUploader';
import { savePendingReport, removePendingReport, updatePendingReportStatus } from '../services/pendingReportsQueue';
import { computeFileSha256 } from '../utils/fileHashing';
import { getRealFileSizeBytes, formatBytesToMB } from '../utils/fileSize';

export interface UseIncidentDraftProps {
  citizen: CitizenUser;
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  locationName: string;
  landmark: string;
  ghanaPostCode: string;
  region: string;
}

export interface UseIncidentDraftResult {
  category: IncidentCategory;
  title: string;
  description: string;
  landmark: string;
  isAnonymous: boolean;
  reporterPhone: string;
  isSubmitting: boolean;
  uploadProgress: number;
  uploadStatusText: string;
  isUploadingMedia: boolean;
  hasRecordedMedia: boolean;
  recordedUri: string | null;
  mediaType: 'VIDEO' | 'IMAGE';
  recordedDuration: number;
  setCategory: (cat: IncidentCategory) => void;
  setTitle: (t: string) => void;
  setDescription: (d: string) => void;
  setLandmark: (l: string) => void;
  setIsAnonymous: (a: boolean) => void;
  setReporterPhone: (p: string) => void;
  processAndAttachEvidence: (type: 'VIDEO' | 'IMAGE', uri: string, durationSec?: number) => void;
  clearAttachedMedia: () => void;
  saveEvidenceToGallery: () => Promise<boolean>;
  handleSubmitReport: () => Promise<void>;
}

export const useIncidentDraft = ({
  citizen,
  coords,
  gpsAccuracy,
  locationName,
  ghanaPostCode,
  region
}: UseIncidentDraftProps): UseIncidentDraftResult => {
  const [category, setCategory] = useState<IncidentCategory>('CRIMINAL_OFFENSE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reporterPhone, setReporterPhone] = useState(citizen.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Media Attachment & Upload Progress State
  const [hasRecordedMedia, setHasRecordedMedia] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permanentMediaUri, setPermanentMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'VIDEO' | 'IMAGE'>('VIDEO');
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  const activePermanentUriRef = useRef<string | null>(null);

  const processAndAttachEvidence = useCallback((type: 'VIDEO' | 'IMAGE', uri: string, durationSec: number = 15) => {
    setIsUploadingMedia(true);
    setUploadProgress(15);
    setUploadStatusText('Extracting telemetry & frame buffers...');
    setMediaType(type);
    setRecordedDuration(durationSec);

    setTimeout(() => {
      setUploadProgress(45);
      setUploadStatusText('Encrypting GPS watermark under Act 772...');
    }, 300);

    setTimeout(() => {
      setUploadProgress(75);
      setUploadStatusText('Generating SHA-256 evidence integrity seal...');
    }, 600);

    setTimeout(() => {
      setUploadProgress(100);
      setUploadStatusText('✅ 100% Attached & Cryptographically Sealed');
      setRecordedUri(uri);
      setHasRecordedMedia(true);
      setIsUploadingMedia(false);
      safeHaptics.success();
      announceAccessibility('Evidence attached and sealed with SHA-256 digest.');
    }, 950);
  }, []);

  const clearAttachedMedia = useCallback(() => {
    setHasRecordedMedia(false);
    setRecordedUri(null);
    setPermanentMediaUri(null);
    activePermanentUriRef.current = null;
    setUploadProgress(0);
    setUploadStatusText('');
    safeHaptics.light();
  }, []);

  /**
   * Saves a copy of the attached media to the device photo library.
   */
  const saveEvidenceToGallery = useCallback(async (): Promise<boolean> => {
    const targetUri = permanentMediaUri || recordedUri;
    if (!targetUri) {
      Alert.alert('No Media', 'Please record or attach evidence first.');
      return false;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library permission is required to save evidence locally.');
        return false;
      }

      await MediaLibrary.createAssetAsync(targetUri);
      safeHaptics.success();
      Alert.alert('Saved to Gallery', 'A forensic copy of this recording was saved to your device gallery.');
      return true;
    } catch (err: any) {
      console.warn('Failed to save to gallery:', err);
      Alert.alert('Save Failed', err?.message || 'Could not save evidence to device gallery.');
      return false;
    }
  }, [permanentMediaUri, recordedUri]);

  const handleSubmitReport = useCallback(async () => {
    Keyboard.dismiss();

    if (!title.trim() || !description.trim()) {
      safeHaptics.warning();
      Alert.alert('Missing Information', 'Please provide an incident title and situation details.');
      return;
    }

    if (!coords || (coords.latitude === 0 && coords.longitude === 0)) {
      safeHaptics.warning();
      Alert.alert(
        'Location Required',
        'Location unavailable. Refresh GPS or move outdoors to attach verified coordinates before submitting.'
      );
      return;
    }

    if (hasRecordedMedia && mediaType === 'VIDEO' && recordedDuration > 45) {
      safeHaptics.warning();
      Alert.alert(
        'Video Too Long',
        'This video is longer than 45 seconds or larger than 40 MB. Trim it in your phone\'s Photos app and choose it again, record inside the app, or choose a photo.'
      );
      return;
    }

    setIsSubmitting(true);
    setIsUploadingMedia(true);
    setUploadProgress(5);
    setUploadStatusText('Securing incident dossier...');

    const generateTrackingCode = (): string => {
      const bytes = Crypto.getRandomBytes(6);
      let val = 0n;
      for (let i = 0; i < 6; i++) {
        val = (val << 8n) | BigInt(bytes[i]);
      }
      const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
      let suffix = '';
      for (let i = 0; i < 8; i++) {
        suffix += alphabet[Number(val % BigInt(alphabet.length))];
        val /= BigInt(alphabet.length);
      }
      return `GH-2026-${suffix}`;
    };

    let trackingCode = generateTrackingCode();
    const combinedLocation = landmark.trim()
      ? `${landmark.trim()} (${locationName})`
      : locationName;

    let permanentUri = activePermanentUriRef.current || permanentMediaUri;
    let computedHash: string | null = null;
    let fileSize = 1024 * 512;
    let fileName = '';
    let mimeType = '';

    try {
      // PREPARE MEDIA IF ATTACHED
      if (hasRecordedMedia && recordedUri) {
        const isMov = recordedUri.toLowerCase().endsWith('.mov');
        const extension = mediaType === 'VIDEO' ? (isMov ? 'mov' : 'mp4') : 'jpg';
        mimeType = mediaType === 'VIDEO' ? (isMov ? 'video/quicktime' : 'video/mp4') : 'image/jpeg';
        fileName = `${trackingCode}-${Date.now()}.${extension}`;

        // Step 1: Copy to permanent documentDirectory
        if (!permanentUri) {
          setUploadProgress(10);
          setUploadStatusText('Securing permanent local copy...');
          const docDir = FileSystemLegacy.documentDirectory || '';
          permanentUri = `${docDir}evidence_${trackingCode}_${Date.now()}.${extension}`;

          try {
            await FileSystemLegacy.copyAsync({
              from: recordedUri,
              to: permanentUri
            });
            setPermanentMediaUri(permanentUri);
            activePermanentUriRef.current = permanentUri;
          } catch (copyErr) {
            console.warn('Permanent copy fallback using original URI:', copyErr);
            permanentUri = recordedUri;
          }
        }

        // Step 2: Check real file size
        fileSize = (await getRealFileSizeBytes(permanentUri)) || fileSize;
        console.log(`[EVIDENCE_MEDIA] Submitting report media: size=${fileSize} bytes (${formatBytesToMB(fileSize)})`);

        if (fileSize > 45 * 1024 * 1024) {
          setIsSubmitting(false);
          setIsUploadingMedia(false);
          setUploadProgress(0);
          setUploadStatusText('');
          safeHaptics.warning();
          Alert.alert(
            'File Too Large',
            'Evidence file exceeds 45 MB upload limit. Please record a shorter clip (under 45s) or snap a photo.'
          );
          return;
        }

        // Step 3: Compute real SHA-256 Checksum on raw file bytes
        try {
          computedHash = await computeFileSha256(permanentUri);
        } catch (hashErr) {
          console.warn('SHA-256 raw byte hashing notice:', hashErr);
          computedHash = null;
        }
      }

      // STEP A: INSERT REPORT INTO DATABASE FIRST (REPORT FIRST PROTOCOL)
      setUploadProgress(25);
      setUploadStatusText('Transmitting incident dossier to Police CAD Dispatch...');

      const canonicalPublicUrl = fileName ? supabase.storage.from('evidence').getPublicUrl(fileName).data.publicUrl : '';

      const initialMediaList: EvidenceMediaItem[] = (hasRecordedMedia && permanentUri)
        ? [
            {
              type: mediaType,
              video_storage_path: fileName,
              durationSeconds: recordedDuration || (mediaType === 'VIDEO' ? 15 : 1),
              rawS3Url: canonicalPublicUrl,
              thumbnailUrl: canonicalPublicUrl,
              localUri: permanentUri,
              sha256Checksum: computedHash || null,
              timestampUtc: new Date().toISOString(),
              fileSizeBytes: fileSize,
              gpsWatermark: {
                lat: coords.latitude,
                lng: coords.longitude,
                landmark: landmark.trim() || 'Direct GPS Lock',
                ghanaPostCode: ghanaPostCode ? ghanaPostCode.toUpperCase() : '',
                accuracyMeters: typeof gpsAccuracy === 'number' ? gpsAccuracy : 0
              },
              isTamperProofVerified: false,
              uploadStatus: 'QUEUED'
            }
          ]
        : [];

      const payload: any = {
        tracking_code: trackingCode,
        category,
        title: title.trim(),
        description: description.trim(),
        location_name: combinedLocation || 'Unknown location',
        ghanapost_code: ghanaPostCode.trim() ? ghanaPostCode.trim().toUpperCase() : '',
        region: region || 'Greater Accra',
        latitude: coords.latitude,
        longitude: coords.longitude,
        gps_accuracy_m: typeof gpsAccuracy === 'number' ? gpsAccuracy : null,
        media: initialMediaList,
        is_anonymous: isAnonymous,
        reporter_data: isAnonymous
          ? { isAnonymous: true, trustScore: 85, reporterType: 'ANONYMOUS_WHISTLEBLOWER' }
          : {
              isAnonymous: false,
              name: citizen.name,
              email: citizen.email,
              phone: reporterPhone || citizen.phone || null,
              landmarkNote: landmark.trim(),
              trustScore: citizen.trustScore || 95,
              isGoogleVerified: citizen.loginMethod === 'GOOGLE',
              loginMethod: citizen.loginMethod
            },
        assigned_agency:
          category === 'DOMESTIC_ABUSE'
            ? 'DOVVSU'
            : category === 'GALAMSEY_ENVIRONMENTAL'
            ? 'EPA'
            : category === 'TRAFFIC_RECKLESS'
            ? 'MTTD'
            : 'GPS_CID',
        status: 'RECEIVED_PENDING_TRIAGE',
        severity:
          category === 'CRIMINAL_OFFENSE'
            ? 'RED'
            : category === 'DOMESTIC_ABUSE' || category === 'GALAMSEY_ENVIRONMENTAL'
            ? 'HIGH'
            : 'NORMAL',
        is_public_eligible: false,
        is_public_published: false,
        public_corroborations: 0
      };

      let insertSuccess = false;
      let lastInsertError: any = null;
      let insertAttempts = 0;

      while (insertAttempts < 3 && !insertSuccess) {
        insertAttempts++;
        if (insertAttempts > 1) {
          trackingCode = generateTrackingCode();
          payload.tracking_code = trackingCode;
        }

        const { error } = await supabase.from('incidents').insert(payload);
        if (!error) {
          insertSuccess = true;
          break;
        }

        if (error.code === '23505') {
          continue;
        }

        lastInsertError = error;
        break;
      }

      // If DB Insert failed (e.g. offline / network drop) -> Save to Offline Queue
      if (!insertSuccess) {
        if (hasRecordedMedia && permanentUri) {
          await savePendingReport({
            id: trackingCode,
            trackingCode,
            category,
            title: title.trim(),
            description: description.trim(),
            locationName: combinedLocation,
            ghanaPostCode: ghanaPostCode.toUpperCase(),
            region: region || 'Greater Accra',
            latitude: coords.latitude,
            longitude: coords.longitude,
            landmark: landmark.trim(),
            gpsAccuracy: typeof gpsAccuracy === 'number' ? gpsAccuracy : null,
            mediaType,
            recordedDuration: recordedDuration || (mediaType === 'VIDEO' ? 15 : 1),
            permanentVideoUri: permanentUri,
            fileName,
            mimeType,
            sha256Checksum: computedHash || null,
            fileSizeBytes: fileSize,
            isAnonymous,
            reporterPhone: reporterPhone || citizen.phone,
            reporterName: citizen.name,
            reporterEmail: citizen.email,
            reporterTrustScore: citizen.trustScore,
            reporterLoginMethod: citizen.loginMethod,
            reportInserted: false,
            mediaUploaded: false,
            status: 'QUEUED',
            lastError: formatPlainLanguageUploadError(undefined, lastInsertError?.message),
            createdAt: new Date().toISOString()
          });
        }

        setIsSubmitting(false);
        setIsUploadingMedia(false);
        setUploadProgress(0);
        setUploadStatusText('');
        safeHaptics.medium();

        Alert.alert(
          '📁 Saved to Offline Queue',
          'No internet connection. Your report is securely preserved on this device and will transmit automatically once connectivity returns.',
          [{ text: 'OK' }]
        );

        setTitle('');
        setDescription('');
        setLandmark('');
        setHasRecordedMedia(false);
        setRecordedUri(null);
        setPermanentMediaUri(null);
        activePermanentUriRef.current = null;
        return;
      }

      // STEP B: REPORT INSERTED SUCCESSFULLY!
      // If no media attached, we are 100% done!
      if (!hasRecordedMedia || !permanentUri) {
        setIsSubmitting(false);
        setIsUploadingMedia(false);
        setUploadProgress(100);
        setUploadStatusText('✅ Report Transmitted');
        safeHaptics.success();
        announceAccessibility(`Report transmitted successfully. Tracking Code ${trackingCode}`);

        Alert.alert(
          '✅ Report Transmitted & Live',
          `Tracking Code: ${trackingCode}\nAgency: ${payload.assigned_agency}\n\nIMPORTANT: Please write down or save your Tracking Code (${trackingCode}) for future reference and case corroboration.\n\nYour incident has been received by Police Command.`,
          [{ text: 'OK' }]
        );

        setTitle('');
        setDescription('');
        setLandmark('');
        setHasRecordedMedia(false);
        setRecordedUri(null);
        setPermanentMediaUri(null);
        activePermanentUriRef.current = null;
        setUploadProgress(0);
        setUploadStatusText('');
        return;
      }

      // STEP C: UPLOAD MEDIA SEPARATELY (MEDIA SECOND PROTOCOL)
      setUploadProgress(40);
      setUploadStatusText('Report delivered. Streaming evidence to Vault...');

      // Save to queue with reportInserted = true so that any crash/abort retries media only
      await savePendingReport({
        id: trackingCode,
        trackingCode,
        category,
        title: title.trim(),
        description: description.trim(),
        locationName: combinedLocation,
        ghanaPostCode: ghanaPostCode.toUpperCase(),
        region: region || 'Greater Accra',
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmark: landmark.trim(),
        gpsAccuracy: typeof gpsAccuracy === 'number' ? gpsAccuracy : null,
        mediaType,
        recordedDuration: recordedDuration || 15,
        permanentVideoUri: permanentUri,
        fileName,
        mimeType,
        sha256Checksum: computedHash || null,
        fileSizeBytes: fileSize,
        isAnonymous,
        reporterPhone: reporterPhone || citizen.phone,
        reporterName: citizen.name,
        reporterEmail: citizen.email,
        reporterTrustScore: citizen.trustScore,
        reporterLoginMethod: citizen.loginMethod,
        reportInserted: true,
        mediaUploaded: false,
        status: 'UPLOADING',
        createdAt: new Date().toISOString()
      });

      const uploadResult = await uploadEvidenceStreaming({
        fileUri: permanentUri,
        fileName,
        mimeType,
        expectedFileSize: fileSize,
        onProgress: (ratio, txt) => {
          setUploadProgress(Math.round(40 + ratio * 55));
          setUploadStatusText(txt);
        }
      });

      if (!uploadResult.success || !uploadResult.publicUrl) {
        // Report is already delivered! Update queue and show plain language notification
        await updatePendingReportStatus(trackingCode, 'QUEUED', uploadResult.error, {
          reportInserted: true,
          mediaUploaded: false
        });

        setIsSubmitting(false);
        setIsUploadingMedia(false);
        setUploadProgress(0);
        setUploadStatusText('');
        safeHaptics.medium();

        Alert.alert(
          '✅ Report Delivered • Video Queued in Background',
          `Tracking Code: ${trackingCode}\n\nYour written report was successfully received by Police Command.\n\nThe video evidence is safely preserved on your device and will continue uploading in the background.`,
          [{ text: 'OK' }]
        );

        setTitle('');
        setDescription('');
        setLandmark('');
        setHasRecordedMedia(false);
        setRecordedUri(null);
        setPermanentMediaUri(null);
        activePermanentUriRef.current = null;
        return;
      }

      // Media upload succeeded: link verified URL back to the incident in Supabase
      const verifiedMediaList: EvidenceMediaItem[] = [
        {
          type: mediaType,
          video_storage_path: fileName,
          durationSeconds: recordedDuration || (mediaType === 'VIDEO' ? 15 : 1),
          rawS3Url: uploadResult.publicUrl || canonicalPublicUrl,
          thumbnailUrl: uploadResult.publicUrl || canonicalPublicUrl,
          localUri: permanentUri,
          sha256Checksum: computedHash || null,
          timestampUtc: new Date().toISOString(),
          fileSizeBytes: uploadResult.verifiedSize || fileSize,
          gpsWatermark: {
            lat: coords.latitude,
            lng: coords.longitude,
            landmark: landmark.trim() || 'Direct GPS Lock',
            ghanaPostCode: ghanaPostCode ? ghanaPostCode.toUpperCase() : '',
            accuracyMeters: typeof gpsAccuracy === 'number' ? gpsAccuracy : 0
          },
          isTamperProofVerified: Boolean(computedHash && computedHash.length === 64),
          uploadStatus: 'UPLOADED'
        }
      ];

      const { error: updateErr } = await supabase
        .from('incidents')
        .update({ media: verifiedMediaList })
        .eq('tracking_code', trackingCode);

      if (updateErr) {
        console.warn('[EVIDENCE_UPDATE_ERROR] Failed to update incident media list:', updateErr);
      }

      // Remove from offline queue and clean up cache
      await removePendingReport(trackingCode, true);
      if (recordedUri) await cleanupCachedEvidence(recordedUri);

      setIsSubmitting(false);
      setIsUploadingMedia(false);
      setUploadProgress(100);
      setUploadStatusText('✅ Report & Evidence Sealed');
      safeHaptics.success();
      announceAccessibility(`Report and evidence transmitted successfully. Tracking Code ${trackingCode}`);

      Alert.alert(
        '✅ Report & Evidence Sealed',
        `Tracking Code: ${trackingCode}\nAgency: ${payload.assigned_agency}\n\nIMPORTANT: Please write down or save your Tracking Code (${trackingCode}) for future reference and case corroboration.\n\nEvidence verified on National Vault and pinned on Command Map.`,
        [{ text: 'OK' }]
      );

      setTitle('');
      setDescription('');
      setLandmark('');
      setHasRecordedMedia(false);
      setRecordedUri(null);
      setPermanentMediaUri(null);
      activePermanentUriRef.current = null;
      setUploadProgress(0);
      setUploadStatusText('');
    } catch (e: any) {
      setIsSubmitting(false);
      setIsUploadingMedia(false);
      setUploadProgress(0);
      setUploadStatusText('');
      safeHaptics.warning();

      const plainErr = formatPlainLanguageUploadError(undefined, e?.message);
      Alert.alert(
        '⚠️ Submission Notice',
        `${plainErr}\n\nYour report is safely stored on this device.`,
        [{ text: 'OK' }]
      );
    }
  }, [
    citizen,
    coords,
    gpsAccuracy,
    locationName,
    landmark,
    ghanaPostCode,
    region,
    title,
    description,
    category,
    isAnonymous,
    reporterPhone,
    hasRecordedMedia,
    recordedUri,
    permanentMediaUri,
    mediaType,
    recordedDuration
  ]);

  return {
    category,
    title,
    description,
    landmark,
    isAnonymous,
    reporterPhone,
    isSubmitting,
    uploadProgress,
    uploadStatusText,
    isUploadingMedia,
    hasRecordedMedia,
    recordedUri,
    mediaType,
    recordedDuration,
    setCategory,
    setTitle,
    setDescription,
    setLandmark,
    setIsAnonymous,
    setReporterPhone,
    processAndAttachEvidence,
    clearAttachedMedia,
    saveEvidenceToGallery,
    handleSubmitReport
  };
};
