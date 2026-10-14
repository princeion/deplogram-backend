declare module 'qrcode' {
  export function toBuffer(data: string | URL, options?: { margin?: number; scale?: number; width?: number; height?: number; color?: { dark: string; light: string } }): Promise<Buffer>;
  export function toString(data: string | URL, options?: { margin?: number; width?: number; height?: number; color?: { dark: string; light: string } }): Promise<string>;
  export enum ErrorCorrectionLevel { L = 'L', M = 'M', Q = 'Q', H = 'H' };
  export type Render = 'canvas' | 'svg' | 'html' | 'terminal';
  export interface toBufferOptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    scale?: number;
    width?: number;
    height?: number;
    color?: { dark: string; light: string };
  }
  export interface toStringOptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    width?: number;
    height?: number;
    color?: { dark: string; light: string };
    ecm?: boolean;
  }
}
