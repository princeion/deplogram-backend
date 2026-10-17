import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class Base64Service {
  private readonly logger = new Logger(Base64Service.name);

  encode(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  decode(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  }

  encodeFile(fileBuffer: Buffer): string {
    return fileBuffer.toString('base64');
  }
}
