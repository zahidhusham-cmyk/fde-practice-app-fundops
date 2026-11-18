import type { Db } from "../pool";

export interface FundRow {
  id: number;
  name: string;
  vintage_year: number;
}

export interface FundSummaryRow extends FundRow {
  lp_count: number;
  total_commitment_cents: number;
}

export async function listFunds(db: Db): Promise<FundSummaryRow[]> {
  const { rows } = await db.query<FundSummaryRow>(
    `SELECT f.id, f.name, f.vintage_year,
            COUNT(l.id)::int AS lp_count,
            COALESCE(SUM(l.commitment_cents), 0)::bigint AS total_commitment_cents
       FROM funds f
       LEFT JOIN lps l ON l.fund_id = f.id
      GROUP BY f.id
      ORDER BY f.id`,
  );
  return rows;
}

export async function getFund(db: Db, fundId: number): Promise<FundRow | null> {
  const { rows } = await db.query<FundRow>(
    `SELECT id, name, vintage_year FROM funds WHERE id = $1`,
    [fundId],
  );
  return rows[0] ?? null;
}
