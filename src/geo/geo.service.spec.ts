import { NotFoundException } from '@nestjs/common';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(() => {
    service = new GeoService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllCountries', () => {
    it('should return an array of countries', async () => {
      const countries = await service.getAllCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should return countries sorted alphabetically by name', async () => {
      const countries = await service.getAllCountries();
      for (let i = 1; i < countries.length; i++) {
        expect(
          countries[i].country_name.localeCompare(countries[i - 1].country_name),
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return countries with country_code and country_name fields', async () => {
      const countries = await service.getAllCountries();
      const first = countries[0];
      expect(first).toHaveProperty('country_code');
      expect(first).toHaveProperty('country_name');
      expect(typeof first.country_code).toBe('string');
      expect(typeof first.country_name).toBe('string');
    });

    it('should return consistent results on multiple calls', async () => {
      const first = await service.getAllCountries();
      const second = await service.getAllCountries();
      expect(first.length).toBe(second.length);
      expect(first[0].country_code).toBe(second[0].country_code);
    });
  });

  describe('getCountryByCode', () => {
    it('should return a country for valid code', async () => {
      const country = await service.getCountryByCode('US');
      expect(country).toBeDefined();
      expect(country?.country_code).toBe('US');
    });

    it('should return null for non-existent country code', async () => {
      const country = await service.getCountryByCode('ZZ');
      expect(country).toBeNull();
    });

    it('should return null for empty string', async () => {
      const country = await service.getCountryByCode('');
      expect(country).toBeNull();
    });

    it('should be case-sensitive (lowercase should not match uppercase codes)', async () => {
      const country = await service.getCountryByCode('us');
      expect(country).toBeNull();
    });

    it('should handle SQL injection attempt safely', async () => {
      const country = await service.getCountryByCode("'; DROP TABLE countries; --");
      expect(country).toBeNull();
    });

    it('should handle very long input without crashing', async () => {
      const longCode = 'A'.repeat(1000);
      const country = await service.getCountryByCode(longCode);
      expect(country).toBeNull();
    });
  });

  describe('getCitiesByCountry', () => {
    it('should return cities for valid country code', async () => {
      const cities = await service.getCitiesByCountry('US');
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);
    });

    it('should return cities sorted by population descending', async () => {
      const cities = await service.getCitiesByCountry('US');
      for (let i = 1; i < cities.length; i++) {
        expect(cities[i].population).toBeLessThanOrEqual(cities[i - 1].population);
      }
    });

    it('should return cities with correct fields', async () => {
      const cities = await service.getCitiesByCountry('US');
      const city = cities[0];
      expect(city).toHaveProperty('city');
      expect(city).toHaveProperty('latitude');
      expect(city).toHaveProperty('longitude');
      expect(city).toHaveProperty('population');
      expect(city).toHaveProperty('country_code');
      expect(typeof city.city).toBe('string');
      expect(typeof city.latitude).toBe('number');
      expect(typeof city.longitude).toBe('number');
      expect(typeof city.population).toBe('number');
    });

    it('should return cities with matching country_code', async () => {
      const cities = await service.getCitiesByCountry('CL');
      cities.forEach(city => {
        expect(city.country_code).toBe('CL');
      });
    });

    it('should throw NotFoundException for non-existent country', async () => {
      await expect(service.getCitiesByCountry('ZZ')).rejects.toThrow(NotFoundException);
      await expect(service.getCitiesByCountry('ZZ')).rejects.toThrow(
        "Country with code 'ZZ' not found",
      );
    });

    it('should throw NotFoundException for empty string', async () => {
      await expect(service.getCitiesByCountry('')).rejects.toThrow(NotFoundException);
    });

    it('should handle SQL injection attempt safely', async () => {
      await expect(service.getCitiesByCountry("' OR 1=1; --")).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchCities', () => {
    it('should find cities matching a name', async () => {
      const cities = await service.searchCities('Santiago');
      expect(cities.length).toBeGreaterThan(0);
      cities.forEach(city => {
        expect(city.city.toLowerCase()).toContain('santiago');
      });
    });

    it('should be case-insensitive with LIKE', async () => {
      const upper = await service.searchCities('SANTIAGO');
      const lower = await service.searchCities('santiago');
      expect(upper.length).toBe(lower.length);
    });

    it('should return empty array for non-matching name', async () => {
      const cities = await service.searchCities('Xyzzynonexistent12345');
      expect(cities).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const limited = await service.searchCities('a', 5);
      expect(limited.length).toBeLessThanOrEqual(5);
    });

    it('should default to 50 results when no limit specified', async () => {
      const cities = await service.searchCities('a');
      expect(cities.length).toBeLessThanOrEqual(50);
    });

    it('should return results sorted by population descending', async () => {
      const cities = await service.searchCities('San', 20);
      for (let i = 1; i < cities.length; i++) {
        expect(cities[i].population).toBeLessThanOrEqual(cities[i - 1].population);
      }
    });

    it('should handle limit = 1', async () => {
      const cities = await service.searchCities('New', 1);
      expect(cities.length).toBeLessThanOrEqual(1);
    });

    it('should handle partial matches (substring)', async () => {
      const cities = await service.searchCities('York');
      expect(cities.length).toBeGreaterThan(0);
    });

    it('should handle SQL injection attempt in city name safely', async () => {
      const cities = await service.searchCities("'; DROP TABLE cities; --");
      expect(Array.isArray(cities)).toBe(true);
    });

    it('should handle empty string search', async () => {
      const cities = await service.searchCities('', 5);
      expect(cities.length).toBeLessThanOrEqual(5);
    });

    it('should handle search with special characters', async () => {
      const cities = await service.searchCities('%_%');
      expect(Array.isArray(cities)).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the database connection gracefully', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });

    it('should handle being called multiple times', () => {
      service.onModuleDestroy();
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
