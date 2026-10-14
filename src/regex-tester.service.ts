import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RegexTesterService {
  private readonly logger = new Logger(RegexTesterService.name);

  test(regex: string, testString: string): {
    match: string | null;
    groups: Record<string, string> | null;
    isValid: boolean;
  } {
    try {
      const flagsMatch = regex.match(/^\/(.+)\/([gimy]*)$/);
      let pattern: string;
      let flags: string;

      if (flagsMatch) {
        pattern = flagsMatch[1];
        flags = flagsMatch[2];
      } else {
        pattern = regex;
        flags = '';
      }

      const regexObj = new RegExp(pattern, flags);
      const match = regexObj.exec(testString);

      if (!match) {
        return { match: null, groups: null, isValid: false };
      }

      const groups: Record<string, string> = {};
      if (regexObj.lastIndex > 0 && typeof regexObj.lastIndex === 'number') {
        for (let i = 1; i <= regexObj.lastIndex; i++) {
          const group = regexObj.exec(testString);
          if (group && group[i] !== undefined) {
            groups[`group${i}`] = String(group[i]);
          }
        }
      }

      return {
        match: match ? match[0] : null,
        groups: Object.keys(groups).length > 0 ? groups : null,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Regex test failed', error as Error);
      return { match: null, groups: null, isValid: false };
    }
  }

  testFull(regex: string, testString: string): boolean {
    try {
      const flagsMatch = regex.match(/^\/(.+)\/([gimy]*)$/);
      let pattern: string;
      let flags: string;

      if (flagsMatch) {
        pattern = flagsMatch[1];
        flags = flagsMatch[2];
      } else {
        pattern = regex;
        flags = '';
      }

      const regexObj = new RegExp(`^${pattern}$`, flags);
      return regexObj.test(testString);
    } catch (error) {
      this.logger.error('Regex full test failed', error as Error);
      return false;
    }
  }
}