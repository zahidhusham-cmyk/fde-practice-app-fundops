import { describe, expect, it } from "vitest";
import { api, fundIdByName, useFreshDatabase } from "./helpers";

useFreshDatabase();

describe("GET /api/funds/:fundId/distributions", () => {
  it("lists a fund's distributions newest first", async () => {
    const fundId = await fundIdByName("Aldermoor Growth Fund I");
    const res = await api().get(`/api/funds/${fundId}/distributions`).expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      distribution_date: "2026-08-19",
      description: "Dividend recapitalization: Ashby Health",
    });
  });

  it("returns 404 for an unknown fund", async () => {
    await api().get("/api/funds/9999/distributions").expect(404);
  });
});
