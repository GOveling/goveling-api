import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { WeatherService } from './weather.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('WeatherService', () => {
  let service: WeatherService;

  const mockWeatherResponse = {
    data: {
      location: {
        name: 'Santiago',
        region: 'Region Metropolitana',
        country: 'Chile',
        lat: -33.45,
        lon: -70.67,
        tz_id: 'America/Santiago',
        localtime: '2024-01-01 12:00',
      },
      current: {
        last_updated: '2024-01-01 12:00',
        temp_c: 25.0,
        temp_f: 77.0,
        is_day: 1,
        condition: {
          text: 'Sunny',
          icon: '//cdn.weatherapi.com/weather/64x64/day/113.png',
          code: 1000,
        },
        wind_kph: 15.0,
        wind_degree: 180,
        wind_dir: 'S',
        pressure_mb: 1015.0,
        humidity: 45,
        feelslike_c: 26.0,
        vis_km: 10.0,
        uv: 6.0,
        gust_kph: 20.0,
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-weather-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeatherByCoordinates - successful responses', () => {
    it('should return formatted weather data', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      const result = await service.getWeatherByCoordinates(-33.45, -70.67);

      expect(result.location.name).toBe('Santiago');
      expect(result.location.region).toBe('Region Metropolitana');
      expect(result.location.country).toBe('Chile');
      expect(result.temperature_c).toBe(25.0);
      expect(result.condition).toBe('Sunny');
      expect(result.icon).toContain('113.png');
      expect(result.wind_kph).toBe(15.0);
      expect(result.humidity).toBe(45);
      expect(result.is_day).toBe(true);
      expect(result.raw).toBeDefined();
    });

    it('should return is_day as false when is_day is 0', async () => {
      const nightResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      nightResponse.data.current.is_day = 0;
      mockedAxios.get.mockResolvedValueOnce(nightResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.is_day).toBe(false);
    });

    it('should return is_day as false when is_day is any value other than 1', async () => {
      const weirdResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      weirdResponse.data.current.is_day = 2;
      mockedAxios.get.mockResolvedValueOnce(weirdResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.is_day).toBe(false);
    });

    it('should handle zero temperature', async () => {
      const zeroTempResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      zeroTempResponse.data.current.temp_c = 0;
      mockedAxios.get.mockResolvedValueOnce(zeroTempResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.temperature_c).toBe(0);
    });

    it('should handle negative temperature', async () => {
      const coldResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      coldResponse.data.current.temp_c = -40;
      mockedAxios.get.mockResolvedValueOnce(coldResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.temperature_c).toBe(-40);
    });

    it('should handle extreme high temperature', async () => {
      const hotResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      hotResponse.data.current.temp_c = 56.7;
      mockedAxios.get.mockResolvedValueOnce(hotResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.temperature_c).toBe(56.7);
    });

    it('should handle 0% humidity', async () => {
      const dryResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      dryResponse.data.current.humidity = 0;
      mockedAxios.get.mockResolvedValueOnce(dryResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.humidity).toBe(0);
    });

    it('should handle 100% humidity', async () => {
      const wetResponse = JSON.parse(JSON.stringify(mockWeatherResponse));
      wetResponse.data.current.humidity = 100;
      mockedAxios.get.mockResolvedValueOnce(wetResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.humidity).toBe(100);
    });

    it('should include full raw current data in response', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      const result = await service.getWeatherByCoordinates(10, 20);
      expect(result.raw).toEqual(mockWeatherResponse.data.current);
    });
  });

  describe('getWeatherByCoordinates - API call verification', () => {
    it('should call WeatherAPI with correct parameters', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      await service.getWeatherByCoordinates(40.7128, -74.006);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://api.weatherapi.com/v1/current.json',
        {
          params: {
            key: 'test-weather-api-key',
            q: '40.7128,-74.006',
            aqi: 'no',
          },
        },
      );
    });

    it('should format coordinates correctly with decimals', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      await service.getWeatherByCoordinates(-33.4489, -70.6693);

      const callArgs = mockedAxios.get.mock.calls[0][1] as any;
      expect(callArgs?.params?.q).toBe('-33.4489,-70.6693');
    });

    it('should format coordinates correctly for zero values', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

      await service.getWeatherByCoordinates(0, 0);

      const callArgs = mockedAxios.get.mock.calls[0][1] as any;
      expect(callArgs?.params?.q).toBe('0,0');
    });
  });

  describe('getWeatherByCoordinates - error handling', () => {
    it('should throw InternalServerErrorException on network error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        'Error fetching weather data',
      );
    });

    it('should throw InternalServerErrorException on timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout exceeded',
      });

      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on 401 (invalid API key)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: { message: 'API key is invalid.' } } },
      });

      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on 403 (exceeded quota)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 403, data: { error: { message: 'API key has exceeded calls.' } } },
      });

      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException on 400 (invalid location)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: { code: 1006, message: 'No matching location found.' } },
        },
      });

      await expect(service.getWeatherByCoordinates(10, 20)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
