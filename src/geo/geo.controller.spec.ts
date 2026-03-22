import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

describe('GeoController', () => {
  let controller: GeoController;

  const mockCountries = [
    { country_code: 'US', country_name: 'United States' },
    { country_code: 'CL', country_name: 'Chile' },
  ];

  const mockCities = [
    { city: 'New York', latitude: 40.71, longitude: -74.0, population: 8336817, country_code: 'US' },
    { city: 'Los Angeles', latitude: 34.05, longitude: -118.24, population: 3979576, country_code: 'US' },
  ];

  const mockGeoService = {
    getAllCountries: jest.fn(),
    getCitiesByCountry: jest.fn(),
    getCountryByCode: jest.fn(),
    searchCities: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [{ provide: GeoService, useValue: mockGeoService }],
    }).compile();

    controller = module.get<GeoController>(GeoController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGeoData', () => {
    it('should return countries when type is "countries"', async () => {
      mockGeoService.getAllCountries.mockResolvedValueOnce(mockCountries);

      const result = await controller.getGeoData('countries');
      expect(result).toEqual(mockCountries);
      expect(mockGeoService.getAllCountries).toHaveBeenCalled();
    });

    it('should handle type "COUNTRIES" (case-insensitive)', async () => {
      mockGeoService.getAllCountries.mockResolvedValueOnce(mockCountries);

      const result = await controller.getGeoData('COUNTRIES');
      expect(result).toEqual(mockCountries);
    });

    it('should handle type "Countries" (mixed case)', async () => {
      mockGeoService.getAllCountries.mockResolvedValueOnce(mockCountries);

      const result = await controller.getGeoData('Countries');
      expect(result).toEqual(mockCountries);
    });

    it('should return cities when type is "cities" with country code', async () => {
      mockGeoService.getCitiesByCountry.mockResolvedValueOnce(mockCities);

      const result = await controller.getGeoData('cities', 'us');
      expect(result).toEqual(mockCities);
      expect(mockGeoService.getCitiesByCountry).toHaveBeenCalledWith('US');
    });

    it('should uppercase country code for cities', async () => {
      mockGeoService.getCitiesByCountry.mockResolvedValueOnce(mockCities);

      await controller.getGeoData('cities', 'cl');
      expect(mockGeoService.getCitiesByCountry).toHaveBeenCalledWith('CL');
    });

    it('should throw BadRequestException when cities requested without country code', async () => {
      await expect(controller.getGeoData('cities')).rejects.toThrow(BadRequestException);
      await expect(controller.getGeoData('cities')).rejects.toThrow(
        'Country code is required for cities endpoint',
      );
    });

    it('should throw BadRequestException for invalid type', async () => {
      await expect(controller.getGeoData('invalid')).rejects.toThrow(BadRequestException);
      await expect(controller.getGeoData('invalid')).rejects.toThrow(
        'Invalid type. Use "countries" or "cities"',
      );
    });

    it('should throw BadRequestException for type "city" (singular)', async () => {
      await expect(controller.getGeoData('city')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for type "country" (singular)', async () => {
      await expect(controller.getGeoData('country')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCitiesByCountryCode (RESTful endpoint)', () => {
    it('should return cities for a valid country code', async () => {
      mockGeoService.getCitiesByCountry.mockResolvedValueOnce(mockCities);

      const result = await controller.getCitiesByCountryCode('US');
      expect(result).toEqual(mockCities);
    });

    it('should uppercase the country code', async () => {
      mockGeoService.getCitiesByCountry.mockResolvedValueOnce([]);

      await controller.getCitiesByCountryCode('cl');
      expect(mockGeoService.getCitiesByCountry).toHaveBeenCalledWith('CL');
    });

    it('should propagate NotFoundException from service', async () => {
      mockGeoService.getCitiesByCountry.mockRejectedValueOnce(
        new NotFoundException("Country with code 'ZZ' not found"),
      );

      await expect(controller.getCitiesByCountryCode('ZZ')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchCities', () => {
    it('should search cities by name', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce(mockCities);

      const result = await controller.searchCities('New');
      expect(result).toEqual(mockCities);
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('New', 50);
    });

    it('should use custom limit when provided', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce([mockCities[0]]);

      await controller.searchCities('New', '10');
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('New', 10);
    });

    it('should default limit to 50 when not provided', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce([]);

      await controller.searchCities('Test');
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('Test', 50);
    });

    it('should throw BadRequestException when city name is missing', async () => {
      await expect(controller.searchCities(undefined as any)).rejects.toThrow(BadRequestException);
      await expect(controller.searchCities(undefined as any)).rejects.toThrow(
        'City name is required',
      );
    });

    it('should throw BadRequestException when city name is empty string', async () => {
      await expect(controller.searchCities('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is not a number', async () => {
      await expect(controller.searchCities('Test', 'abc')).rejects.toThrow(BadRequestException);
      await expect(controller.searchCities('Test', 'abc')).rejects.toThrow(
        'Limit must be a number between 1 and 1000',
      );
    });

    it('should throw BadRequestException when limit is 0', async () => {
      await expect(controller.searchCities('Test', '0')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is negative', async () => {
      await expect(controller.searchCities('Test', '-5')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit exceeds 1000', async () => {
      await expect(controller.searchCities('Test', '1001')).rejects.toThrow(BadRequestException);
    });

    it('should accept limit = 1 (minimum)', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce([]);

      await controller.searchCities('Test', '1');
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('Test', 1);
    });

    it('should accept limit = 1000 (maximum)', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce([]);

      await controller.searchCities('Test', '1000');
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('Test', 1000);
    });

    it('should handle floating point limit via parseInt truncation', async () => {
      mockGeoService.searchCities.mockResolvedValueOnce([]);

      await controller.searchCities('Test', '5.5');
      expect(mockGeoService.searchCities).toHaveBeenCalledWith('Test', 5);
    });
  });

  describe('getCountryByCode', () => {
    it('should return country for valid code', async () => {
      mockGeoService.getCountryByCode.mockResolvedValueOnce(mockCountries[0]);

      const result = await controller.getCountryByCode('us');
      expect(result).toEqual(mockCountries[0]);
      expect(mockGeoService.getCountryByCode).toHaveBeenCalledWith('US');
    });

    it('should uppercase the country code', async () => {
      mockGeoService.getCountryByCode.mockResolvedValueOnce(mockCountries[1]);

      await controller.getCountryByCode('cl');
      expect(mockGeoService.getCountryByCode).toHaveBeenCalledWith('CL');
    });

    it('should throw NotFoundException when country not found', async () => {
      mockGeoService.getCountryByCode.mockResolvedValueOnce(null);

      await expect(controller.getCountryByCode('ZZ')).rejects.toThrow(NotFoundException);
      await expect(controller.getCountryByCode('ZZ')).rejects.toThrow(
        "Country with code 'ZZ' not found",
      );
    });

    it('should throw NotFoundException for empty country code', async () => {
      mockGeoService.getCountryByCode.mockResolvedValueOnce(null);

      await expect(controller.getCountryByCode('')).rejects.toThrow(NotFoundException);
    });
  });
});
