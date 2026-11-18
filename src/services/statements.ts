import { pool } from "../db/pool";
import * as lpQueries from "../db/queries/lps";
import * as statementQueries from "../db/queries/statements";
import { NotFoundError } from "../lib/errors";
import { parseQuarter } from "../lib/quarters";

/** An LP's quarterly statement: activity in the quarter plus balances at quarter end. */
export async function getQuarterlyStatement(lpId: number, quarterLabel: string) {
  const quarter = parseQuarter(quarterLabel);
  const lp = await lpQueries.getLp(pool, lpId);
  if (!lp) throw new NotFoundError(`LP ${lpId} not found`);

  const [calls, distributions, calledToDate, distributedToDate] = await Promise.all([
    statementQueries.callsForLpInPeriod(pool, lpId, quarter.start, quarter.end),
    statementQueries.distributionsForLpInPeriod(pool, lpId, quarter.start, quarter.end),
    statementQueries.cumulativeCalled(pool, lpId, quarter.end),
    statementQueries.cumulativeDistributed(pool, lpId, quarter.end),
  ]);

  const sum = (lines: { amount_cents: number }[]) =>
    lines.reduce((total, line) => total + line.amount_cents, 0);

  return {
    lp: { id: lp.id, name: lp.name, fund_id: lp.fund_id, fund_name: lp.fund_name },
    quarter: { label: quarter.label, start: quarter.start, end: quarter.end },
    commitment_cents: lp.commitment_cents,
    calls,
    distributions,
    called_in_quarter_cents: sum(calls),
    distributed_in_quarter_cents: sum(distributions),
    cumulative_called_cents: calledToDate,
    cumulative_distributed_cents: distributedToDate,
    unfunded_cents: lp.commitment_cents - calledToDate,
  };
}
