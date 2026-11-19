import { pool, withTransaction } from "../db/pool";
import * as distributionQueries from "../db/queries/distributions";
import * as fundQueries from "../db/queries/funds";
import * as lpQueries from "../db/queries/lps";
import { NotFoundError } from "../lib/errors";
import { allocateProRata } from "./allocation";

export interface CreateDistributionInput {
  fundId: number;
  distributionDate: string;
  amountCents: number;
  description: string;
}

/**
 * Create a distribution and split it across the fund's LPs pro rata by commitment.
 * The distribution and all of its allocation rows are written in one transaction.
 */
export async function createDistribution(input: CreateDistributionInput) {
  const fund = await fundQueries.getFund(pool, input.fundId);
  if (!fund) throw new NotFoundError(`Fund ${input.fundId} not found`);

  const lps = await lpQueries.listLpsForFund(pool, input.fundId);
  const allocations = allocateProRata(
    input.amountCents,
    lps.map((lp) => ({ lpId: lp.id, commitmentCents: lp.commitment_cents })),
  );

  const distribution = await withTransaction(async (client) => {
    const created = await distributionQueries.insertDistribution(client, input);
    for (const a of allocations) {
      await distributionQueries.insertDistributionAllocation(
        client,
        created.id,
        a.lpId,
        a.amountCents,
      );
    }
    return created;
  });

  return getDistributionDetail(distribution.id);
}

export async function listDistributions(fundId: number) {
  const fund = await fundQueries.getFund(pool, fundId);
  if (!fund) throw new NotFoundError(`Fund ${fundId} not found`);
  return distributionQueries.listDistributions(pool, fundId);
}

export async function getDistributionDetail(distributionId: number) {
  const distribution = await distributionQueries.getDistribution(pool, distributionId);
  if (!distribution)
    throw new NotFoundError(`Distribution ${distributionId} not found`);
  const allocations = await distributionQueries.listDistributionAllocations(
    pool,
    distributionId,
  );
  return { ...distribution, allocations };
}
