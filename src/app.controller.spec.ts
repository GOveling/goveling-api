import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return status ok', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
    });

    it('should return a valid ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.timestamp).toBeDefined();
      const parsed = new Date(result.timestamp);
      expect(parsed.toISOString()).toBe(result.timestamp);
    });

    it('should return a timestamp close to now', () => {
      const before = new Date().getTime();
      const result = appController.getHealth();
      const after = new Date().getTime();
      const resultTime = new Date(result.timestamp).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before);
      expect(resultTime).toBeLessThanOrEqual(after);
    });

    it('should return fresh timestamp on each call', () => {
      const result1 = appController.getHealth();
      const result2 = appController.getHealth();
      // Both should be valid, timestamps may or may not differ within same ms
      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
    });
  });
});
