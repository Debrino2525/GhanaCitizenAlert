export interface SMSDispatchResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  recipient: string;
  isMocked: boolean;
}

export interface ISMSUSSDGatewayAdapter {
  sendSMS(recipientPhoneNumber: string, messageBody: string): Promise<SMSDispatchResult>;
  broadcastEmergencySMS(regionOrDistrict: string, alertText: string): Promise<{ totalDispatched: number; isMocked: boolean }>;
}

export class MockSMSUSSDGatewayAdapter implements ISMSUSSDGatewayAdapter {
  async sendSMS(recipientPhoneNumber: string, messageBody: string): Promise<SMSDispatchResult> {
    // Simulated telco dispatch via Hubtel/Arkesel mock
    return {
      messageId: `SMS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'SENT',
      recipient: recipientPhoneNumber,
      isMocked: true
    };
  }

  async broadcastEmergencySMS(regionOrDistrict: string, alertText: string): Promise<{ totalDispatched: number; isMocked: boolean }> {
    return {
      totalDispatched: 85000,
      isMocked: true
    };
  }
}
