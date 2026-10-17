import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { OTPService } from './otp.service.js';
import { EmailService } from './email.service.js';
import { JsonFormatterService } from './json-formatter.service.js';
import { JwtDecodeService } from './jwt-decode.service.js';
import { Base64Service } from './base64.service.js';
import { RegexTesterService } from './regex-tester.service.js';
import { CronHelperService } from './cron-helper.service.js';
import { WebhookTesterService } from './webhook-tester.service.js';
import { ImageTransformService } from './image-transform.service.js';
import { QrCodeService } from './qr-code.service.js';
import { DeplogramModule } from './deplogram/deplogram.module.js';

@Global()
@Module({
  imports: [DeplogramModule],
  controllers: [AppController],
  providers: [
    AppService,
    OTPService,
    EmailService,
    JsonFormatterService,
    JwtDecodeService,
    Base64Service,
    RegexTesterService,
    CronHelperService,
    WebhookTesterService,
    ImageTransformService,
    QrCodeService,
  ],
})
export class AppModule {}
