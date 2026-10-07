import { MockGhanaPostGPSAdapter } from './ghanapost-gps.adapter';

describe('GhanaPostGPSAdapter', () => {
  let adapter: MockGhanaPostGPSAdapter;

  beforeEach(() => {
    adapter = new MockGhanaPostGPSAdapter();
  });

  it('should correctly validate valid GhanaPost GPS format', () => {
    expect(adapter.validateFormat('GA-183-9022')).toBe(true);
    expect(adapter.validateFormat('AK-042-9901')).toBe(true);
    expect(adapter.validateFormat('CR-104-7721')).toBe(true);
    expect(adapter.validateFormat('gm-014-9923')).toBe(true);
  });

  it('should reject invalid GhanaPost GPS strings', () => {
    expect(adapter.validateFormat('12345')).toBe(false);
    expect(adapter.validateFormat('ACCRA-GHANA')).toBe(false);
    expect(adapter.validateFormat('G-12-34')).toBe(false);
    expect(adapter.validateFormat('')).toBe(false);
  });

  it('should deterministically resolve Accra coordinates for GA prefix', async () => {
    const res = await adapter.resolveAddress('GA-382-9104');
    expect(res.region).toBe('Greater Accra');
    expect(res.district).toBe('Accra Metropolitan');
    expect(res.latitude).toBeCloseTo(5.6037, 1);
    expect(res.longitude).toBeCloseTo(-0.1870, 1);
    expect(res.isMocked).toBe(true);
  });

  it('should deterministically resolve Kumasi coordinates for AK prefix', async () => {
    const res = await adapter.resolveAddress('AK-042-9901');
    expect(res.region).toBe('Ashanti');
    expect(res.district).toBe('Kumasi Metropolitan');
    expect(res.latitude).toBeCloseTo(6.6885, 1);
    expect(res.longitude).toBeCloseTo(-1.6244, 1);
  });

  it('should throw an error on invalid postcode resolution', async () => {
    await expect(adapter.resolveAddress('INVALID_CODE')).rejects.toThrow('Invalid GhanaPost GPS format');
  });
});
