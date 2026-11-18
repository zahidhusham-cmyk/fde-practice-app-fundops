import { pool, withTransaction } from "../db/pool";
import * as callQueries from "../db/queries/capitalCalls";
import * as fundQueries from "../db/queries/funds";
import * as lpQueries from "../db/queries/lps";
import { NotFoundError } from "../lib/errors";
import { allocateProRata } from "./allocation";

export interface CreateCapitalCallInput {
  fundId: number;
  callDate: string;
  amountCents: number;
  purpose: string;
}

/**
 * Create a capital call and split it across the fund's LPs pro rata by commitment.
 * The call and all of its allocation rows are written in one transaction.
 */
export async function createCapitalCall(input: CreateCapitalCallInput) {
  const fund = await fundQueries.getFund(pool, input.fundId);
  if (!fund) throw new NotFoundError(`Fund ${input.fundId} not found`);

  const lps = await lpQueries.listLpsForFund(pool, input.fundId);
  const allocations = allocateProRata(
    input.amountCents,
    lps.map((lp) => ({ lpId: lp.id, commitmentCents: lp.commitment_cents })),
  );

  const call = await withTransaction(async (client) => {
    const created = await callQueries.insertCapitalCall(client, input);
    for (const a of allocations) {
      await callQueries.insertCallAllocation(client, created.id, a.lpId, a.amountCents);
    }
    return created;
  });

  return getCapitalCallDetail(call.id);
}

export async function listCapitalCalls(fundId: number) {
  const fund = await fundQueries.getFund(pool, fundId);
  if (!fund) throw new NotFoundError(`Fund ${fundId} not found`);
  return callQueries.listCapitalCalls(pool, fundId);
}

export async function getCapitalCallDetail(callId: number) {
  const call = await callQueries.getCapitalCall(pool, callId);
  if (!call) throw new NotFoundError(`Capital call ${callId} not found`);
  const allocations = await callQueries.listCallAllocations(pool, callId);
  return { ...call, allocations };
}
