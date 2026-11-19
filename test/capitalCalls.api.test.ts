import { describe, expect, it } from "vitest";
import { api, fundIdByName, sumCents, useFreshDatabase } from "./helpers";

useFreshDatabase();

const GROWTH_FUND = "Aldermoor Growth Fund I";

describe("POST /api/funds/:fundId/capital-calls", () => {
  it("creates a call with one allocation per LP", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const res = await api()
      .post(`/api/funds/${fundId}/capital-calls`)
      .send({ call_date: "2026-11-20", amount_cents: 1_300_000_00, purpose: "Q4 management fee" })
      .expect(201);

    expect(res.body).toMatchObject({
      fund_id: fundId,
      call_date: "2026-11-20",
      amount_cents: 1_300_000_00,
      purpose: "Q4 management fee",
    });
    expect(res.body.allocations).toHaveLength(8);
    // $1.3M is exactly 1% of the fund's $130M commitments.
    const brightwater = res.body.allocations.find(
      (a: { lp_name: string }) => a.lp_name === "Brightwater Teachers' Pension",
    );
    expect(brightwater.amount_cents).toBe(400_000_00);
  });

  it("allocations sum exactly to the call amount", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const amountCents = 3_000_000_00; // $3,000,000.00
    const res = await api()
      .post(`/api/funds/${fundId}/capital-calls`)
      .send({ call_date: "2026-11-20", amount_cents: amountCents, purpose: "Pellam Foods add-on" })
      .expect(201);

    expect(sumCents(res.body.allocations)).toBe(amountCents);
  });

  it("updates each LP's called-to-date on the fund page", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const before = await api().get(`/api/funds/${fundId}`).expect(200);
    await api()
      .post(`/api/funds/${fundId}/capital-calls`)
      .send({ call_date: "2026-11-20", amount_cents: 1_300_000_00 })
      .expect(201);
    const after = await api().get(`/api/funds/${fundId}`).expect(200);

    expect(after.body.totals.called_cents - before.body.totals.called_cents).toBe(1_300_000_00);
  });

  it.each([
    [{ call_date: "2026-11-20", amount_cents: 0 }],
    [{ call_date: "2026-11-20", amount_cents: -100 }],
    [{ call_date: "2026-11-20", amount_cents: 99.5 }],
    [{ call_date: "2026-11-20", amount_cents: "1000" }],
    [{ call_date: "2026-02-30", amount_cents: 1000 }],
    [{ amount_cents: 1000 }],
  ])("rejects invalid input %j with 400", async (body) => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const res = await api().post(`/api/funds/${fundId}/capital-calls`).send(body).expect(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("returns 404 for an unknown fund", async () => {
    await api()
      .post("/api/funds/9999/capital-calls")
      .send({ call_date: "2026-11-20", amount_cents: 1000 })
      .expect(404);
  });

  it("rejects a call that would over-call an LP", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    // Get current fund balance to know how much is left
    const fundBefore = await api().get(`/api/funds/${fundId}`).expect(200);
    const unfundedCents = fundBefore.body.totals.unfunded_cents;

    // Try to call more than the total unfunded amount, which should fail
    const overCallAmount = unfundedCents + 1_000_000_00; // $10M more than unfunded
    const res = await api()
      .post(`/api/funds/${fundId}/capital-calls`)
      .send({ call_date: "2026-11-20", amount_cents: overCallAmount, purpose: "Over-call attempt" })
      .expect(400);

    expect(res.body.error).toContain("would ask");
    expect(res.body.error).toContain("unfunded commitment");
  });
});

describe("GET /api/funds/:fundId/capital-calls", () => {
  it("lists calls newest first", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const res = await api().get(`/api/funds/${fundId}/capital-calls`).expect(200);
    expect(res.body.map((c: { call_date: string }) => c.call_date)).toEqual([
      "2026-09-30",
      "2026-04-22",
      "2026-01-15",
    ]);
  });
});

describe("GET /api/capital-calls/:callId", () => {
  it("returns the call with its allocations", async () => {
    const fundId = await fundIdByName(GROWTH_FUND);
    const list = await api().get(`/api/funds/${fundId}/capital-calls`).expect(200);
    const res = await api().get(`/api/capital-calls/${list.body[0].id}`).expect(200);
    expect(res.body.allocations).toHaveLength(8);
  });
});
