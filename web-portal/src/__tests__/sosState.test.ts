import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSosState, sosDisplayTitle, formatAgo } from '../utils/sosState';

const NOW = new Date('2026-11-13T12:00:00Z').getTime();
const secondsAgo = (s: number) => new Date(NOW - s * 1000).toISOString();

afterEach(() => vi.useRealTimers());

describe('getSosState', () => {
  const open = { title: '🚨 EMERGENCY SOS BEACON (ACTIVE)', status: 'RECEIVED_PENDING_TRIAGE' as const };

  it('is LIVE only when a ping arrived within 2 minutes', () => {
    vi.useFakeTimers().setSystemTime(NOW);
    expect(getSosState(open, secondsAgo(30))).toBe('LIVE');
    expect(getSosState(open, secondsAgo(119))).toBe('LIVE');
  });

  it('is SIGNAL_LOST (never "terminated") when pings stop and nobody cancelled', () => {
    vi.useFakeTimers().setSystemTime(NOW);
    expect(getSosState(open, secondsAgo(121))).toBe('SIGNAL_LOST');
    expect(getSosState(open, secondsAgo(60 * 60 * 24))).toBe('SIGNAL_LOST');
    expect(getSosState(open, null)).toBe('SIGNAL_LOST');
  });

  it('is CANCELLED when the reporter stood down, even with a fresh ping', () => {
    vi.useFakeTimers().setSystemTime(NOW);
    const cancelled = { title: '🛑 EMERGENCY SOS BEACON (STAND DOWN / CANCELLED)', status: 'RESOLVED' as const };
    expect(getSosState(cancelled, secondsAgo(10))).toBe('CANCELLED');
  });

  it('is CLOSED when an officer resolved or dismissed it', () => {
    vi.useFakeTimers().setSystemTime(NOW);
    expect(getSosState({ ...open, status: 'RESOLVED' }, secondsAgo(500))).toBe('CLOSED');
    expect(getSosState({ ...open, status: 'DISMISSED' }, null)).toBe('CLOSED');
  });
});

describe('sosDisplayTitle', () => {
  it('replaces the phone-written "(ACTIVE)" when it is no longer true', () => {
    expect(sosDisplayTitle('SOS BEACON (ACTIVE)', 'SIGNAL_LOST')).toBe('SOS BEACON (NO SIGNAL, NOT CANCELLED)');
    expect(sosDisplayTitle('SOS BEACON (ACTIVE)', 'CLOSED')).toBe('SOS BEACON (CLOSED BY OFFICER)');
  });
  it('leaves live and non-SOS titles alone', () => {
    expect(sosDisplayTitle('SOS BEACON (ACTIVE)', 'LIVE')).toBe('SOS BEACON (ACTIVE)');
    expect(sosDisplayTitle('Broken streetlight', 'SIGNAL_LOST')).toBe('Broken streetlight');
  });
});

describe('formatAgo', () => {
  it('uses human units instead of "284h ago" or "690m old"', () => {
    vi.useFakeTimers().setSystemTime(NOW);
    expect(formatAgo(secondsAgo(20))).toBe('just now');
    expect(formatAgo(secondsAgo(5 * 60))).toBe('5 min ago');
    expect(formatAgo(secondsAgo(3 * 3600))).toBe('3 h ago');
    expect(formatAgo(secondsAgo(284 * 3600))).toBe('11 days ago');
    expect(formatAgo(690 * 60)).toBe('11 h ago'); // seconds input
    expect(formatAgo(null)).toBe('');
  });
});
