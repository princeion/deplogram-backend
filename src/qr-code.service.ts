import { Injectable, Logger } from '@nestjs/common';
import QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  async generate(
    data: string,
    options?: { margin?: number; width?: number; height?: number },
  ): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      margin: options?.margin ?? 2,
    });
  }

  async generateSvg(data: string, options?: { width?: number; height?: number }): Promise<string> {
    return QRCode.toString(data, {
      type: 'svg',
      margin: options?.margin ?? 2,
    });
  }
}