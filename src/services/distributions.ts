import { pool } from "../db/pool";
import * as distributionQueries from "../db/queries/distributions";
import * as fundQueries from "../db/queries/funds";
import { NotFoundError } from "../lib/errors";

export async function listDistributions(fundId: number) {
  const fund = await fundQueries.getFund(pool, fundId);
  if (!fund) throw new NotFoundError(`Fund ${fundId} not found`);
  return distributionQueries.listDistributions(pool, fundId);
}
