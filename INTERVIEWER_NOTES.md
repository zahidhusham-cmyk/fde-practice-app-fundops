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

# Standalone features (Tasks 5–9)

Each one is meant to fill one 45-minute session on a fresh branch off `main`. Notes that apply to all of them:

- **Schema changes go in `db/schema.sql`.** `npm run db:reset` drops and recreates everything, and the tests call `resetDatabase()` before every test, so editing `schema.sql` (and `src/db/seed.ts`) is the "migration" here. A strong candidate says out loud that production would need a real forward migration: `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` with a backfill, and no drop/recreate.
- **Follow the layers:** `routes/*` parses and validates with `lib/validation.ts`, `services/*` holds the business rules and throws `NotFoundError`/`ValidationError`/`HttpError`, and `db/queries/*` holds the SQL. Multi-row writes use `withTransaction`.
- **Money:** integer cents everywhere. Multiplication by a rate goes through `BigInt` or integer basis points, never floats or `toFixed`.
- **Unfunded is computed in two places:** `src/services/funds.ts` (fund page) and `src/services/statements.ts` (statement). Any change to what "unfunded" means must touch both, or better, move it into one shared helper. Haiku very often updates only one of them.
- **The Task 4 bug is still on `main`.** The statement's period queries use `date < end`, so activity on the last day of a quarter is dropped, including the 2026-09-30 Growth Fund I call. Features that build on those queries (8, 9, and the statement part of 5 and 7) inherit it. Noticing it and flagging it, without silently going off course to fix it, is a good sign.
- **The Task 1 bug is still on `main`.** Allocations don't sum to the headline amount. Anything that compares "allocated" with "called" will be off by a cent here and there.
- **UI pattern:** `public/js/api.js` has `getJson`, `postJson`, `formatCents`, `dollarsToCents`, `row` and `showMessage`. New forms should reuse them, build DOM with `textContent` rather than `innerHTML` (LP names contain `&` and `'`), show API `error` messages, and re-fetch the affected tables after a write.
- **Before the first prompt, a strong candidate** reads the relevant service and query files, states the plan and the open questions out loud, and makes a reasonable assumption for each one while saying they'd confirm it with Priya.

## Task 5: capital call payments (pending vs. paid)

**What good looks like**
- **Schema:** add `paid_on DATE NULL` to `capital_call_allocations` (status derived as `paid_on IS NULL` → pending), or `status` + `paid_on` with a `CHECK` that keeps them consistent. Optionally `paid_amount_cents` for partial wires, but naming that and deferring it is fine.
- **Write endpoint:** an allocation is identified by `(capital_call_id, lp_id)`, which is unique. `listCallAllocations` doesn't return the allocation `id`, so either expose it or key the route by call + LP, e.g. `POST /api/capital-calls/:callId/allocations/:lpId/payment` with `{ "paid_on": "2026-11-20" }` → 200 with the updated allocation. PUT/PATCH semantics are fine; marking an already-paid row twice should be idempotent or return 409, but it should be a decision.
- **Validation:** unknown call or LP → 404; `paid_on` validated with `parseDate`; `paid_on` before `call_date` is suspicious, so reject it or ask. Optionally provide "mark unpaid", with an audit concern noted.
- **Reads:** add `paid_cents` / `outstanding_cents` per call in `listCapitalCalls` (`SUM(amount_cents) FILTER (WHERE paid_on IS NOT NULL)`) and per LP in `listLpBalances`. Do it in one query, not one query per call.
- **UI:** there is no call detail page today, only the `GET /api/capital-calls/:id` endpoint. Expect either a new `call.html?id=` listing allocations with a "Mark paid" button and date input, or an expandable row on `fund.html`. Add an "Outstanding" column to the calls table and the LP table.

**Ambiguities a strong candidate raises before building (deliberate)**
- Does **"unfunded commitment"** mean commitment minus *called* (today) or minus *paid*? Usually unfunded is based on called; outstanding receivables are a separate number. The candidate should keep `unfunded` unchanged and add `outstanding` next to it, or ask.
- Should the **quarterly statement** show calls *billed* in the quarter or *paid* in the quarter? The README says "calls are treated as paid on the call date", so this feature changes that assumption, and it should be said out loud.
- **Seeded historical calls:** mark them all paid on their call date, which keeps statements unchanged and is the sensible default, or leave them pending, which makes the fund look delinquent. A strong candidate picks one, puts it in the seed/reset, and says so.

