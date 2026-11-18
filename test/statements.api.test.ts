import { describe, expect, it } from "vitest";
import { api, lpIdByName, useFreshDatabase } from "./helpers";

useFreshDatabase();

describe("GET /api/lps/:lpId/statements/:quarter", () => {
  it("shows Q2 activity and balances at quarter end", async () => {
    const lpId = await lpIdByName("Brightwater Teachers' Pension");
    const res = await api().get(`/api/lps/${lpId}/statements/2026-Q2`).expect(200);

    expect(res.body.quarter).toEqual({ label: "2026-Q2", start: "2026-04-01", end: "2026-06-30" });
    expect(res.body.commitment_cents).toBe(40_000_000_00);
    expect(res.body.calls).toHaveLength(1);
    expect(res.body.calls[0].date).toBe("2026-04-22");
    expect(res.body.distributions).toHaveLength(1);
    expect(res.body.distributions[0].date).toBe("2026-06-12");
    expect(res.body.unfunded_cents).toBe(
      res.body.commitment_cents - res.body.cumulative_called_cents,
    );
    // Cumulative includes Q1's call too.
    expect(res.body.cumulative_called_cents).toBeGreaterThan(res.body.called_in_quarter_cents);
  });

  it("returns 400 for a malformed quarter", async () => {
    const lpId = await lpIdByName("Brightwater Teachers' Pension");
    await api().get(`/api/lps/${lpId}/statements/2026-Q7`).expect(400);
  });

  it("returns 404 for an unknown LP", async () => {
    await api().get("/api/lps/9999/statements/2026-Q2").expect(404);
  });
});
