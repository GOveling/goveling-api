import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Database } from 'sqlite3';
import * as path from 'path';
import { Country, City } from './geo.interfaces';

@Injectable()
export class GeoService implements OnModuleDestroy {
  private readonly logger = new Logger(GeoService.name);
  private readonly dbPath: string;
  private db: Database | null = null;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'src', 'Data', 'CountriesCities', 'world_geo.db');
  }

  private getDatabase(): Promise<Database> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    return new Promise((resolve, reject) => {
      const db = new Database(this.dbPath, err => {
        if (err) {
          this.logger.error(`Database connection failed: ${err.message}`);
          reject(new Error(`Database connection failed: ${err.message}`));
          return;
        }
        this.db = db;
        resolve(db);
      });
    });
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close(err => {
        if (err) {
          this.logger.error(`Error closing database: ${err.message}`);
        }
      });
      this.db = null;
    }
  }

  private async queryDatabase<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          this.logger.error(`Query failed: ${err.message}`);
          reject(new Error(`Query failed: ${err.message}`));
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async getAllCountries(): Promise<Country[]> {
    const query = 'SELECT * FROM countries ORDER BY country_name ASC';
    return this.queryDatabase<Country>(query);
  }

  async getCitiesByCountry(countryCode: string): Promise<City[]> {
    const countryQuery = 'SELECT * FROM countries WHERE country_code = ?';
    const countries = await this.queryDatabase<Country>(countryQuery, [countryCode]);

    if (countries.length === 0) {
      throw new NotFoundException(`Country with code '${countryCode}' not found`);
    }

    const citiesQuery = `
      SELECT
        name as city,
        latitude,
        longitude,
        population,
        country_code
      FROM cities
      WHERE country_code = ?
      ORDER BY population DESC
    `;

    return this.queryDatabase<City>(citiesQuery, [countryCode]);
  }

  async getCountryByCode(countryCode: string): Promise<Country | null> {
    const query = 'SELECT * FROM countries WHERE country_code = ?';
    const countries = await this.queryDatabase<Country>(query, [countryCode]);
    return countries.length > 0 ? countries[0] : null;
  }

  async searchCities(cityName: string, limit: number = 50): Promise<City[]> {
    const query = `
      SELECT
        name as city,
        latitude,
        longitude,
        population,
        country_code
      FROM cities
      WHERE name LIKE ?
      ORDER BY population DESC
      LIMIT ?
    `;

    return this.queryDatabase<City>(query, [`%${cityName}%`, limit]);
  }
}
