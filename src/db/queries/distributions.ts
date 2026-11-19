import type { Db } from "../pool";

export interface DistributionRow {
  id: number;
  fund_id: number;
  distribution_date: string;
  amount_cents: number;
  description: string;
}

export interface DistributionListRow extends DistributionRow {
  allocated_cents: number;
}

export interface DistributionAllocationRow {
  lp_id: number;
  lp_name: string;
  amount_cents: number;
}

export async function insertDistribution(
  db: Db,
  distribution: {
    fundId: number;
    distributionDate: string;
    amountCents: number;
    description: string;
  },
): Promise<DistributionRow> {
  const { rows } = await db.query<DistributionRow>(
    `INSERT INTO distributions (fund_id, distribution_date, amount_cents, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, fund_id, distribution_date, amount_cents, description`,
    [
      distribution.fundId,
      distribution.distributionDate,
      distribution.amountCents,
      distribution.description,
    ],
  );
  return rows[0]!;
}

export async function insertDistributionAllocation(
  db: Db,
  distributionId: number,
  lpId: number,
  amountCents: number,
): Promise<void> {
  await db.query(
    `INSERT INTO distribution_allocations (distribution_id, lp_id, amount_cents)
     VALUES ($1, $2, $3)`,
    [distributionId, lpId, amountCents],
  );
}

export async function getDistribution(
  db: Db,
  distributionId: number,
): Promise<DistributionRow | null> {
  const { rows } = await db.query<DistributionRow>(
    `SELECT id, fund_id, distribution_date, amount_cents, description FROM distributions WHERE id = $1`,
    [distributionId],
  );
  return rows[0] ?? null;
}

export async function listDistributionAllocations(
  db: Db,
  distributionId: number,
): Promise<DistributionAllocationRow[]> {
  const { rows } = await db.query<DistributionAllocationRow>(
    `SELECT a.lp_id, l.name AS lp_name, a.amount_cents
       FROM distribution_allocations a
       JOIN lps l ON l.id = a.lp_id
      WHERE a.distribution_id = $1
      ORDER BY a.lp_id`,
    [distributionId],
  );
  return rows;
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
