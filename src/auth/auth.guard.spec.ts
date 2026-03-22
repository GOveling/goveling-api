import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'test.supabase.co',
        SUPABASE_APIKEY: 'test-api-key',
        GOOGLE_CLIENT_ID: 'test-google-client-id',
      };
      return config[key];
    }),
  };

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Missing or malformed Authorization header', () => {
    it('should reject when no Authorization header is present', async () => {
      const context = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should reject when Authorization header is empty string', async () => {
      const context = createMockContext({ authorization: '' });
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should reject when Authorization header has no Bearer prefix', async () => {
      const context = createMockContext({ authorization: 'Basic abc.def.ghi' });
      await expect(guard.canActivate(context)).rejects.toThrow('Access token required');
    });

    it('should reject when Authorization header is just "Bearer" with no token', async () => {
      const context = createMockContext({ authorization: 'Bearer ' });
      await expect(guard.canActivate(context)).rejects.toThrow('Malformed token');
    });

    it('should reject when Authorization header is "Bearer" with only spaces', async () => {
      const context = createMockContext({ authorization: 'Bearer    ' });
      await expect(guard.canActivate(context)).rejects.toThrow('Malformed token');
    });

    it('should reject a token with only 1 segment (not JWT format)', async () => {
      const context = createMockContext({ authorization: 'Bearer single-segment-token' });
      await expect(guard.canActivate(context)).rejects.toThrow('Malformed token');
    });

    it('should reject a token with 2 segments', async () => {
      const context = createMockContext({ authorization: 'Bearer part1.part2' });
      await expect(guard.canActivate(context)).rejects.toThrow('Malformed token');
    });

    it('should reject a token with 4 segments', async () => {
      const context = createMockContext({ authorization: 'Bearer a.b.c.d' });
      await expect(guard.canActivate(context)).rejects.toThrow('Malformed token');
    });
  });

  describe('Supabase validation', () => {
    const validToken = 'header.payload.signature';

    it('should authenticate successfully with valid Supabase token', async () => {
      const userData = { id: 'user-123', email: 'test@example.com' };
      mockedAxios.get.mockResolvedValueOnce({ data: userData });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test.supabase.co/auth/v1/user',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${validToken}`,
            apikey: 'test-api-key',
          },
        }),
      );
    });

    it('should set request.user when Supabase validates successfully', async () => {
      const userData = { id: 'user-123', email: 'test@example.com' };
      mockedAxios.get.mockResolvedValueOnce({ data: userData });

      const request = { headers: { authorization: `Bearer ${validToken}` }, user: null };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);
      expect(request.user).toEqual(userData);
    });

    it('should throw UnauthorizedException on generic Supabase error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { error_code: 'token_expired', msg: 'Token has expired' } },
      });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException on network error (no response)', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException on 500 from Supabase', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('Google OAuth fallback', () => {
    const validToken = 'header.payload.signature';

    it('should attempt Google verification when Supabase returns bad_jwt with segments error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 'bad_jwt',
            msg: 'invalid JWT: token contains an invalid number of segments',
          },
        },
      });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      // Google verification will fail since we can't mock the OAuth2Client easily,
      // but we verify it attempts the fallback by checking for the Google-specific error
      await expect(guard.canActivate(context)).rejects.toThrow('Google token invalid');
    });

    it('should NOT attempt Google fallback when Supabase returns bad_jwt without segments msg', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 'bad_jwt',
            msg: 'signature verification failed',
          },
        },
      });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should NOT attempt Google fallback when Supabase returns different error code', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 'user_not_found',
            msg: 'invalid number of segments',
          },
        },
      });

      const context = createMockContext({ authorization: `Bearer ${validToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('Edge cases with token content', () => {
    it('should handle a token with empty segments (e.g., "..") as valid JWT format', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { data: { error_code: 'bad_jwt', msg: 'malformed' } },
      });

      const context = createMockContext({ authorization: 'Bearer ..' });
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should trim whitespace from token', async () => {
      const userData = { id: 'user-456' };
      mockedAxios.get.mockResolvedValueOnce({ data: userData });

      const context = createMockContext({ authorization: 'Bearer  a.b.c  ' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer a.b.c',
          }),
        }),
      );
    });
  });
});
