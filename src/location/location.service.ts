import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { NominatimResponse } from '../types/nominatim-response.interface';
import axios from 'axios';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  async getCityFromCoordinates(lat: number, lng: number) {
    try {
      const response = await axios.get<NominatimResponse>(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            lat,
            lon: lng,
            format: 'json',
          },
          headers: { 'User-Agent': 'nest-app' },
        }
      );

      const address = response.data.address;

      return {
        city:
          address.city ||
          address.town ||
          address.village ||
          address.hamlet ||
          address.suburb ||
          null,
        region: address.state || address.county || null,
        country: address.country,
        countryCode: address.country_code,
        raw: address,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch location for ${lat},${lng}: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch location');
    }
  }
}
