import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

describe('LocationController', () => {
  let controller: LocationController;
  let locationService: LocationService;

  const mockLocationService = {
    getCityFromCoordinates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        { provide: LocationService, useValue: mockLocationService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    locationService = module.get<LocationService>(LocationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCity', () => {
    it('should call service with correct lat and lng', async () => {
      const mockResult = {
        city: 'Santiago',
        region: 'RM',
        country: 'Chile',
        countryCode: 'cl',
        raw: {},
      };
      mockLocationService.getCityFromCoordinates.mockResolvedValueOnce(mockResult);

      const result = await controller.getCity({ lat: -33.45, lng: -70.66 });

      expect(result).toEqual(mockResult);
      expect(mockLocationService.getCityFromCoordinates).toHaveBeenCalledWith(-33.45, -70.66);
    });

    it('should handle zero coordinates', async () => {
      mockLocationService.getCityFromCoordinates.mockResolvedValueOnce({
        city: null,
        region: null,
        country: 'Ocean',
        countryCode: 'xx',
        raw: {},
      });

      const result = await controller.getCity({ lat: 0, lng: 0 });
      expect(result.city).toBeNull();
    });

    it('should propagate service errors', async () => {
      mockLocationService.getCityFromCoordinates.mockRejectedValueOnce(
        new Error('Service failed'),
      );

      await expect(controller.getCity({ lat: 10, lng: 20 })).rejects.toThrow('Service failed');
    });
  });
});
