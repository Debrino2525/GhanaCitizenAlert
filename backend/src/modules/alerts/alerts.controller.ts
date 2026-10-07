import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { EmergencyAlertsService, AlertType } from './alerts.service';

@Controller('v1/alerts')
export class AlertsController {
  constructor(private readonly alertsService: EmergencyAlertsService) {}

  @Get()
  async getActiveAlerts() {
    return this.alertsService.getActiveAlerts();
  }

  @Post()
  async requestAlert(@Body() body: {
    alertType: AlertType;
    title: string;
    subjectName?: string;
    subjectAge?: number;
    subjectPhotoUrl: string;
    lastSeenLocation: string;
    ghanaPostCode: string;
    radiusKm: number;
    details: string;
    suspectDetails?: string;
    vehicleDetails?: string;
    requestingOfficerId: string;
  }) {
    return this.alertsService.requestAlert(body);
  }

  @Post(':id/authorize')
  async authorizeAlert(
    @Param('id') id: string,
    @Body('commanderId') commanderId: string,
    @Body('approverMfaCode') approverMfaCode: string
  ) {
    return this.alertsService.authorizeAlert(id, commanderId, approverMfaCode);
  }

  @Post(':id/sightings')
  async submitSightingTip(
    @Param('id') alertId: string,
    @Body() body: {
      ghanaPostCode: string;
      locationName: string;
      comment: string;
      reporterPhone?: string;
      photoUrl?: string;
    }
  ) {
    return this.alertsService.submitSightingTip({
      alertId,
      ...body
    });
  }

  @Get(':id/sightings')
  async getSightings(@Param('id') alertId: string) {
    return this.alertsService.getSightingsForAlert(alertId);
  }
}
