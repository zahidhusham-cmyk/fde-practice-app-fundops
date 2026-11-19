import { ValidationError } from "../lib/errors";

export interface LpShare {
  lpId: number;
  commitmentCents: number;
}

export interface Allocation {
  lpId: number;
  amountCents: number;
}

/**
 * Split an amount (in cents) across a fund's LPs in proportion to their commitments.
 * Used for capital calls: an LP with 20% of the fund's commitments pays 20% of the call.
 */
export function allocateProRata(amountCents: number, shares: LpShare[]): Allocation[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new ValidationError("amount must be a positive integer number of cents");
  }
  if (shares.length === 0) {
    throw new ValidationError("cannot allocate across a fund with no LPs");
  }

  const totalCommitment = shares.reduce((sum, s) => sum + s.commitmentCents, 0);
  if (totalCommitment <= 0) {
    throw new ValidationError("total commitment must be positive");
  }

  // Calculate each LP's pro-rata share, rounded to the nearest cent.
  const allocations = shares.map((s) => {
    const ratio = s.commitmentCents / totalCommitment;
    return { lpId: s.lpId, amountCents: Math.round(amountCents * ratio) };
  });

  // Due to rounding, the total might be off by a cent or two.
  // Allocate any remainder to the first LP to ensure the total equals exactly the amount.
  const total = allocations.reduce((sum, a) => sum + a.amountCents, 0);
  const remainder = amountCents - total;
  if (remainder !== 0) {
    allocations[0]!.amountCents += remainder;
  }

  return allocations;
}
