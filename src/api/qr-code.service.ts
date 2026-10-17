import { Injectable, Logger } from '@nestjs/common';
import QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  async generate(
    data: string,
    options?: { type?: 'png' | 'svg'; margin?: number; width?: number; height?: number },
  ): Promise<Buffer> {
    const { margin, width, height } = options ?? {};
    // `toBuffer` always renders a PNG — `type` only selects the SVG variant elsewhere.
    return QRCode.toBuffer(data, {
      margin: margin ?? 2,
      width,
      height,
    });
  }

  async generateSvg(data: string, options?: { type?: 'svg'; margin?: number; width?: number; height?: number }): Promise<string> {
    return QRCode.toString(data, {
      type: 'svg',
      margin: options?.margin ?? 2,
      width: options?.width,
      height: options?.height,
    } as Record<string, unknown>);
  }
}