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

describe("POST /api/funds/:fundId/lps", () => {
  it("creates a new LP with the given commitment", async () => {
    const fundId = await fundIdByName("Aldermoor Growth Fund I");
    const res = await api()
      .post(`/api/funds/${fundId}/lps`)
      .send({ name: "New Investor Corp", commitment_cents: 5_000_000_00 })
      .expect(201);

    expect(res.body).toMatchObject({
      fund_id: fundId,
      name: "New Investor Corp",
      commitment_cents: 5_000_000_00,
    });
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it("trims whitespace from the LP name", async () => {
    const fundId = await fundIdByName("Aldermoor Growth Fund I");
    const res = await api()
      .post(`/api/funds/${fundId}/lps`)
      .send({ name: "  Trimmed Investor  ", commitment_cents: 2_000_000_00 })
      .expect(201);

    expect(res.body.name).toBe("Trimmed Investor");
  });

  it("adds the new LP to the fund's LP list", async () => {
    const fundId = await fundIdByName("Aldermoor Growth Fund I");
    const beforeRes = await api().get(`/api/funds/${fundId}`).expect(200);
    const beforeCount = beforeRes.body.lps.length;

    await api()
      .post(`/api/funds/${fundId}/lps`)
      .send({ name: "Late Joiner Fund", commitment_cents: 10_000_000_00 })
      .expect(201);

    const afterRes = await api().get(`/api/funds/${fundId}`).expect(200);
    expect(afterRes.body.lps).toHaveLength(beforeCount + 1);

    const newLp = afterRes.body.lps.find((lp: { name: string }) => lp.name === "Late Joiner Fund");
    expect(newLp).toMatchObject({
      name: "Late Joiner Fund",
      commitment_cents: 10_000_000_00,
      called_cents: 0,
      distributed_cents: 0,
      unfunded_cents: 10_000_000_00,
    });
  });

  it.each([
    [{ commitment_cents: 0 }, "positive"],
    [{ commitment_cents: -100 }, "positive"],
    [{ commitment_cents: 100.5 }, "integer"],
    [{ commitment_cents: "1000" }, "number"],
    [{ name: "", commitment_cents: 1000 }, "non-empty"],
    [{ name: "   ", commitment_cents: 1000 }, "non-empty"],
    [{}, "string"],
  ])("rejects invalid input %j with 400", async (body) => {
    const fundId = await fundIdByName("Aldermoor Growth Fund I");
    const res = await api()
      .post(`/api/funds/${fundId}/lps`)
      .send(body)
      .expect(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("returns 404 for an unknown fund", async () => {
    await api()
      .post("/api/funds/9999/lps")
      .send({ name: "Any Investor", commitment_cents: 1_000_000_00 })
      .expect(404);
  });
});
