import type { Db } from "../pool";

export interface LpRow {
  id: number;
  fund_id: number;
  name: string;
  commitment_cents: number;
}

export interface LpWithFundRow extends LpRow {
  fund_name: string;
}

export interface LpBalanceRow extends LpRow {
  called_cents: number;
  distributed_cents: number;
}

export async function insertLp(
  db: Db,
  fundId: number,
  name: string,
  commitmentCents: number,
): Promise<LpRow> {
  const { rows } = await db.query<LpRow>(
    `INSERT INTO lps (fund_id, name, commitment_cents)
     VALUES ($1, $2, $3)
     RETURNING id, fund_id, name, commitment_cents`,
    [fundId, name, commitmentCents],
  );
  return rows[0]!;
}

export async function listLpsForFund(db: Db, fundId: number): Promise<LpRow[]> {
  const { rows } = await db.query<LpRow>(
    `SELECT id, fund_id, name, commitment_cents
       FROM lps
      WHERE fund_id = $1
      ORDER BY id`,
    [fundId],
  );
  return rows;
}

export async function getLp(db: Db, lpId: number): Promise<LpWithFundRow | null> {
  const { rows } = await db.query<LpWithFundRow>(
    `SELECT l.id, l.fund_id, l.name, l.commitment_cents, f.name AS fund_name
       FROM lps l
       JOIN funds f ON f.id = l.fund_id
      WHERE l.id = $1`,
    [lpId],
  );
  return rows[0] ?? null;
}

/** Every LP in a fund with how much has been called from / distributed to them so far. */
export async function listLpBalances(db: Db, fundId: number): Promise<LpBalanceRow[]> {
  const { rows } = await db.query<LpBalanceRow>(
    `SELECT l.id, l.fund_id, l.name, l.commitment_cents,
            COALESCE((SELECT SUM(a.amount_cents) FROM capital_call_allocations a
                       WHERE a.lp_id = l.id), 0)::bigint AS called_cents,
            COALESCE((SELECT SUM(d.amount_cents) FROM distribution_allocations d
                       WHERE d.lp_id = l.id), 0)::bigint AS distributed_cents
       FROM lps l
      WHERE l.fund_id = $1
      ORDER BY l.id`,
    [fundId],
  );
  return rows;
}
