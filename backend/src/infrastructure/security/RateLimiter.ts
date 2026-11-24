interface SlidingWindowRecord {
  timestamps: number[];
}

interface LoginLockoutRecord {
  failedAttempts: number;
  lockedUntilMs: number;
  lastAttemptMs: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * In-memory sliding-window rate limiter & per-username brute-force lockout guard.
 * Protects HTTP authentication/shop routes and Socket.IO gameplay events against flooding & password cracking.
 */
export class RateLimiter {
  private readonly windows = new Map<string, SlidingWindowRecord>();
  private readonly loginFailures = new Map<string, LoginLockoutRecord>();

  private readonly maxFailedLogins: number;
  private readonly lockoutDurationMs: number;

  constructor(maxFailedLogins = 5, lockoutDurationMs = 60_000) {
    this.maxFailedLogins = maxFailedLogins;
    this.lockoutDurationMs = lockoutDurationMs;
  }

  public consume(
    key: string,
    maxRequests: number,
    windowMs: number,
    nowMs: number = Date.now()
  ): RateLimitCheck {
    const cutoff = nowMs - windowMs;
    const record = this.windows.get(key) ?? { timestamps: [] };
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0] ?? nowMs;
      const retryAfterMs = Math.max(1000, oldest + windowMs - nowMs);
      this.windows.set(key, record);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    record.timestamps.push(nowMs);
    this.windows.set(key, record);

    // Opportunistic memory hygiene
    if (this.windows.size > 5000) {
      this.prune(nowMs);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  public checkLoginLockout(username: string, nowMs: number = Date.now()): RateLimitCheck {
    const norm = username.trim().toLowerCase();
    const rec = this.loginFailures.get(norm);
    if (!rec) return { allowed: true, retryAfterSeconds: 0 };

    if (rec.lockedUntilMs > nowMs) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((rec.lockedUntilMs - nowMs) / 1000),
      };
    }

    // Lock expired -> reset lock window
    if (rec.lockedUntilMs > 0 && rec.lockedUntilMs <= nowMs) {
      this.loginFailures.delete(norm);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  public recordLoginFailure(username: string, nowMs: number = Date.now()): void {
    const norm = username.trim().toLowerCase();
    const existing = this.loginFailures.get(norm);
    // Reset stale failure streak older than 10 minutes
    const baseFailures =
      existing && nowMs - existing.lastAttemptMs < 10 * 60_000 ? existing.failedAttempts : 0;
    const failedAttempts = baseFailures + 1;
    const lockedUntilMs =
      failedAttempts >= this.maxFailedLogins ? nowMs + this.lockoutDurationMs : 0;

    this.loginFailures.set(norm, {
      failedAttempts,
      lockedUntilMs,
      lastAttemptMs: nowMs,
    });
  }

  public clearLoginFailures(username: string): void {
    this.loginFailures.delete(username.trim().toLowerCase());
  }

  public clearKey(key: string): void {
    this.windows.delete(key);
  }

  private prune(nowMs: number): void {
    const staleThreshold = nowMs - 15 * 60_000;
    for (const [k, v] of this.windows.entries()) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1] < staleThreshold) {
        this.windows.delete(k);
      }
    }
    for (const [u, rec] of this.loginFailures.entries()) {
      if (rec.lockedUntilMs <= nowMs && nowMs - rec.lastAttemptMs > 15 * 60_000) {
        this.loginFailures.delete(u);
      }
    }
  }
}
