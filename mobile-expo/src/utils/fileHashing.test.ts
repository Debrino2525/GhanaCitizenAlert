import { KNOWN_TEST_VECTOR_ABC_HASH, verifyKnownSha256Vector } from './fileHashing';

/**
 * Known Vector Test: SHA-256 of ASCII "abc" = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
 */
export async function runFileHashingTest(): Promise<{ passed: boolean; message: string }> {
  const isMatch = await verifyKnownSha256Vector();
  if (isMatch) {
    return {
      passed: true,
      message: `SHA-256 test vector passed for ASCII "abc": ${KNOWN_TEST_VECTOR_ABC_HASH}`
    };
  }
  return {
    passed: false,
    message: `SHA-256 test vector failed for ASCII "abc"`
  };
}
