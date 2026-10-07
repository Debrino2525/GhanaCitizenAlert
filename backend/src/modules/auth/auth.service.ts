import * as crypto from 'crypto';
import { INIAVerificationAdapter } from '../../core/adapters/nia-verification.adapter';
import { ISMSUSSDGatewayAdapter } from '../../core/adapters/sms-ussd-gateway.adapter';

export interface CitizenAuthSession {
  sessionId: string;
  phoneNumber: string;
  otpCode: string;
  expiresAt: number;
}

export class AuthService {
  private otpSessions: Map<string, CitizenAuthSession> = new Map();

  constructor(
    private readonly niaAdapter: INIAVerificationAdapter,
    private readonly smsAdapter: ISMSUSSDGatewayAdapter
  ) {}

  async requestCitizenOtp(phoneNumber: string): Promise<{ sessionId: string; expiresInSeconds: number }> {
    const sessionId = crypto.randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    this.otpSessions.set(sessionId, {
      sessionId,
      phoneNumber,
      otpCode,
      expiresAt
    });

    // Send OTP via SMS Adapter
    await this.smsAdapter.sendSMS(
      phoneNumber,
      `Your CitizenAlert Ghana verification code is: ${otpCode}. Valid for 5 minutes.`
    );

    return {
      sessionId,
      expiresInSeconds: 300
    };
  }

  async verifyCitizenOtp(sessionId: string, code: string): Promise<{ accessToken: string; phoneNumber: string; trustScore: number }> {
    const session = this.otpSessions.get(sessionId);
    if (!session) throw new Error('Invalid or expired OTP session');
    if (Date.now() > session.expiresAt) {
      this.otpSessions.delete(sessionId);
      throw new Error('OTP code has expired');
    }
    if (session.otpCode !== code) {
      throw new Error('Incorrect OTP verification code');
    }

    this.otpSessions.delete(sessionId);

    return {
      accessToken: `CITIZEN_JWT_${session.phoneNumber}_${Date.now()}`,
      phoneNumber: session.phoneNumber,
      trustScore: 80
    };
  }

  async verifyGhanaCard(ghanaCardNumber: string): Promise<{ isValid: boolean; trustScore: number; verificationHash: string }> {
    const result = await this.niaAdapter.verifyGhanaCard(ghanaCardNumber);
    return {
      isValid: result.isValid,
      trustScore: result.isValid ? 95 : 0,
      verificationHash: result.verificationHash
    };
  }
}
