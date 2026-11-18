import type { Db } from "../pool";

export interface DistributionListRow {
  id: number;
  fund_id: number;
  distribution_date: string;
  amount_cents: number;
  description: string;
  allocated_cents: number;
}

/** Distributions for a fund, newest first, with the sum of their per-LP allocations. */
export async function listDistributions(db: Db, fundId: number): Promise<DistributionListRow[]> {
  const { rows } = await db.query<DistributionListRow>(
    `SELECT d.id, d.fund_id, d.distribution_date, d.amount_cents, d.description,
            COALESCE(SUM(a.amount_cents), 0)::bigint AS allocated_cents
       FROM distributions d
       LEFT JOIN distribution_allocations a ON a.distribution_id = d.id
      WHERE d.fund_id = $1
      GROUP BY d.id
      ORDER BY d.distribution_date DESC, d.id DESC`,
    [fundId],
  );
  return rows;
}
