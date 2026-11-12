import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { getRealFileSizeBytes, formatBytesToMB } from '../utils/fileSize';

export interface UploadEvidenceOptions {
  fileUri: string;
  fileName: string;
  mimeType: string;
  expectedFileSize?: number;
  onProgress?: (progressRatio: number, statusText: string) => void;
}

export interface UploadEvidenceResult {
  success: boolean;
  publicUrl: string;
  statusCode?: number;
  error?: string;
  verifiedSize?: number;
}

/**
 * Translates raw HTTP and network exceptions into clear, citizen-friendly messages.
 * Never exposes raw JSON or stack traces.
 */
export function formatPlainLanguageUploadError(statusCode?: number, rawError?: string): string {
  if (statusCode === 413 || (rawError && /payload too large|entitytoolarge|exceeded the maximum/i.test(rawError))) {
    return 'Evidence file exceeds 45 MB upload limit. Please record a shorter clip (under 45s) or snap a photo.';
  }
  if (statusCode === 408 || (rawError && /timeout|timed out/i.test(rawError))) {
    return 'Evidence upload timed out due to slow connection. It is saved safely and will retry.';
  }
  if (statusCode === 401 || statusCode === 403) {
    return 'Authentication notice with emergency vault. Your report is preserved locally.';
  }
  if (statusCode && statusCode >= 500) {
    return 'Emergency Vault server is temporarily busy. Your evidence is safely preserved on device and will retry automatically.';
  }
  if (rawError && /network|offline|internet|reach/i.test(rawError)) {
    return 'No internet connection. Evidence is safely stored on device and will transmit when connection returns.';
  }
  return 'Evidence could not be transmitted at this moment. It remains safely saved on your device and will retry.';
}

/**
 * High-performance disk-streaming evidence uploader.
 * Performs a mandatory pre-upload file size check (≤ 45 MB).
 * Uploads evidence directly to Supabase storage without upsert (insert-only policy compliant).
 *
 * The evidence bucket is private and citizens have no read access, so the upload
 * response itself is the confirmation: 2xx means the object was created, and 409
 * means an earlier attempt already stored it (names are unique per report and the
 * bucket is insert-only, so it cannot have been overwritten).
 *
 * `publicUrl` is kept as the canonical object reference stored in incident media
 * (attach_incident_media validates it); it is not directly fetchable. Viewers must
 * use createSignedUrl().
 */
