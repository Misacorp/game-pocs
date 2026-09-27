/** Tiny sliding-window rate limiter (no deps). */
export class RateLimiter {
  private hits: number[] = [];
  constructor(private readonly max: number, private readonly windowMs: number) {}

  /** Returns true if this call is allowed (and records it); false if the caller should be dropped. */
  allow(now: number = Date.now()): boolean {
    while (this.hits.length && now - this.hits[0] > this.windowMs) this.hits.shift();
    if (this.hits.length >= this.max) return false;
    this.hits.push(now);
    return true;
  }
}
