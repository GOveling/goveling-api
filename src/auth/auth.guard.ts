import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly supabaseUrl: string;
  private readonly supabaseApiKey: string;
  private readonly googleClientId: string;
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') ?? '';
    this.supabaseApiKey = this.configService.get<string>('SUPABASE_APIKEY') ?? '';
    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token required');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!this.isJwt(token)) {
      throw new UnauthorizedException('Malformed token');
    }

    // Intento 1: Validar contra Supabase
    try {
      const response = await axios.get(`https://${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.supabaseApiKey,
        },
      });

      request.user = response.data;
      return true;
    } catch (error) {
      const code = error.response?.data?.error_code || '';
      const msg = error.response?.data?.msg || '';

      // Intento 2: Si el token es de Google (OAuth), validarlo con Google
      if (code === 'bad_jwt' && msg.includes('invalid number of segments')) {
        return this.verifyGoogleToken(token, request);
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private isJwt(token: string): boolean {
    return token.split('.').length === 3;
  }

  private async verifyGoogleToken(token: string, request: any): Promise<boolean> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.googleClientId,
      });

      const payload = ticket.getPayload();

      if (!payload?.email || !payload?.sub) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Google token invalid');
    }
  }
}