**Common Haiku mistakes:** adding a status column to `capital_calls` (call level, not per LP); using a JS `Date`/timestamp that shifts days by timezone (the pool keeps DATE as a string on purpose); N+1 queries from the UI (one fetch per call); `innerHTML` with LP names; forgetting to refresh totals after marking paid.

## Task 6: onboard a new LP

**What good looks like**
- `POST /api/funds/:fundId/lps` with `{ "name": "...", "commitment_cents": 500000000 }` → 201 with the new LP. Validate the name (trimmed, non-empty, length cap) and the commitment with `parseAmountCents`. Unknown fund → 404. Duplicate name in the fund hits `UNIQUE (fund_id, name)`: catch pg error `23505` and return **409** with a clear message instead of a 500.
- New queries/service: `insertLp`, `createLp` following the funds/capital calls pattern. No transaction strictly needed for a single insert.
- **Historical allocations are untouched by design:** past calls store their allocation rows, and `allocateProRata` only runs at creation time. The strong candidate *proves* it with a test: create the LP, then compare the existing calls' allocations before and after (unchanged), then create a new call and see that the new LP gets a share and the sum is right.
- **UI:** an "Add LP" form on `fund.html` (name + commitment in dollars via `dollarsToCents`) that re-renders the LP table and totals; the funds list `lp_count` updates too.

**Questions worth asking:** Does the LP have an **admission date**? Without one, their Q1/Q2 statements would show a commitment with no activity. In real funds a late-closing LP pays an **equalization** catch-up so everyone ends up called at the same percentage. Naming it and putting it out of scope is ideal. Can an LP be in several funds? (Today `lps` is per fund, so it would be a second row.) Should ops be able to edit or remove an LP? (No, at least not one with allocations.)

**Common Haiku mistakes:** "rebalancing" existing allocations to include the new LP; treating the commitment as a float of dollars; trusting `fund_id` from the body instead of the URL; returning 500 on a duplicate; the form posting dollars as `amount_cents`.

## Task 7: recallable distributions

