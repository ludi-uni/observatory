interface Bucket {
  startedAt: number;
  count: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    if (this.maxRequests <= 0) return true;
    const current = this.buckets.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.maxRequests) return false;
    current.count += 1;
    return true;
  }
}

export class ObservationConcurrencyLimiter {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.limit <= 0 || this.active < this.limit) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    this.waiters.shift()?.();
  }
}
