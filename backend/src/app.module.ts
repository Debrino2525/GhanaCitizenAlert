import { Module } from '@nestjs/common';
import { IncidentsController } from './modules/incidents/incidents.controller';
import { IncidentsService } from './modules/incidents/incidents.service';
import { InMemoryIncidentRepository } from './modules/incidents/incidents.repository';
import { AlertsController } from './modules/alerts/alerts.controller';
import { EmergencyAlertsService } from './modules/alerts/alerts.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { TriageRoutingService } from './modules/triage/triage.service';
import { EvidenceVaultService } from './core/crypto/evidence-vault.service';
import { MockGhanaPostGPSAdapter } from './core/adapters/ghanapost-gps.adapter';
import { MockNIAVerificationAdapter } from './core/adapters/nia-verification.adapter';
import { MockSMSUSSDGatewayAdapter } from './core/adapters/sms-ussd-gateway.adapter';
import { MockCellBroadcastAdapter } from './core/adapters/cell-broadcast.adapter';
import { MockAgencyDispatchCADAdapter } from './core/adapters/agency-cad.adapter';

@Module({
  imports: [],
  controllers: [IncidentsController, AlertsController, AuthController],
  providers: [
    {
      provide: 'IIncidentRepository',
      useClass: InMemoryIncidentRepository
    },
    {
      provide: 'IGhanaPostGPSAdapter',
      useClass: MockGhanaPostGPSAdapter
    },
    {
      provide: 'INIAVerificationAdapter',
      useClass: MockNIAVerificationAdapter
    },
    {
      provide: 'ISMSUSSDGatewayAdapter',
      useClass: MockSMSUSSDGatewayAdapter
    },
    {
      provide: 'ICellBroadcastAdapter',
      useClass: MockCellBroadcastAdapter
    },
    {
      provide: 'IAgencyDispatchCADAdapter',
      useClass: MockAgencyDispatchCADAdapter
    },
    TriageRoutingService,
    EvidenceVaultService,
    {
      provide: IncidentsService,
      useFactory: (repo, gps, triage, vault, cad) => new IncidentsService(repo, gps, triage, vault, cad),
      inject: [
        'IIncidentRepository',
        'IGhanaPostGPSAdapter',
        TriageRoutingService,
        EvidenceVaultService,
        'IAgencyDispatchCADAdapter'
      ]
    },
    {
      provide: EmergencyAlertsService,
      useFactory: (cb, sms, gps) => new EmergencyAlertsService(cb, sms, gps),
      inject: [
        'ICellBroadcastAdapter',
        'ISMSUSSDGatewayAdapter',
        'IGhanaPostGPSAdapter'
      ]
    },
    {
      provide: AuthService,
      useFactory: (nia, sms) => new AuthService(nia, sms),
      inject: [
        'INIAVerificationAdapter',
        'ISMSUSSDGatewayAdapter'
      ]
    }
  ],
})
export class AppModule {}
