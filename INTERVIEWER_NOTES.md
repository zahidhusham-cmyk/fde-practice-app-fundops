# Interviewer notes (SPOILERS)

Don't read this before a practice run. Use it afterwards to grade yourself.

## Baseline state

- `npm test`: **27 tests, 1 failing**: `capitalCalls.api.test.ts > POST /api/funds/:fundId/capital-calls > allocations sum exactly to the call amount` (expected 300000000, received 300000001).
- `npm run typecheck`: clean.
- Seeded data already shows the symptom. On the Growth Fund I page, the 2026-09-30 call of $5,250,000.00 shows $5,249,999.99 under "Allocated to LPs", and the 2026-08-19 distribution of $1,234,567.89 shows $1,234,567.88. Ventures III's 2026-11-02 distribution is allocated 1 cent over.

---

## Task 1: allocation rounding (planted bug)

**Where:** `src/services/allocation.ts` → `allocateProRata`. Each LP's share is `Math.round(amount * ratio)`, so each share is rounded on its own and the rounded shares don't necessarily sum to the total. Depending on the amount it can be a cent short (money not collected) or a cent over (LPs charged more than was called). With N LPs it can be off by up to about N/2 cents.

**A good fix:** largest-remainder (Hamilton) allocation:
1. For each LP, compute the exact share `amount * commitment / total` and take the floor.
2. Work out `leftover = amount - sum(floors)`, which is always between 0 and N-1.
3. Give 1 cent each to the `leftover` LPs with the largest fractional remainders. Break ties deterministically, for example by LP id, so re-running gives the same answer.

Strong candidates also notice:
- **Float precision:** `amountCents * ratio` uses floating-point numbers. Doing the math in `BigInt` (`BigInt(amount) * BigInt(commitment) / BigInt(total)`, with the remainder from `%`) is exact. Multiplying the integers first in plain JS numbers can exceed 2^53 with realistic numbers (a $50M commitment is 5e9 cents, times a call of 1e9 cents is 5e18), so that is worse.
- **Invariants worth testing:** the allocations sum to the amount exactly; each allocation is within 1 cent of the exact pro-rata share; the result is deterministic; a single LP gets everything. A property-style loop over many amounts is a nice touch.
- **Seed and historical data:** the seed goes through the same function, so historical rows are wrong too. In dev, `npm run db:reset` fixes them. In production you wouldn't silently rewrite past calls that LPs have already paid. You'd raise it and post an adjusting entry. Mentioning this is a strong signal.
- Distributions are seeded through `allocateProRata` as well, which sets up Task 2.

**Weak signs:** "fixing" the test by loosening it to `toBeCloseTo`; adding the leftover to the first or largest LP without explaining it (that's acceptable if explained, but less fair); not running the full suite afterwards.

## Task 2: create distributions end to end

Expected layers, mirroring capital calls:
- `db/queries/distributions.ts`: `insertDistribution`, `insertDistributionAllocation` (and `getDistribution` + allocations for the response).
- `services/distributions.ts`: `createDistribution`. Check the fund exists (404), load the LPs, call `allocateProRata` (with the Task 1 fix, so the same correctness applies), and write the distribution and its allocations **in one transaction** with `withTransaction`.
- `routes/funds.ts`: `POST /api/funds/:fundId/distributions` that validates `distribution_date`, `amount_cents` and `description` with the existing helpers and returns **201**.
- `public/fund.html` + `public/js/fund.js`: a form like the capital call form, dollars converted to cents with `dollarsToCents`, then refresh the distributions list and LP table.
- Tests: 201 + one allocation per LP; the sum equals the amount; it shows up in the list and in `distributed_cents`; 400 for bad input; 404 for an unknown fund.

Good discussion points: POST is not idempotent, so a double-click creates two distributions. An idempotency key or disabling the button while the request is in flight both help. Should a distribution be allowed for a fund that has called nothing? It's a business question, so ask it rather than guess. Reusing the validation helpers keeps the code consistent.

## Task 3: over-commitment validation

- Check this in the **service**, not only in the UI: compute the allocations, then for each LP compare `called_to_date + allocation` with `commitment`.
- Return **422** (or 409, or 400 if it's justified) with a message naming the LP(s) and the remaining unfunded amount. Add a small `HttpError` subclass or reuse `HttpError(422, ...)`. The page already shows `error` messages from the API.
- **Seed gives an easy test:** Ventures III is about 87% called. Its unfunded total is $6,318,000.00, so a $7,000,000 call must be rejected and a $1,000,000 call must succeed. Test the boundary too: exactly the remaining amount should succeed if the allocation gives every LP its exact remainder. Rounding can push one LP 1 cent over, and that's a nice thing to notice.
- **Concurrency (strong signal):** two calls submitted at the same moment could each pass the check. Do the read and the check inside the transaction and lock, for example with `SELECT ... FROM funds WHERE id = $1 FOR UPDATE` or row locks on the LPs, or at least name the race and how you'd fix it.
- A DB `CHECK` constraint can't easily enforce a cross-table sum, so saying why the check lives in the service is good.

## Task 4 (stretch): Q3 statement missing a call (second issue, no failing test)

- **Repro:** any Growth Fund I LP, for example `/statement.html?lp=2&quarter=2026-Q3`. "Called this quarter" shows $0.00 and the call list is empty, yet "Called to date" includes the **2026-09-30** call (Pellam Foods). The statement disagrees with itself.
- **Cause:** `parseQuarter` returns an **inclusive** last day (`end: "2026-09-30"`), but `callsForLpInPeriod` and `distributionsForLpInPeriod` in `src/db/queries/statements.ts` filter with `date < $3`, so anything on the last day of a quarter is dropped. The cumulative queries use `<=`, which is why the totals still include it.
- **Good fixes:** use `<= $3` in both period queries, or, more robust, switch to half-open ranges throughout (`start <= date < nextQuarterStart`) and update the cumulative queries and the `parseQuarter` comment to match. Either is fine if it's consistent and explained.
- **Must add a regression test:** a Q3 statement for a Growth Fund I LP includes the 2026-09-30 call, and `called_in_quarter_cents` equals that LP's allocation. Bonus: check Q2 → Q3 consistency (cumulative at end of Q2 + called in Q3 = cumulative at end of Q3).
- Also good: noticing that the DATE type parser keeps dates as strings on purpose (`db/pool.ts`), so there are no timezone shifts. Converting to JS `Date` would bring in an off-by-one-day bug in negative-UTC timezones.

---

## What good looks like (process, not just the result)

1. **Orient first (about 5 min):** read the README, run the tests and see the one failure, skim the layers (route → service → query), and open the fund page.
2. **Reproduce before fixing:** point at the seeded call whose allocated total ≠ called amount, or the failing test.
3. **Prompts are specific.** For example: "In `src/services/allocation.ts`, `allocateProRata` rounds each LP independently so totals drift. Rewrite it with largest-remainder allocation using BigInt so the sum always equals `amountCents`. Keep the signature. Don't touch other files. Then add unit tests for the sum invariant across 1,000 random amounts." Not: "fix the bug."
4. **Reviews every diff** the agent produces, especially money math, and pushes back when it's wrong.
5. **Runs `npm test` and `npm run typecheck` after each change**, not only at the end.
6. **Narrates tradeoffs:** rounding fairness, 422 vs 400, transactions and locking, rewriting history vs adjusting entries.
7. **Small, separate commits**, one per task.

Red flags: accepting a large agent diff without reading it; changing tests to match buggy output; floats for money; no transaction around multi-row writes; string-concatenated SQL.
