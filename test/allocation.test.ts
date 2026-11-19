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

  it("allocations sum to exactly the total amount (handles rounding)", () => {
    // This is the seed data case: $1,234,567.89 split across 8 LPs with uneven commitments.
    const result = allocateProRata(123_456_789, [
      { lpId: 1, commitmentCents: 2_500_000_000 }, // Halvorsen
      { lpId: 2, commitmentCents: 4_000_000_000 }, // Brightwater
      { lpId: 3, commitmentCents: 1_850_000_000 }, // Kestrel
      { lpId: 4, commitmentCents: 1_275_000_000 }, // Marlow & Finch
      { lpId: 5, commitmentCents: 733_333_300 }, // Ostrander
      { lpId: 6, commitmentCents: 1_500_000_000 }, // Juniper Ridge
      { lpId: 7, commitmentCents: 925_000_000 }, // Cassius
      { lpId: 8, commitmentCents: 216_666_700 }, // Tamsin
    ]);

    const total = result.reduce((sum, a) => sum + a.amountCents, 0);
    expect(total).toBe(123_456_789);
  });
});
