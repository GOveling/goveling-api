import { Injectable } from '@nestjs/common';

const SERVICE_STARTED_AT = Date.now();

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health probe consumed by the public status page
   * (status.goveling.com). Adds uptime, version, runtime info on top
   * of the basic `/` probe.
   */
  getHealthz() {
    const pkg = require('../package.json') as { version: string };
    return {
      status: 'ok',
      service: 'goveling-api',
      version: pkg.version,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - SERVICE_STARTED_AT) / 1000),
      runtime: {
        node: process.version,
        platform: process.platform,
      },
    };
  }
}
