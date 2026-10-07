import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('citizen/otp/request')
  async requestOtp(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.requestCitizenOtp(phoneNumber);
  }

  @Post('citizen/otp/verify')
  async verifyOtp(
    @Body('sessionId') sessionId: string,
    @Body('code') code: string
  ) {
    return this.authService.verifyCitizenOtp(sessionId, code);
  }

  @Post('citizen/ghana-card/verify')
  async verifyGhanaCard(@Body('ghanaCardNumber') ghanaCardNumber: string) {
    return this.authService.verifyGhanaCard(ghanaCardNumber);
  }
}
