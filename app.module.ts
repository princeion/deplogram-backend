import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OTPService } from './otp.service';
import { EmailService } from './email.service';
import { JsonFormatterService } from './json-formatter.service';
import { JwtDecodeService } from './jwt-decode.service';
import { Base64Service } from './base64.service';
import { RegexTesterService } from './regex-tester.service';
import { CronHelperService } from './cron-helper.service';
import { WebhookTesterService } from './webhook-tester.service';
import { ImageTransformService } from './image-transform.service';
import { QrCodeService } from './qr-code.service';

@Module({
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