export async function uploadEvidenceStreaming({
  fileUri,
  fileName,
  mimeType,
  expectedFileSize,
  onProgress
}: UploadEvidenceOptions): Promise<UploadEvidenceResult> {
  const publicStorageUrl = supabase.storage.from('evidence').getPublicUrl(fileName).data.publicUrl;

  try {
    // 1. Mandatory Pre-Upload Size Check using real file bytes
    const localFileSize = (await getRealFileSizeBytes(fileUri)) || expectedFileSize || 0;
    console.log(`[EVIDENCE_UPLOAD] Pre-upload check: size=${localFileSize} bytes (${formatBytesToMB(localFileSize)}), uri=${fileUri}`);

    if (localFileSize > 45 * 1024 * 1024) {
      const sizeErr = 'Evidence file exceeds 45 MB upload limit. Please record a shorter clip (under 45s) or snap a photo.';
      console.warn(`[EVIDENCE_UPLOAD] Blocked oversized upload: ${localFileSize} bytes`);
      return {
        success: false,
        publicUrl: '',
        statusCode: 413,
        error: sizeErr
      };
    }

    // 2. Retrieve current auth token if available (or fallback to anon key)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || supabaseAnonKey;

    const endpointUrl = `${supabaseUrl}/storage/v1/object/evidence/${encodeURIComponent(fileName)}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': mimeType
    };

    onProgress?.(0.1, 'Securing direct channel to Evidence Vault...');

    if (Platform.OS !== 'web') {
      // Native iOS & Android: createUploadTask with real-time byte progress reporting and timeout protection
      let uploadStatus = 0;
      let uploadBody = '';

      try {
        const uploadTask = FileSystem.createUploadTask(
          endpointUrl,
          fileUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers
          },
          (progressData) => {
            if (progressData.totalBytesExpectedToSend > 0) {
              const ratio = progressData.totalBytesSent / progressData.totalBytesExpectedToSend;
              const progressPct = 0.1 + Math.min(0.75, Math.max(0, ratio * 0.75));
              const mbSent = (progressData.totalBytesSent / (1024 * 1024)).toFixed(1);
              const mbTotal = (progressData.totalBytesExpectedToSend / (1024 * 1024)).toFixed(1);
              onProgress?.(progressPct, `Streaming evidence to Vault (${mbSent}/${mbTotal} MB)...`);
            }
          }
        );

        // Enforce a 75-second timeout on cellular network transfers to prevent hanging
        const timeoutPromise = new Promise<{ status: number; body: string }>((_, reject) => {
          const timer = setTimeout(() => {
            uploadTask.cancelAsync().catch(() => {});
            reject(new Error('Evidence upload timed out. Connection is slow.'));
          }, 75000);
          // When uploadTask completes, clear timeout
          uploadTask.uploadAsync().then(
            (val) => {
              clearTimeout(timer);
              if (val) {
                uploadStatus = val.status;
                uploadBody = val.body || '';
              }
            },
            (err) => {
              clearTimeout(timer);
            }
          );
        });

        const res = await Promise.race([uploadTask.uploadAsync(), timeoutPromise]);
        if (res) {
          uploadStatus = res.status;
          uploadBody = res.body || '';
        }
      } catch (taskErr: any) {
        console.warn('createUploadTask notice, trying uploadAsync fallback:', taskErr);
        if (uploadStatus === 0) {
          try {
            const res = await FileSystem.uploadAsync(endpointUrl, fileUri, {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers
            });
            uploadStatus = res.status;
            uploadBody = res.body || '';
          } catch (fallbackErr: any) {
            uploadStatus = 0;
            uploadBody = fallbackErr.message || '';
          }
        }
      }

      // 409 Conflict: a previous attempt already stored this object
      if (uploadStatus === 409 || /already exists|duplicate/i.test(uploadBody)) {
        onProgress?.(1.0, 'Evidence already sealed in National Vault.');
        return {
          success: true,
          publicUrl: publicStorageUrl,
          statusCode: 200,
          verifiedSize: localFileSize
        };
      }

      // 200-299: Supabase confirmed object creation
      if (uploadStatus >= 200 && uploadStatus < 300) {
        onProgress?.(1.0, 'Evidence locked in National Vault.');
        return {
          success: true,
          publicUrl: publicStorageUrl,
          statusCode: uploadStatus,
          verifiedSize: localFileSize
        };
      }

      // Failure case: return clean plain-language error
      return {
        success: false,
        publicUrl: '',
        statusCode: uploadStatus,
        error: formatPlainLanguageUploadError(uploadStatus, uploadBody)
      };
    } else {
      // Web fallback: Supabase JS upload without upsert
      onProgress?.(0.3, 'Reading evidence buffer for web transmission...');
      const file = new File(fileUri);
      const binaryArrayBuffer = await file.arrayBuffer();

      onProgress?.(0.6, 'Transmitting evidence to National Vault...');
      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(fileName, binaryArrayBuffer, {
          contentType: mimeType,
          upsert: false
        });

      const webStatus = Number((error as any)?.statusCode || (error as any)?.status) || 400;
      const alreadyStored = webStatus === 409 || /already exists|duplicate/i.test(error?.message || '');

      if ((!error && data) || alreadyStored) {
        onProgress?.(1.0, 'Evidence sealed in National Vault.');
        return {
          success: true,
          publicUrl: publicStorageUrl,
          statusCode: 200,
          verifiedSize: localFileSize
        };
      }

      return {
        success: false,
        publicUrl: '',
        statusCode: webStatus,
        error: formatPlainLanguageUploadError(webStatus, error?.message)
      };
    }
  } catch (err: any) {
    return {
      success: false,
      publicUrl: '',
      statusCode: 500,
      error: formatPlainLanguageUploadError(500, err?.message)
    };
  }
}

/**
 * Safely cleans up temporary video/photo recordings from the cache directory
 * after evidence is cryptographically sealed and transmitted to backend storage.
 */
export async function cleanupCachedEvidence(fileUri: string | null): Promise<void> {
  if (!fileUri || Platform.OS === 'web') return;
  try {
    const file = new File(fileUri);
    if (file.exists) {
      file.delete();
      return;
    }
  } catch {
    // Fallback to legacy
  }
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('Failed to delete temporary evidence cache:', err);
  }
}
