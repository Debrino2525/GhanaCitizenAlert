import { Controller, Post, Get, Body, Param, Query, Patch, Headers } from '@nestjs/common';
import { IncidentsService, CreateIncidentInput } from './incidents.service';
import { IncidentStatus, AgencyCode } from '../../core/entities/incident.entity';

@Controller('v1/incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  async createIncident(
    @Body() body: CreateIncidentInput,
    @Headers('x-forwarded-for') clientIp?: string
  ) {
    return this.incidentsService.createIncident({
      ...body,
      clientIp: clientIp || '127.0.0.1'
    });
  }

  @Get()
  async listIncidents(
    @Query('agency') agency?: AgencyCode,
    @Query('status') status?: IncidentStatus,
    @Query('region') region?: string
  ) {
    return this.incidentsService.listIncidents({ agency, status, region });
  }

  @Get(':id')
  async getIncident(@Param('id') id: string) {
    return this.incidentsService.getIncidentById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') newStatus: IncidentStatus,
    @Body('note') note?: string
  ) {
    return this.incidentsService.updateIncidentStatus(
      id,
      newStatus,
      'DISPATCHER-OFFICER-001',
      'DISPATCHER',
      note
    );
  }

  @Get(':id/audit-trail')
  async getAuditTrail() {
    return this.incidentsService.getAuditLedger();
  }
}
