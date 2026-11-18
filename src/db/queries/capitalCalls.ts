import type { Db } from "../pool";

export interface CapitalCallRow {
  id: number;
  fund_id: number;
  call_date: string;
  amount_cents: number;
  purpose: string;
}

export interface CapitalCallListRow extends CapitalCallRow {
  allocated_cents: number;
}

export interface CallAllocationRow {
  lp_id: number;
  lp_name: string;
  amount_cents: number;
}

export async function insertCapitalCall(
  db: Db,
  call: { fundId: number; callDate: string; amountCents: number; purpose: string },
): Promise<CapitalCallRow> {
  const { rows } = await db.query<CapitalCallRow>(
    `INSERT INTO capital_calls (fund_id, call_date, amount_cents, purpose)
     VALUES ($1, $2, $3, $4)
     RETURNING id, fund_id, call_date, amount_cents, purpose`,
    [call.fundId, call.callDate, call.amountCents, call.purpose],
  );
  return rows[0]!;
}

export async function insertCallAllocation(
  db: Db,
  capitalCallId: number,
  lpId: number,
  amountCents: number,
): Promise<void> {
  await db.query(
    `INSERT INTO capital_call_allocations (capital_call_id, lp_id, amount_cents)
     VALUES ($1, $2, $3)`,
    [capitalCallId, lpId, amountCents],
  );
}

/** Calls for a fund, newest first, with the sum of their per-LP allocations. */
export async function listCapitalCalls(db: Db, fundId: number): Promise<CapitalCallListRow[]> {
  const { rows } = await db.query<CapitalCallListRow>(
    `SELECT c.id, c.fund_id, c.call_date, c.amount_cents, c.purpose,
            COALESCE(SUM(a.amount_cents), 0)::bigint AS allocated_cents
       FROM capital_calls c
       LEFT JOIN capital_call_allocations a ON a.capital_call_id = c.id
      WHERE c.fund_id = $1
      GROUP BY c.id
      ORDER BY c.call_date DESC, c.id DESC`,
    [fundId],
  );
  return rows;
}

export async function getCapitalCall(db: Db, callId: number): Promise<CapitalCallRow | null> {
  const { rows } = await db.query<CapitalCallRow>(
    `SELECT id, fund_id, call_date, amount_cents, purpose FROM capital_calls WHERE id = $1`,
    [callId],
  );
  return rows[0] ?? null;
}

export async function listCallAllocations(db: Db, callId: number): Promise<CallAllocationRow[]> {
  const { rows } = await db.query<CallAllocationRow>(
    `SELECT a.lp_id, l.name AS lp_name, a.amount_cents
       FROM capital_call_allocations a
       JOIN lps l ON l.id = a.lp_id
      WHERE a.capital_call_id = $1
      ORDER BY a.lp_id`,
    [callId],
  );
  return rows;
}
