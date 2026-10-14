import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class JsonFormatterService {
  private readonly logger = new Logger(JsonFormatterService.name);

  format(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      this.logger.error('Invalid JSON format', error as Error);
      throw new Error('Invalid JSON');
    }
  }

  validate(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  minify(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch (error) {
      this.logger.error('Invalid JSON for minification', error as Error);
      throw new Error('Invalid JSON');
    }
  }
}