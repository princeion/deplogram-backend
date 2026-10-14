import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OTPService {
  private readonly otpStore = new Map<string, { code: string; expiresAt: number }>();
  private readonly logger = new Logger(OTPService.name);

  generateOTP(email: string): string {
    const code = uuidv4().substring(0, 6);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    this.otpStore.set(email, { code, expiresAt });
    this.logger.log(`OTP generated for ${email}: ${code}`);
    return code;
  }

  verifyOTP(email: string, code: string): boolean {
    const entry = this.otpStore.get(email);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(email);
      return false;
    }
    if (entry.code === code) {
      this.otpStore.delete(email);
      return true;
    }
    return false;
  }

  clearOTP(email: string): void {
    this.otpStore.delete(email);
  }
}