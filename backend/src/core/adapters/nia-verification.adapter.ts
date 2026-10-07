export interface NIACardVerificationResult {
  isValid: boolean;
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F';
  isMocked: boolean;
  verificationHash: string;
}

export interface INIAVerificationAdapter {
  verifyGhanaCard(ghanaCardNumber: string): Promise<NIACardVerificationResult>;
  validateFormat(ghanaCardNumber: string): boolean;
}

export class MockNIAVerificationAdapter implements INIAVerificationAdapter {
  validateFormat(ghanaCardNumber: string): boolean {
    if (!ghanaCardNumber) return false;
    // Format: GHA-000000000-0
    const regex = /^GHA-\d{9}-\d{1}$/i;
    return regex.test(ghanaCardNumber.trim().toUpperCase());
  }

  async verifyGhanaCard(ghanaCardNumber: string): Promise<NIACardVerificationResult> {
    const normalized = ghanaCardNumber.trim().toUpperCase();
    if (!this.validateFormat(normalized)) {
      return {
        isValid: false,
        isMocked: true,
        verificationHash: ''
      };
    }

    // Mock deterministic identity lookup
    return {
      isValid: true,
      fullName: 'Kwame Mensah',
      dateOfBirth: '1992-05-14',
      gender: 'M',
      isMocked: true,
      verificationHash: `NIA-SIG-${Buffer.from(normalized).toString('base64')}`
    };
  }
}
