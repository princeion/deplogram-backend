import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CronHelperService {
  private readonly logger = new Logger(CronHelperService.name);

  parse(cronExpression: string): { fields: string[]; nextRun: Date } {
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5 && fields.length !== 6) {
      throw new Error('Invalid cron expression: expected 5 or 6 fields');
    }
    this.logger.log(`Parsed cron expression: ${cronExpression}`);
    return { fields, nextRun: new Date() };
  }

  humanReadable(cronExpression: string): string {
    const fields = cronExpression.trim().split(/\s+/);
    const parts: string[] = [];
    const fieldDescriptions: { [key: number]: string } = {
      0: 'second',
      1: 'minute',
      2: 'hour',
      3: 'day of month',
      4: 'month',
      5: 'day of week',
    };
    for (let i = 0; i < fields.length; i++) {
      parts.push(`${fields[i]} ${fieldDescriptions[i]}`);
    }
    return parts.join(', ');
  }
}
