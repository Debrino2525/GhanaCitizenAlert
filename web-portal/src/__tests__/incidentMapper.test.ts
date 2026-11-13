import { describe, it, expect } from 'vitest';
import { mapIncidentRow, mergeOlder } from '../services/incidentMapper';
import { incident } from './fixtures';

describe('mapIncidentRow', () => {
  it('maps a database row and keeps missing coordinates as null', () => {
    const r = mapIncidentRow({
      id: 'abc', tracking_code: 'GH-2026-X', title: 'T', category: 'CRIMINAL_OFFENSE',
      latitude: null, longitude: 5, status: 'DISPATCHED', reporter_trust_score: 3, is_anonymous: true,
    });
    expect(r.trackingCode).toBe('GH-2026-X');
    expect(r.coordinates).toBeNull();
    expect(r.status).toBe('DISPATCHED');
    expect(r.reporter).toEqual({ isAnonymous: true, trustScore: 3 });
  });

  it('parses media stored as a JSON string and normalises links', () => {
    const r = mapIncidentRow({
      id: 'a', media: JSON.stringify([{ type: 'VIDEO', rawS3Url: 'https://x/v.mp4', sha256Checksum: 'h' }]),
    });
    expect(r.media).toHaveLength(1);
    expect(r.media[0].url).toBe('https://x/v.mp4');
    expect(r.media[0].uploadStatus).toBe('UPLOADED');
    expect(r.media[0].sha256Checksum).toBe('h');
  });

  it('survives malformed media JSON', () => {
    expect(mapIncidentRow({ id: 'a', media: '{not json' }).media).toEqual([]);
  });
});

describe('mergeOlder', () => {
  it('appends older reports without duplicating ones already loaded', () => {
    const a = incident({ id: 'a' });
    const b = incident({ id: 'b' });
    const c = incident({ id: 'c' });
    expect(mergeOlder([a, b], [b, c]).map(i => i.id)).toEqual(['a', 'b', 'c']);
  });
});
