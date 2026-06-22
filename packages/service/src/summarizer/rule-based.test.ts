import { describe, expect, it } from "vitest";
import { RuleBasedSummarizer } from "./rule-based.js";

describe("RuleBasedSummarizer", () => {
  const summarizer = new RuleBasedSummarizer();

  it("builds summary, evidence, and confidence for multiple articles", () => {
    const result = summarizer.summarizeTopic(
      "Oracle Cloud Backup",
      [
        {
          url: "https://docs.oracle.com/backup",
          title: "OCI Backup Guide",
          content: "OCI Backup stores data in Object Storage. It supports automated policies.",
        },
        {
          url: "https://example.com/post",
          title: "Backup Overview",
          content: "Backups protect workloads. Schedule retention based on compliance needs.",
        },
      ],
      2,
    );

    expect(result.summary).toContain("Oracle Cloud Backup");
    expect(result.evidence).toHaveLength(2);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("summarizes a single URL observation", () => {
    const result = summarizer.summarizeUrl("https://example.com", {
      url: "https://example.com",
      title: "Example",
      content: "Example content for testing. It demonstrates extraction output.",
    });

    expect(result.summary).toContain("Example");
    expect(result.evidence[0]?.source).toBe("https://example.com");
  });
});
