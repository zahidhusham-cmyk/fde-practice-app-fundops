import type { Db } from "../pool";

export interface StatementLineRow {
  id: number;
  date: string;
  description: string;
  amount_cents: number;
}

/** One LP's capital call allocations with a call date inside [start, end]. */
export async function callsForLpInPeriod(
  db: Db,
  lpId: number,
  start: string,
  end: string,
): Promise<StatementLineRow[]> {
  const { rows } = await db.query<StatementLineRow>(
    `SELECT c.id, c.call_date AS date, c.purpose AS description, a.amount_cents
       FROM capital_call_allocations a
       JOIN capital_calls c ON c.id = a.capital_call_id
      WHERE a.lp_id = $1
        AND c.call_date >= $2
        AND c.call_date < $3
      ORDER BY c.call_date, c.id`,
    [lpId, start, end],
  );
  return rows;
}

/** One LP's distribution allocations with a distribution date inside [start, end]. */
export async function distributionsForLpInPeriod(
  db: Db,
  lpId: number,
  start: string,
  end: string,
): Promise<StatementLineRow[]> {
  const { rows } = await db.query<StatementLineRow>(
    `SELECT d.id, d.distribution_date AS date, d.description, a.amount_cents
       FROM distribution_allocations a
       JOIN distributions d ON d.id = a.distribution_id
      WHERE a.lp_id = $1
        AND d.distribution_date >= $2
        AND d.distribution_date < $3
      ORDER BY d.distribution_date, d.id`,
    [lpId, start, end],
  );
  return rows;
}

/** Total called from an LP on or before a date. */
export async function cumulativeCalled(db: Db, lpId: number, through: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(a.amount_cents), 0)::bigint AS total
       FROM capital_call_allocations a
       JOIN capital_calls c ON c.id = a.capital_call_id
      WHERE a.lp_id = $1 AND c.call_date <= $2`,
    [lpId, through],
  );
  return rows[0]!.total;
}

/** Total distributed to an LP on or before a date. */
export async function cumulativeDistributed(db: Db, lpId: number, through: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(a.amount_cents), 0)::bigint AS total
       FROM distribution_allocations a
       JOIN distributions d ON d.id = a.distribution_id
      WHERE a.lp_id = $1 AND d.distribution_date <= $2`,
    [lpId, through],
  );
  return rows[0]!.total;
}
