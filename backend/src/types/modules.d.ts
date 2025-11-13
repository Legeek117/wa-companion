// Type declarations for modules that don't have @types packages
// This file ensures TypeScript can find type definitions

declare module 'cors' {
  import { Request, Response, NextFunction } from 'express';
  
  interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }
  
  function cors(options?: CorsOptions): (req: Request, res: Response, next: NextFunction) => void;
  export = cors;
}

declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: number | string): Promise<string>;
  export function hashSync(data: string, saltOrRounds: number | string): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
    jwtid?: string;
    noTimestamp?: boolean;
    header?: object;
    keyid?: string;
  }
  
  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    clockTolerance?: number;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    subject?: string;
    maxAge?: string | number;
  }
  
  export interface DecodeOptions {
    complete?: boolean;
    json?: boolean;
  }
  
  export interface JwtPayload {
    [key: string]: any;
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
  }
  
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string, options?: VerifyOptions): JwtPayload | string;
  export function decode(token: string, options?: DecodeOptions): null | JwtPayload | string;
}

declare module 'qrcode' {
  export interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
  }
  
  export function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  export function toBuffer(text: string, options?: QRCodeOptions): Promise<Buffer>;
  export function toString(text: string, options?: QRCodeOptions): Promise<string>;
}

