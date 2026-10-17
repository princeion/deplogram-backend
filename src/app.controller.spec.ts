import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { WebhookTesterService } from './webhook-tester.service.js';
import { Base64Service } from './base64.service.js';
import { CronHelperService } from './cron-helper.service.js';
import { EmailService } from './email.service.js';
import { JsonFormatterService } from './json-formatter.service.js';
import { JwtDecodeService } from './jwt-decode.service.js';
import { ImageTransformService } from './image-transform.service.js';
import { OTPService } from './otp.service.js';
import { QrCodeService } from './qr-code.service.js';
import { RegexTesterService } from './regex-tester.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        EmailService,
        JsonFormatterService,
        JwtDecodeService,
        Base64Service,
        RegexTesterService,
        CronHelperService,
        WebhookTesterService,
        ImageTransformService,
        OTPService,
        QrCodeService,
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns the greeting from the app service', () => {
      expect(appController.getHello()).toBe('Deplogram Backend API');
    });
  });
});
