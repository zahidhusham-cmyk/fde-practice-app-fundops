import { describe, expect, it } from "vitest";
import { allocateProRata } from "../src/services/allocation";

describe("allocateProRata", () => {
  it("splits an amount in proportion to commitments", () => {
    const result = allocateProRata(100_000, [
      { lpId: 1, commitmentCents: 6_000_000 },
      { lpId: 2, commitmentCents: 3_000_000 },
      { lpId: 3, commitmentCents: 1_000_000 },
    ]);
    expect(result).toEqual([
      { lpId: 1, amountCents: 60_000 },
      { lpId: 2, amountCents: 30_000 },
      { lpId: 3, amountCents: 10_000 },
    ]);
  });

  it("gives a single LP the whole amount", () => {
    expect(allocateProRata(12_345, [{ lpId: 7, commitmentCents: 500 }])).toEqual([
      { lpId: 7, amountCents: 12_345 },
    ]);
  });

  it("rejects amounts that are not positive whole cents", () => {
    const shares = [{ lpId: 1, commitmentCents: 100 }];
    expect(() => allocateProRata(0, shares)).toThrow();
    expect(() => allocateProRata(-500, shares)).toThrow();
    expect(() => allocateProRata(10.5, shares)).toThrow();
  });

  it("rejects a fund with no LPs", () => {
    expect(() => allocateProRata(1_000, [])).toThrow(/no LPs/);
  });
});
