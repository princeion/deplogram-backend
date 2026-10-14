declare module "jsonwebtoken"
interface JwtPayload { [key: string]: any; }
export function sign(payload: JwtPayload, privateKey: string, options?: { algorithm?: string; expiresIn?: string | number }): string;
export function verify<T = any>(token: string, publicKeyOrPrivateKey: string, options?: { algorithms?: string[] }): T;
