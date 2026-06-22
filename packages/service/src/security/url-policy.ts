import { isIP } from "node:net";
import { ObservationError } from "../errors.js";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export { MAX_BODY_BYTES, MAX_REDIRECTS };

export function assertFetchableUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new ObservationError("FETCH_FAILED");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ObservationError("FETCH_FAILED");
  }

  if (url.username || url.password) {
    throw new ObservationError("FETCH_FAILED");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new ObservationError("FETCH_FAILED");
  }

  return url;
}

export function assertFetchableResolvedUrl(urlString: string): void {
  assertFetchableUrl(urlString);
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }

  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    return isPrivateIpv4(host);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(host);
  }

  return false;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}
