import { describe, expect, it } from "vitest";
import { parseQuarter } from "../src/lib/quarters";

describe("parseQuarter", () => {
  it("returns the first and last day of each quarter", () => {
    expect(parseQuarter("2026-Q1")).toMatchObject({ start: "2026-01-01", end: "2026-03-31" });
    expect(parseQuarter("2026-Q2")).toMatchObject({ start: "2026-04-01", end: "2026-06-30" });
    expect(parseQuarter("2026-Q3")).toMatchObject({ start: "2026-07-01", end: "2026-09-30" });
    expect(parseQuarter("2026-Q4")).toMatchObject({ start: "2026-10-01", end: "2026-12-31" });
  });

  it("rejects malformed labels", () => {
    expect(() => parseQuarter("2026-Q5")).toThrow();
    expect(() => parseQuarter("Q3-2026")).toThrow();
    expect(() => parseQuarter("2026Q3")).toThrow();
  });
});
