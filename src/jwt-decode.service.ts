import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtDecodeService {
  private readonly logger = new Logger(JwtDecodeService.name);

  decodeToken(token: string): any {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (decoded && decoded.payload) {
        return decoded.payload;
      }
      return jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    } catch (error) {
      this.logger.error('Failed to decode JWT token', error as Error);
      throw new Error('Invalid JWT token');
    }
  }

  getExpiry(token: string): number | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  isValid(token: string): boolean {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
      return true;
    } catch {
      return false;
    }
  }
}
