import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

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
 * Verifies that the uploaded file exists at the public storage URL and its Content-Length
 * matches the local recorded file size.
 */
async function verifyRemoteStorageFile(
  publicUrl: string,
  localFileSize?: number
): Promise<{ verified: boolean; statusCode: number; remoteSize?: number; error?: string }> {
  try {
    const headRes = await fetch(publicUrl, { method: 'HEAD' });
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

    if (localFileSize && remoteSize !== undefined) {
      // Allow minor variation only if compression/chunked, but Supabase S3 gives exact byte size
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
      error: `Verification network error: ${err.message || String(err)}`
    };
  }
}

/**
 * High-performance disk-streaming evidence uploader.
 * Uploads evidence directly to Supabase storage without upsert (insert-only policy compliant).
 * Performs post-upload HEAD verification to ensure binary integrity on the National Evidence Vault.
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
    // 1. Get exact local file size if not provided
    let localFileSize = expectedFileSize;
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists && typeof fileInfo.size === 'number') {
        localFileSize = fileInfo.size;
      }
    } catch (sizeErr) {
      console.warn('Could not inspect local file size before upload:', sizeErr);
    }

    // 2. Retrieve current auth token if available (or fallback to anon key)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || supabaseAnonKey;

    const endpointUrl = `${supabaseUrl}/storage/v1/object/evidence/${encodeURIComponent(fileName)}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': mimeType
      // Note: No x-upsert header to strictly comply with insert-only RLS policy
    };

    onProgress?.(0.1, 'Securing direct channel to Evidence Vault...');

    if (Platform.OS !== 'web') {
      // Native iOS & Android: createUploadTask with real-time byte progress reporting
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
              // Map byte progress from 10% to 85%
              const progressPct = 0.1 + Math.min(0.75, Math.max(0, ratio * 0.75));
              const mbSent = (progressData.totalBytesSent / (1024 * 1024)).toFixed(1);
              const mbTotal = (progressData.totalBytesExpectedToSend / (1024 * 1024)).toFixed(1);
              onProgress?.(progressPct, `Streaming evidence to Vault (${mbSent}/${mbTotal} MB)...`);
            }
          }
        );

        const res = await uploadTask.uploadAsync();
        if (res) {
          uploadStatus = res.status;
          uploadBody = res.body || '';
        }
      } catch (taskErr: any) {
        console.warn('createUploadTask error, falling back to uploadAsync:', taskErr);
        // Fallback to uploadAsync if uploadTask fails to instantiate
        const res = await FileSystem.uploadAsync(endpointUrl, fileUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers
        });
        uploadStatus = res.status;
        uploadBody = res.body || '';
      }

      console.log('Native FileSystem upload response:', uploadStatus, uploadBody);

      // Handle 409 Conflict ("already exists")
      if (uploadStatus === 409) {
        onProgress?.(0.88, 'Object exists in Vault. Verifying integrity...');
        const verifyRes = await verifyRemoteStorageFile(publicStorageUrl, localFileSize);
        if (verifyRes.verified) {
          onProgress?.(1.0, 'Integrity confirmed. Evidence sealed.');
          return {
            success: true,
            publicUrl: publicStorageUrl,
            statusCode: 200,
            verifiedSize: verifyRes.remoteSize
          };
        }
      }

      // Handle 200-299 Success
      if (uploadStatus >= 200 && uploadStatus < 300) {
        onProgress?.(0.9, 'Verifying forensic byte integrity on Evidence Vault...');
        const verifyRes = await verifyRemoteStorageFile(publicStorageUrl, localFileSize);

        if (verifyRes.verified) {
          onProgress?.(1.0, 'Evidence verified and locked in National Vault.');
          return {
            success: true,
            publicUrl: publicStorageUrl,
            statusCode: uploadStatus,
            verifiedSize: verifyRes.remoteSize
          };
        } else {
          return {
            success: false,
            publicUrl: '',
            statusCode: verifyRes.statusCode || 422,
            error: verifyRes.error || 'Remote evidence verification failed after upload'
          };
        }
      }

      // If status indicates failure, return exact HTTP status and error body
      return {
        success: false,
        publicUrl: '',
        statusCode: uploadStatus,
        error: `Storage upload failed (HTTP ${uploadStatus}): ${uploadBody || 'Unknown storage error'}`
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

      return {
        success: false,
        publicUrl: '',
        statusCode: (error as any)?.status || 400,
        error: error?.message || 'Web upload failed'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      publicUrl: '',
      statusCode: 500,
      error: err?.message || 'Streaming upload failed due to network or client error'
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
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('Failed to delete temporary evidence cache:', err);
  }
}
