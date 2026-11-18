import { pool } from "../db/pool";
import * as fundQueries from "../db/queries/funds";
import * as lpQueries from "../db/queries/lps";
import { NotFoundError } from "../lib/errors";

export async function listFunds() {
  return fundQueries.listFunds(pool);
}

/** Fund header plus each LP's commitment, called, distributed and unfunded amounts. */
export async function getFundDetail(fundId: number) {
  const fund = await fundQueries.getFund(pool, fundId);
  if (!fund) throw new NotFoundError(`Fund ${fundId} not found`);

  const balances = await lpQueries.listLpBalances(pool, fundId);
  const lps = balances.map((lp) => ({
    ...lp,
    unfunded_cents: lp.commitment_cents - lp.called_cents,
  }));

  const totals = lps.reduce(
    (t, lp) => ({
      commitment_cents: t.commitment_cents + lp.commitment_cents,
      called_cents: t.called_cents + lp.called_cents,
      distributed_cents: t.distributed_cents + lp.distributed_cents,
      unfunded_cents: t.unfunded_cents + lp.unfunded_cents,
    }),
    { commitment_cents: 0, called_cents: 0, distributed_cents: 0, unfunded_cents: 0 },
  );

  return { fund, lps, totals };
}
