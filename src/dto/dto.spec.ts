import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GetLocationDto } from './get-location.dto';
import { GetWeatherDto } from './get-weather.dto';

describe('GetLocationDto', () => {
  const toDto = (data: any) => plainToInstance(GetLocationDto, data);

  describe('valid inputs', () => {
    it('should accept valid coordinates', async () => {
      const dto = toDto({ lat: 40.7128, lng: -74.006 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept zero coordinates', async () => {
      const dto = toDto({ lat: 0, lng: 0 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept max boundary values (90, 180)', async () => {
      const dto = toDto({ lat: 90, lng: 180 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept min boundary values (-90, -180)', async () => {
      const dto = toDto({ lat: -90, lng: -180 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should transform string numbers to numbers', async () => {
      const dto = toDto({ lat: '40.7128', lng: '-74.006' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(typeof dto.lat).toBe('number');
      expect(typeof dto.lng).toBe('number');
    });
  });

  describe('invalid lat values', () => {
    it('should reject lat > 90', async () => {
      const dto = toDto({ lat: 91, lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'lat')).toBe(true);
    });

    it('should reject lat < -90', async () => {
      const dto = toDto({ lat: -91, lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'lat')).toBe(true);
    });

    it('should reject lat = 90.001', async () => {
      const dto = toDto({ lat: 90.001, lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-numeric lat (string)', async () => {
      const dto = toDto({ lat: 'abc', lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null lat', async () => {
      const dto = toDto({ lat: null, lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined lat', async () => {
      const dto = toDto({ lng: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('invalid lng values', () => {
    it('should reject lng > 180', async () => {
      const dto = toDto({ lat: 0, lng: 181 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'lng')).toBe(true);
    });

    it('should reject lng < -180', async () => {
      const dto = toDto({ lat: 0, lng: -181 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'lng')).toBe(true);
    });

    it('should reject lng = 180.001', async () => {
      const dto = toDto({ lat: 0, lng: 180.001 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-numeric lng (string)', async () => {
      const dto = toDto({ lat: 0, lng: 'xyz' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null lng', async () => {
      const dto = toDto({ lat: 0, lng: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined lng', async () => {
      const dto = toDto({ lat: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('both fields missing', () => {
    it('should reject empty object', async () => {
      const dto = toDto({});
      const errors = await validate(dto);
      expect(errors.length).toBe(2);
    });
  });
});

describe('GetWeatherDto', () => {
  const toDto = (data: any) => plainToInstance(GetWeatherDto, data);

  it('should accept valid coordinates', async () => {
    const dto = toDto({ lat: -33.45, lng: -70.66 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept boundary values', async () => {
    const dto = toDto({ lat: 90, lng: 180 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject lat out of range', async () => {
    const dto = toDto({ lat: 95, lng: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject lng out of range', async () => {
    const dto = toDto({ lat: 0, lng: 200 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject missing fields', async () => {
    const dto = toDto({});
    const errors = await validate(dto);
    expect(errors.length).toBe(2);
  });

  it('should transform string numbers', async () => {
    const dto = toDto({ lat: '10', lng: '20' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(typeof dto.lat).toBe('number');
  });
});
