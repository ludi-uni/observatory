import { describe, expect, it } from "vitest";
import { ObservationError } from "../errors.js";
import { assertFetchableUrl } from "./url-policy.js";

describe("assertFetchableUrl", () => {
  it("allows public https URLs", () => {
    const url = assertFetchableUrl("https://example.com/path");
    expect(url.hostname).toBe("example.com");
  });

  it("rejects non-http schemes", () => {
    expect(() => assertFetchableUrl("file:///etc/passwd")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("ftp://example.com")).toThrow(ObservationError);
  });

  it("rejects localhost and private networks", () => {
    expect(() => assertFetchableUrl("http://localhost/admin")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("http://127.0.0.1/")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("http://192.168.1.1/")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("http://10.0.0.5/")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("http://169.254.169.254/")).toThrow(ObservationError);
  });

  it("rejects credentials in URL", () => {
    expect(() => assertFetchableUrl("http://user:pass@example.com")).toThrow(ObservationError);
  });

  it("rejects internal host suffixes", () => {
    expect(() => assertFetchableUrl("http://postgres.internal/")).toThrow(ObservationError);
    expect(() => assertFetchableUrl("http://metadata.google.internal/")).toThrow(ObservationError);
  });
});
