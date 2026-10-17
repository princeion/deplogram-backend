import { Controller, Post, Body } from '@nestjs/common';
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

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly otpService: OTPService,
    private readonly emailService: EmailService,
    private readonly jsonFormatter: JsonFormatterService,
    private readonly jwtDecode: JwtDecodeService,
    private readonly base64: Base64Service,
    private readonly regexTester: RegexTesterService,
    private readonly cronHelper: CronHelperService,
    private readonly webhookTester: WebhookTesterService,
    private readonly imageTransform: ImageTransformService,
    private readonly qrCodeService: QrCodeService,
  ) {}

  getHello(): string {
    return this.appService.getHello();
  }

  // Auth/OTP endpoints
  @Post('auth/otp/send')
  sendOTP(@Body('email') email: string) {
    this.otpService.generateOTP(email);
    return { message: 'OTP sent successfully' };
  }

  @Post('auth/otp/verify')
  verifyOTP(@Body('email') email: string, @Body('code') code: string) {
    const valid = this.otpService.verifyOTP(email, code);
    return { valid };
  }

  // Email endpoints
  @Post('email/send')
  sendEmail(
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('html') html: string,
  ) {
    return this.emailService.sendTransactionalEmail(to, subject, html);
  }

  // JSON formatter endpoints
  @Post('utils/json/formatter')
  formatJSON(@Body('json') json: string) {
    return this.jsonFormatter.format(json);
  }

  @Post('utils/json/validate')
  validateJSON(@Body('json') json: string) {
    return this.jsonFormatter.validate(json);
  }

  @Post('utils/json/minify')
  minifyJSON(@Body('json') json: string) {
    return this.jsonFormatter.minify(json);
  }

  // JWT decoder endpoints
  @Post('utils/jwt/decode')
  decodeToken(@Body('token') token: string) {
    return this.jwtDecode.decodeToken(token);
  }

  @Post('utils/jwt/expiry')
  getExpiry(@Body('token') token: string) {
    return { expiry: this.jwtDecode.getExpiry(token) };
  }

  @Post('utils/jwt/validate')
  validateToken(@Body('token') token: string) {
    return { valid: this.jwtDecode.isValid(token) };
  }

  // Base64 endpoints
  @Post('utils/base64/encode')
  encodeBase64(@Body('data') data: string) {
    return { encoded: this.base64.encode(data) };
  }

  @Post('utils/base64/decode')
  decodeBase64(@Body('encoded') encoded: string) {
    return { decoded: this.base64.decode(encoded) };
  }

  // Regex tester endpoints
  @Post('utils/regex/test')
  testRegex(
    @Body('regex') regex: string,
    @Body('testString') testString: string,
  ) {
    return this.regexTester.test(regex, testString);
  }

  @Post('utils/regex/validate')
  validateRegex(
    @Body('regex') regex: string,
    @Body('testString') testString: string,
  ) {
    return this.regexTester.testFull(regex, testString);
  }

  // Cron helper endpoints
  @Post('utils/cron/parse')
  parseCron(@Body('expression') expression: string) {
    return this.cronHelper.parse(expression);
  }

  @Post('utils/cron/readable')
  cronToHuman(@Body('expression') expression: string) {
    return this.cronHelper.humanReadable(expression);
  }

  // Webhook tester endpoints
  @Post('utils/webhook/test')
  testWebhook(
    @Body('url') url: string,
    @Body('method') method: string = 'POST',
    @Body('body') body?: any,
  ) {
    return this.webhookTester.trigger(url, method, body);
  }

  @Post('utils/webhook/received')
  getReceivedWebhooks() {
    return this.webhookTester.getReceivedRequests();
  }

  @Post('utils/webhook/clear')
  clearWebhooks() {
    this.webhookTester.clearRequests();
    return { message: 'Webhooks cleared' };
  }

  // Image transform endpoints
  @Post('utils/image/transform')
  async transformImage(
    @Body('buffer') buffer: Buffer,
    @Body('width') width: number,
    @Body('height') height: number,
  ) {
    return this.imageTransform.resize(buffer, width, height);
  }

  @Post('utils/image/compress')
  async compressImage(
    @Body('buffer') buffer: Buffer,
    @Body('quality') quality?: number,
  ) {
    return this.imageTransform.compress(buffer, quality || 80);
  }

  @Post('utils/image/convert')
  async convertImage(
    @Body('buffer') buffer: Buffer,
    @Body('format') format: 'jpeg' | 'png' | 'webp' | 'avif',
  ) {
    return this.imageTransform.convert(buffer, format);
  }

  // QR code endpoints
  @Post('utils/qr/generate')
  async generateQR(
    @Body('data') data: string,
    @Body('type') type?: 'png' | 'svg',
  ) {
    return this.qrCodeService.generate(data, { type });
  }
}
