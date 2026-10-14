import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageTransformService {
  private readonly logger = new Logger(ImageTransformService.name);

  async resize(
    buffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer> {
    return sharp(buffer).resize(width, height).toBuffer();
  }

  async compress(
    buffer: Buffer,
    quality: number = 80,
  ): Promise<Buffer> {
    return sharp(buffer).jpeg({ quality }).toBuffer();
  }

  async convert(
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp' | 'avif',
  ): Promise<Buffer> {
    return sharp(buffer).toFormat(format).toBuffer();
  }

  async optimize(buffer: Buffer, quality: number = 80): Promise<Buffer> {
    return sharp(buffer)
      .jpeg({ quality })
      .resize(1920, 1080)
      .toBuffer();
  }
}