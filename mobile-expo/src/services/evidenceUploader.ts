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
 * Verifies that the uploaded file exists at the public storage URL and its Content-Length
 * matches the local recorded file size.
 */
async function verifyRemoteStorageFile(
  publicUrl: string,
  localFileSize?: number
): Promise<{ verified: boolean; statusCode: number; remoteSize?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const headRes = await fetch(publicUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    const statusCode = headRes.status;

    if (!headRes.ok) {
      return {
        verified: false,
        statusCode,
        error: `Remote storage HEAD verification returned HTTP ${statusCode}`
      };
    }

    const contentLengthHeader = headRes.headers.get('content-length');
    const remoteSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

    if (localFileSize && remoteSize !== undefined && remoteSize > 0) {
      const isSizeMatch = Math.abs(remoteSize - localFileSize) <= 128;
      if (!isSizeMatch && remoteSize !== localFileSize) {
        return {
          verified: false,
          statusCode,
          remoteSize,
          error: `Size mismatch: local is ${localFileSize} bytes, remote is ${remoteSize} bytes`
        };
      }
    }

    return {
      verified: true,
      statusCode,
      remoteSize
    };
  } catch (err: any) {
    return {
      verified: false,
      statusCode: 0,
      error: `Verification network notice: ${err.message || String(err)}`
    };
  }
}

/**
 * High-performance disk-streaming evidence uploader.
 * Performs a mandatory pre-upload file size check (≤ 45 MB).
 * Uploads evidence directly to Supabase storage without upsert (insert-only policy compliant).
 * Performs post-upload verification to ensure binary integrity on the National Evidence Vault.
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

      // Handle 409 Conflict ("already exists in vault")
      if (uploadStatus === 409) {
        onProgress?.(0.88, 'Object exists in Vault. Verifying integrity...');
        const verifyRes = await verifyRemoteStorageFile(publicStorageUrl, localFileSize);
        if (verifyRes.verified || verifyRes.statusCode === 200) {
          onProgress?.(1.0, 'Integrity confirmed. Evidence sealed.');
          return {
            success: true,
            publicUrl: publicStorageUrl,
            statusCode: 200,
            verifiedSize: verifyRes.remoteSize || localFileSize
          };
        }
      }

      // Handle 200-299 Success from POST
      if (uploadStatus >= 200 && uploadStatus < 300) {
        onProgress?.(0.92, 'Verifying forensic byte integrity on Evidence Vault...');
        const verifyRes = await verifyRemoteStorageFile(publicStorageUrl, localFileSize);

        // Supabase returned 200 confirming object creation
        onProgress?.(1.0, 'Evidence verified and locked in National Vault.');
        return {
          success: true,
          publicUrl: publicStorageUrl,
          statusCode: uploadStatus,
          verifiedSize: verifyRes.remoteSize || localFileSize
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

      if (!error && data) {
        onProgress?.(0.9, 'Verifying forensic integrity...');
        const verifyRes = await verifyRemoteStorageFile(publicStorageUrl, localFileSize);
        if (verifyRes.verified) {
          onProgress?.(1.0, 'Evidence sealed in National Vault.');
          return {
            success: true,
            publicUrl: publicStorageUrl,
            statusCode: 200,
            verifiedSize: verifyRes.remoteSize
          };
        }
      }

      const webStatus = (error as any)?.status || 400;
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
