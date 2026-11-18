import { describe, expect, it } from "vitest";
import { api, fundIdByName, useFreshDatabase } from "./helpers";

useFreshDatabase();

describe("GET /api/funds", () => {
  it("lists the seeded funds with LP counts and total commitments", async () => {
    const res = await api().get("/api/funds").expect(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({
      name: "Aldermoor Growth Fund I",
      lp_count: 8,
      total_commitment_cents: 130_000_000_00,
    });
  });
});

describe("GET /api/funds/:fundId", () => {
  it("shows each LP's commitment, called, distributed and unfunded amounts", async () => {
    const fundId = await fundIdByName("Aldermoor Ventures III");
    const res = await api().get(`/api/funds/${fundId}`).expect(200);

    expect(res.body.fund.name).toBe("Aldermoor Ventures III");
    expect(res.body.lps).toHaveLength(8);
    for (const lp of res.body.lps) {
      expect(lp.unfunded_cents).toBe(lp.commitment_cents - lp.called_cents);
      expect(lp.called_cents).toBeGreaterThan(0);
    }
    const pemberton = res.body.lps.find((lp: { name: string }) => lp.name === "Pemberton Endowment");
    expect(pemberton.commitment_cents).toBe(9_000_000_00);
  });

  it("returns 404 for an unknown fund", async () => {
    await api().get("/api/funds/9999").expect(404);
  });

  it("returns 400 for a non-numeric fund id", async () => {
    await api().get("/api/funds/abc").expect(400);
  });
});
