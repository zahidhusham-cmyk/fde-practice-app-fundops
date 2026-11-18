import { pool } from "./pool";
import { allocateProRata } from "../services/allocation";
import { createCapitalCall } from "../services/capitalCalls";

/** Dollars -> integer cents, for writing seed data readably. */
const usd = (dollars: number) => Math.round(dollars * 100);

interface SeedFund {
  name: string;
  vintageYear: number;
  lps: [name: string, commitmentDollars: number][];
  calls: [date: string, amountDollars: number, purpose: string][];
  distributions: [date: string, amountDollars: number, description: string][];
}

export const SEED_FUNDS: SeedFund[] = [
  {
    name: "Aldermoor Growth Fund I",
    vintageYear: 2022,
    lps: [
      ["Halvorsen Family Office", 25_000_000],
      ["Brightwater Teachers' Pension", 40_000_000],
      ["Kestrel University Endowment", 18_500_000],
      ["Marlow & Finch Insurance", 12_750_000],
      ["Ostrander Foundation", 7_333_333],
      ["Juniper Ridge Capital", 15_000_000],
      ["Cassius Wealth Partners", 9_250_000],
      ["Tamsin Okafor", 2_166_667],
    ],
    calls: [
      ["2026-01-15", 13_000_000, "Initial investments: Calder Software, Ashby Health"],
      ["2026-04-22", 7_777_777.77, "Harbor Logistics follow-on"],
      ["2026-09-30", 5_250_000, "Pellam Foods acquisition and Q3 management fee"],
    ],
    distributions: [
      ["2026-06-12", 3_900_000, "Partial sale of Calder Software"],
      ["2026-08-19", 1_234_567.89, "Dividend recapitalization: Ashby Health"],
    ],
  },
  {
    name: "Aldermoor Infrastructure Fund II",
    vintageYear: 2024,
    lps: [
      ["Province of Ellery Pension Plan", 60_000_000],
      ["Greywell Sovereign Partners", 45_500_000],
      ["Saint Brendan Hospital Trust", 8_900_000],
      ["Ravenscar Mutual Life", 31_250_000],
      ["Dunmore Municipal Retirement", 22_000_000],
      ["Vesper Family Holdings", 6_125_000],
      ["Lindqvist Charitable Trust", 4_750_000],
      ["Orchard Lane Capital", 33_875_000],
    ],
    calls: [
      ["2026-02-27", 21_240_000, "Brookhaven solar portfolio"],
      ["2026-07-08", 10_101_010.1, "Toll road refinancing and Q3 management fee"],
    ],
    distributions: [["2026-10-05", 2_500_000, "Brookhaven solar: first yield distribution"]],
  },
  {
    name: "Aldermoor Ventures III",
    vintageYear: 2025,
    lps: [
      ["Pemberton Endowment", 9_000_000],
      ["Amaya Ito", 1_100_000],
      ["Coldharbour Fund of Funds", 12_400_000],
      ["Westmarch Foundation", 5_600_000],
      ["Ferris & Vale Family Office", 7_250_000],
      ["Quill Street Partners", 3_150_000],
      ["Northcote Teachers' Annuity", 8_000_000],
      ["Bexley Angel Syndicate", 2_100_000],
    ],
    calls: [
      ["2026-01-30", 24_300_000, "Seed and Series A investments"],
      ["2026-05-14", 12_150_000, "Follow-on investments"],
      ["2026-08-28", 5_832_000, "Reserves for Lumen Robotics bridge round"],
    ],
    distributions: [["2026-11-02", 850_000, "Secondary sale: Tidewell Labs shares"]],
  },
];

export async function seed(): Promise<void> {
  for (const f of SEED_FUNDS) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO funds (name, vintage_year) VALUES ($1, $2) RETURNING id`,
      [f.name, f.vintageYear],
    );
    const fundId = rows[0]!.id;

    const lpIds: { lpId: number; commitmentCents: number }[] = [];
    for (const [name, commitment] of f.lps) {
      const lp = await pool.query<{ id: number }>(
        `INSERT INTO lps (fund_id, name, commitment_cents) VALUES ($1, $2, $3) RETURNING id`,
        [fundId, name, usd(commitment)],
      );
      lpIds.push({ lpId: lp.rows[0]!.id, commitmentCents: usd(commitment) });
    }

    // Historical capital calls go through the same service the API uses.
    for (const [callDate, amount, purpose] of f.calls) {
      await createCapitalCall({ fundId, callDate, amountCents: usd(amount), purpose });
    }

    // Historical distributions (there is no create-distribution service yet).
    for (const [date, amount, description] of f.distributions) {
      const d = await pool.query<{ id: number }>(
        `INSERT INTO distributions (fund_id, distribution_date, amount_cents, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [fundId, date, usd(amount), description],
      );
      for (const a of allocateProRata(usd(amount), lpIds)) {
        await pool.query(
          `INSERT INTO distribution_allocations (distribution_id, lp_id, amount_cents)
           VALUES ($1, $2, $3)`,
          [d.rows[0]!.id, a.lpId, a.amountCents],
        );
      }
    }
  }
}
