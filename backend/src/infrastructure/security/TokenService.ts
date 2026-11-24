import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AuthTokenPayload {
  accountId: string;
  username: string;
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function loadOrCreateSecret(explicitSecret?: string): string {
  if (explicitSecret && explicitSecret.trim().length >= 32) {
    return explicitSecret.trim();
  }

  try {
    const dataDir = path.resolve(__dirname, '../../../data');
    const secretFile = path.join(dataDir, '.auth_secret');
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    fs.mkdirSync(dataDir, { recursive: true });
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

/**
 * Stateless HMAC-SHA256 signed session tokens with constant-time signature verification.
 * Prevents account takeover via forged accountId/username payloads on HTTP & Socket.IO.
 */
export class TokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(secret?: string, ttlSeconds: number = DEFAULT_TTL_SECONDS) {
    this.secret = loadOrCreateSecret(secret);
    this.ttlSeconds = ttlSeconds;
  }

  public sign(accountId: string, username: string, nowMs: number = Date.now()): string {
    const iat = Math.floor(nowMs / 1000);
    const exp = iat + this.ttlSeconds;
    const payloadObj = { sub: accountId, usr: username, iat, exp };
    const encodedPayload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
    const signature = this.computeSignature(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  public verify(token: string | undefined | null, nowMs: number = Date.now()): AuthTokenPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, providedSig] = parts;
    if (!encodedPayload || !providedSig) return null;

    const expectedSig = this.computeSignature(encodedPayload);
    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      ) as Partial<{ sub: string; usr: string; iat: number; exp: number }>;

      if (
        typeof parsed.sub !== 'string' ||
        !parsed.sub ||
        typeof parsed.usr !== 'string' ||
        !parsed.usr ||
        typeof parsed.iat !== 'number' ||
        typeof parsed.exp !== 'number'
      ) {
        return null;
      }

      const nowSec = Math.floor(nowMs / 1000);
      if (parsed.exp <= nowSec) {
        return null;
      }

      return {
        accountId: parsed.sub,
        username: parsed.usr,
        iat: parsed.iat,
        exp: parsed.exp,
      };
    } catch {
      return null;
    }
  }

  private computeSignature(encodedPayload: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');
  }
}
