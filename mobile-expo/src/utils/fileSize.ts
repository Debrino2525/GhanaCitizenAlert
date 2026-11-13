import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';

/**
 * Reads the real file size in bytes using Expo SDK 57 File API
 * with fallback to expo-file-system/legacy.
 */
export async function getRealFileSizeBytes(fileUri: string): Promise<number> {
  if (!fileUri) return 0;

  // 1. Try modern SDK 57 File API
  try {
    const file = new File(fileUri);
    if (typeof file.size === 'number' && file.size > 0) {
      return file.size;
    }
    const info = file.info();
    if (typeof info?.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch (err) {
    // Continue to legacy fallback
  }

  // 2. Try legacy getInfoAsync
  try {
    const legacyInfo = await FileSystemLegacy.getInfoAsync(fileUri);
    if (legacyInfo.exists && typeof legacyInfo.size === 'number') {
      return legacyInfo.size;
    }
  } catch (legacyErr) {
    console.warn('[FILE_SIZE] Could not read file size:', legacyErr);
  }

  return 0;
}

/**
 * Format bytes to readable megabytes (MB)
 */
export function formatBytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
