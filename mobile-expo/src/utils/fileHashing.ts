import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

/**
 * Converts an ArrayBuffer to a lowercase 64-character hexadecimal SHA-256 string.
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes SHA-256 over raw file bytes using Expo SDK 57 File & Crypto API.
 * Reads bytes into an ArrayBuffer without converting whole file to base64.
 * Returns null if the file cannot be read or hashing fails.
 */
export async function computeFileSha256(fileUri: string): Promise<string | null> {
  try {
    const file = new File(fileUri);
    const arrayBuffer = await file.arrayBuffer();
    const digestBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, arrayBuffer);
    return bufferToHex(digestBuffer);
  } catch (err) {
    console.warn('Failed to compute file SHA-256 hash over raw bytes:', err);
    return null;
  }
}

/**
 * Computes SHA-256 over an in-memory BufferSource (Uint8Array or ArrayBuffer).
 */
export async function computeBytesSha256(data: BufferSource): Promise<string> {
  const digestBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  return bufferToHex(digestBuffer);
}

/**
 * Validates against the known test vector:
 * SHA-256 of ASCII "abc" = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
 */
export const KNOWN_TEST_VECTOR_ABC_HASH =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

export async function verifyKnownSha256Vector(): Promise<boolean> {
  // ASCII 'a' = 0x61, 'b' = 0x62, 'c' = 0x63
  const testInput = new Uint8Array([0x61, 0x62, 0x63]);
  const computed = await computeBytesSha256(testInput);
  return computed.toLowerCase() === KNOWN_TEST_VECTOR_ABC_HASH;
}
