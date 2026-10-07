import { IncidentEntity, IncidentStatus, AgencyCode } from '../../core/entities/incident.entity';

export interface IIncidentRepository {
  create(incident: IncidentEntity): Promise<IncidentEntity>;
  findById(id: string): Promise<IncidentEntity | null>;
  findByTrackingCode(code: string): Promise<IncidentEntity | null>;
  findAll(filters?: { agency?: AgencyCode; status?: IncidentStatus; region?: string }): Promise<IncidentEntity[]>;
  updateStatus(id: string, newStatus: IncidentStatus, note?: string): Promise<IncidentEntity | null>;
  updateAgency(id: string, agency: AgencyCode): Promise<IncidentEntity | null>;
  incrementCorroboration(id: string): Promise<number>;
}

export class InMemoryIncidentRepository implements IIncidentRepository {
  private incidents: Map<string, IncidentEntity> = new Map();

  async create(incident: IncidentEntity): Promise<IncidentEntity> {
    this.incidents.set(incident.id, { ...incident });
    return { ...incident };
  }

  async findById(id: string): Promise<IncidentEntity | null> {
    const inc = this.incidents.get(id);
    return inc ? { ...inc } : null;
  }

  async findByTrackingCode(code: string): Promise<IncidentEntity | null> {
    for (const inc of this.incidents.values()) {
      if (inc.trackingCode === code) return { ...inc };
    }
    return null;
  }

  async findAll(filters?: { agency?: AgencyCode; status?: IncidentStatus; region?: string }): Promise<IncidentEntity[]> {
    let list = Array.from(this.incidents.values());

    if (filters?.agency) {
      list = list.filter(i => i.assignedAgency === filters.agency || i.secondaryAgencies.includes(filters.agency));
    }
    if (filters?.status) {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters?.region) {
      list = list.filter(i => i.region === filters.region);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateStatus(id: string, newStatus: IncidentStatus, note?: string): Promise<IncidentEntity | null> {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    inc.status = newStatus;
    inc.updatedAt = new Date().toISOString();
    if (note) {
      inc.investigatorNotes.push(note);
    }
    this.incidents.set(id, inc);
    return { ...inc };
  }

  async updateAgency(id: string, agency: AgencyCode): Promise<IncidentEntity | null> {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    inc.assignedAgency = agency;
    inc.updatedAt = new Date().toISOString();
    this.incidents.set(id, inc);
    return { ...inc };
  }

  async incrementCorroboration(id: string): Promise<number> {
    const inc = this.incidents.get(id);
    if (!inc) return 0;

    inc.publicCorroborationCount += 1;
    this.incidents.set(id, inc);
    return inc.publicCorroborationCount;
  }
}
