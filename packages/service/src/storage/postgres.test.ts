import { describe, expect, it } from "vitest";
import { serializeJsonb } from "./postgres.js";

describe("serializeJsonb", () => {
  it("should serialize evidence arrays as valid JSON when passed to JSONB", () => {
    const evidence = [
      {
        source: "https://example.com/article",
        claim: "The article contains an evidence claim.",
        sources: ["https://example.com/article"],
        confidence: 0.8,
      },
    ];

    const serialized = serializeJsonb(evidence);

    expect(JSON.parse(serialized)).toEqual(evidence);
    expect(serialized).toBe(JSON.stringify(evidence));
  });

  it("should reject values that cannot be represented as JSON", () => {
    expect(() => serializeJsonb(undefined)).toThrow("JSONB value must be JSON-serializable");
  });
});
