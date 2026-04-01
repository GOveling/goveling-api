import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WeatherApiResponse } from '../types/weatherapi-response.interface';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.weatherapi.com/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('WEATHER_API_KEY') ?? '';
  }

  async getWeatherByCoordinates(lat: number, lon: number) {
    try {
      const url = `${this.baseUrl}/current.json`;
      const response = await axios.get<WeatherApiResponse>(url, {
        params: {
          key: this.apiKey,
          q: `${lat},${lon}`,
          aqi: 'no',
        },
      });

      const { location, current } = response.data;

      return {
        location: {
          name: location.name,
          region: location.region,
          country: location.country,
        },
        temperature_c: current.temp_c,
        condition: current.condition.text,
        icon: current.condition.icon,
        wind_kph: current.wind_kph,
        humidity: current.humidity,
        is_day: current.is_day === 1,
        raw: current,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather for ${lat},${lon}: ${error.message}`);
      throw new InternalServerErrorException('Error fetching weather data');
    }
  }
}
