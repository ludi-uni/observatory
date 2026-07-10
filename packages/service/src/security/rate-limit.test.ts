import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "./rate-limit.js";

describe("FixedWindowRateLimiter", () => {
  it("limits a client within a window and resets after it", () => {
    const limiter = new FixedWindowRateLimiter(60_000, 2);
    expect(limiter.allow("client", 0)).toBe(true);
    expect(limiter.allow("client", 1)).toBe(true);
    expect(limiter.allow("client", 2)).toBe(false);
    expect(limiter.allow("client", 60_000)).toBe(true);
  });
});