**What good looks like**
- **Schema:** `distributions.recallable BOOLEAN NOT NULL DEFAULT false`. The flag lives on the distribution, and each LP's recallable amount is their allocation row. Seed: decide which seeded distributions are recallable. "Partial sale of Calder Software" is a return of capital and a natural candidate; the dividend recap isn't. Say it's an assumption.
- **Flag existing ones:** `PATCH /api/distributions/:id` `{ "recallable": true }` (validate it's a boolean; 404 on unknown) with a toggle on `fund.html`'s distributions table. If Task 2's create endpoint exists, accept `recallable` there too; it isn't required.
- **Unfunded formula:** `commitment − called + recallable distributed`. Update both `services/funds.ts` (via `listLpBalances`, e.g. `SUM(...) FILTER (WHERE d.recallable)`) and `services/statements.ts` (a `cumulativeRecallableDistributed(lpId, through)` using `<= end`, the same as the other cumulative queries). Best: a single helper so the two can't drift. Show "Recallable distributed" as a separate line so the math is visible.
- **Tests:** flag a seeded distribution → the fund page's unfunded for each LP rises by exactly that LP's allocation; the statement for a quarter *before* the distribution is unchanged, and quarters after it reflect it; non-recallable distributions change nothing.

**Questions worth asking:** Is there a **cap or expiry** on recallability (many agreements limit it to amounts returned within N years, or to a percentage of commitment)? Can a distribution be *partly* recallable, which would need an amount instead of a boolean? Does flipping the flag on an old distribution **rewrite statements LPs already received**? A strong candidate notes the audit trail/immutability risk, maybe restricts toggling, or at least records when it changed. How does it interact with the **Task 3 over-commitment check** (recallable amounts raise the cap)?

**Common Haiku mistakes:** updating only one of the two unfunded calculations; subtracting instead of adding; using the distribution's headline `amount_cents` instead of the LP's allocation; adding the flag to `distribution_allocations`; forgetting the `as of quarter end` cutoff in the statement.

## Task 8: quarterly management fees

**What good looks like**
- **Schema:** `funds.management_fee_bps INTEGER NOT NULL DEFAULT 200 CHECK (management_fee_bps >= 0)` (annual rate in basis points; 200 = 2.00%), seeded per fund. Basis points keep the rate an integer, while a `NUMERIC` percentage invites floats.
- **Math:** quarterly fee = `commitment_cents × bps / 10000 / 4`, which is `commitment × bps / 40000`. Do it in `BigInt` and choose a rounding rule explicitly. **The seed has half-cent cases:** Ostrander Foundation ($7,333,333) works out to 3,666,666.5¢ and Tamsin Okafor ($2,166,667) to 1,083,333.5¢, so half-up vs. banker's vs. floor actually matters. If the fund-level fee must equal the sum of LP fees, reuse the (fixed) largest-remainder allocation from Task 1 rather than rounding each LP on its own, which is the same class of bug. Unit-test the half-cent LPs.
- **Statement:** add `management_fee_cents` and a net line, e.g. `net_cash_flow_cents = distributed_in_quarter − called_in_quarter − fee` with the **sign convention stated** (from the LP's point of view). Show both on `statement.html` with `formatCents` (which handles negatives).
- **Tests:** a known LP/quarter gives the exact expected fee in cents; a fund with a different `bps` gives a different fee; the net line equals its parts.

**The big ambiguity (deliberate):** two seeded calls are literally named "... and Q3 management fee". Fees in real funds are usually *collected through capital calls*, so showing the fee as a separate deduction would **double-count** it in the net line. A strong candidate notices this and asks: is the line informational ("of which fees"), or a separate charge? Other good questions: fee basis (commitment during the investment period, invested capital later); proration for a partial first quarter or a late-joining LP (Task 6); does the fee reduce unfunded?

**Common Haiku mistakes:** `commitment * 0.005` and `Math.round` or `toFixed(2)` on floats; storing `0.02`/`2.0` in a `REAL` column; computing the fee in the browser; inconsistent sign in the net line; forgetting `bps` is annual and charging it every quarter at the full rate.

## Task 9: fund-wide quarter summary + CSV

**What good looks like**
- **API:** `GET /api/funds/:fundId/statements/:quarter` returns one row per LP (commitment, called in quarter, distributed in quarter, cumulative called, cumulative distributed, unfunded) plus a totals row. 404 unknown fund, 400 bad quarter via `parseQuarter`.
- **Avoid N+1:** calling `getQuarterlyStatement` 8 times costs 8 × 5 queries. Better: one SQL query grouped by LP with conditional aggregates (`SUM(a.amount_cents) FILTER (WHERE c.call_date BETWEEN $2 AND $3)` etc.) over the fund's LPs, using the **same date boundaries** as the per-LP statement so the numbers match. A test that compares the summary row for an LP with that LP's `/api/lps/:id/statements/:q` is the gold standard.
- **CSV:** the same service with a CSV serializer: `GET /api/funds/:fundId/statements/:quarter.csv` (or `?format=csv`) with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="growth-fund-i-2026-Q3.csv"`. RFC 4180 escaping: wrap a field in quotes if it contains `,` `"` CR or LF, and double embedded quotes. Unit-test it with a name like `Smith, Jones & "Partners"` (the seed only has `&` and `'`, so the candidate has to add a case). Bonus: guard against **CSV/formula injection** by prefixing cells that start with `= + - @` with `'`.
- **Dollars:** format from integer cents without floats (`Math.trunc(c / 100)` + `String(c % 100).padStart(2, "0")`, careful with negatives), and decide between `1234567.89` (Excel-friendly, numeric) and `"$1,234,567.89"` (pretty but text in Excel). Asking the controller is a good move.
- **UI:** a quarter `<select>` + table on `fund.html` (or a new `summary.html?fund=&quarter=`), and a "Download CSV" link. A plain `<a href=".../2026-Q3.csv" download>` is simplest and correct. `fetch` + `Blob` also works but is more code to review.

**Questions worth asking:** which columns and order the controller's spreadsheet expects; whether the totals row belongs in the CSV; which number format; the filename convention.

**Watch for:** the summary inheriting the Task 4 boundary bug. Q3 for Growth Fund I will show no calls even though the fund's calls list has 2026-09-30. A strong candidate cross-checks the totals against the fund page and spots it. Also, the summary "called in quarter" total won't equal the headline call amounts because of the Task 1 rounding.

**Common Haiku mistakes:** a hand-rolled `join(",")` with no escaping; building CSV in the browser from already-formatted `$` strings; using `toFixed` on `cents / 100`; one fetch per LP from the browser; forgetting `Content-Disposition`; using `innerHTML` for LP names.

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
