# goveling-api — NestJS Geolocation API

## Overview
REST API providing geolocation data (countries, cities, weather, reverse geocoding) consumed by the Goveling mobile app. Deployed on Render.

- **Framework**: NestJS 11 (TypeScript)
- **Database**: SQLite3 (`src/Data/CountriesCities/world_geo.db`)
- **Production**: `https://goveling-api.onrender.com`
- **Port**: 3000 (default)

## Project Structure
```
src/
├── main.ts                  # Bootstrap (Helmet, CORS, ValidationPipe)
├── app.module.ts            # Root module (ConfigModule, feature modules)
├── app.controller.ts        # GET / → health check
├── auth/
│   └── auth.guard.ts        # Dual auth: Supabase JWT → Google OAuth fallback
├── dto/
│   ├── get-location.dto.ts  # Lat/lng validation (-90..90, -180..180)
│   └── get-weather.dto.ts
├── geo/                     # Public endpoints (no auth)
│   ├── geo.controller.ts    # /geo/* routes
│   ├── geo.service.ts       # SQLite queries
│   └── geo.interfaces.ts    # Country, CityResult types
├── location/                # Protected (auth required)
│   ├── location.controller.ts  # POST /location
│   └── location.service.ts    # Nominatim reverse geocoding
├── weather/                 # Protected (auth required)
│   ├── weather.controller.ts   # POST /weather
│   └── weather.service.ts     # WeatherAPI.com integration
├── types/
│   ├── nominatim-response.interface.ts
│   └── weatherapi-response.interface.ts
└── Data/CountriesCities/
    └── world_geo.db         # SQLite: countries + cities tables
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check `{status, timestamp}` |
| GET | `/geo/countries` | No | All countries (alphabetical) |
| GET | `/geo/countries/:code` | No | Single country by code |
| GET | `/geo/countries/:code/cities` | No | Cities by country (by population) |
| GET | `/geo/cities?country=XX` | No | Cities by country (query param) |
| GET | `/geo/search/cities?name=X&limit=50` | No | Search cities (limit 1-1000) |
| POST | `/location` | Yes | Reverse geocode `{lat, lng}` → city/country |
| POST | `/weather` | Yes | Weather by `{lat, lng}` |

## Environment Variables
```
SUPABASE_URL=           # For JWT validation
SUPABASE_APIKEY=        # For JWT validation
GOOGLE_CLIENT_ID=       # For Google OAuth fallback
WEATHER_API_KEY=        # WeatherAPI.com key
CORS_ORIGIN=*           # CORS allowed origins
PORT=3000
```

## Common Commands
```bash
npm run start:dev    # Dev with watch mode
npm run start:prod   # Production (node dist/main)
npm run build        # Compile to dist/
npm test             # Jest unit tests
npm run test:e2e     # E2E tests
npm run lint         # ESLint with auto-fix
```

## Key Implementation Details

### Authentication (auth.guard.ts)
- Extracts Bearer token from Authorization header
- Validates against Supabase first, falls back to Google OAuth
- Only applied to `/location` and `/weather` endpoints
- Geo endpoints are public (no auth)

### Database (geo.service.ts)
- SQLite3 with connection pooling
- Tables: `countries` (country_code, country_name), `cities` (name, lat, lng, population, country_code)
- City search uses SQL LIKE pattern matching
- Proper cleanup on module destroy

### Security
- Helmet middleware for HTTP headers
- Global ValidationPipe with whitelist + forbidNonWhitelisted
- CORS configurable via env var

## Consumed By
- `Goveling-rn2025/src/lib/apiService.ts` — main consumer
- Types must match: `src/types/geo.ts` (RN) ↔ `src/geo/geo.interfaces.ts` (API)
