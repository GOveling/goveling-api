import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

describe('WeatherController', () => {
  let controller: WeatherController;

  const mockWeatherService = {
    getWeatherByCoordinates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        { provide: WeatherService, useValue: mockWeatherService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWeather', () => {
    it('should call service with correct coordinates', async () => {
      const mockResult = {
        location: { name: 'Santiago', region: 'RM', country: 'Chile' },
        temperature_c: 25,
        condition: 'Sunny',
        icon: 'icon.png',
        wind_kph: 10,
        humidity: 50,
        is_day: true,
        raw: {},
      };
      mockWeatherService.getWeatherByCoordinates.mockResolvedValueOnce(mockResult);

      const result = await controller.getWeather({ lat: -33.45, lng: -70.66 });

      expect(result).toEqual(mockResult);
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(-33.45, -70.66);
    });

    it('should handle zero coordinates', async () => {
      mockWeatherService.getWeatherByCoordinates.mockResolvedValueOnce({ temperature_c: 30 });

      const result = await controller.getWeather({ lat: 0, lng: 0 });
      expect(result.temperature_c).toBe(30);
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(0, 0);
    });

    it('should handle boundary coordinates', async () => {
      mockWeatherService.getWeatherByCoordinates.mockResolvedValueOnce({});

      await controller.getWeather({ lat: 90, lng: 180 });
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(90, 180);
    });

    it('should handle negative boundary coordinates', async () => {
      mockWeatherService.getWeatherByCoordinates.mockResolvedValueOnce({});

      await controller.getWeather({ lat: -90, lng: -180 });
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(-90, -180);
    });

    it('should propagate service errors', async () => {
      mockWeatherService.getWeatherByCoordinates.mockRejectedValueOnce(
        new Error('Weather API failed'),
      );

      await expect(controller.getWeather({ lat: 10, lng: 20 })).rejects.toThrow(
        'Weather API failed',
      );
    });
  });
});
