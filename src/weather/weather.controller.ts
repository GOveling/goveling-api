import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { AuthGuard } from '../auth/auth.guard';
import { GetWeatherDto } from '../dto/get-weather.dto';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @UseGuards(AuthGuard)
  @Post()
  async getWeather(@Body() body: GetWeatherDto) {
    return this.weatherService.getWeatherByCoordinates(body.lat, body.lng);
  }
}
