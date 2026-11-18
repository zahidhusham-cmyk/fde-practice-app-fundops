# Aldermoor Capital: Fund Operations (practice app)

A small internal tool for **Aldermoor Capital**, a fictional investment firm that runs three funds.
The ops team uses it to see who has invested what, to issue capital calls, to record distributions,
and to produce each investor's quarterly statement.

This is an interview **practice** repo. The tasks are in [TASKS.md](TASKS.md) and the practice method is in
[PRACTICE_GUIDE.md](PRACTICE_GUIDE.md). Don't open `INTERVIEWER_NOTES.md` until you've finished: it contains spoilers.

## The domain in plain words

| Term | Meaning |
| --- | --- |
| **Fund** | A pool of money the firm invests on behalf of its investors. Each fund has a *vintage year* (the year it started). |
| **LP (limited partner)** | An investor in a fund, such as a pension, an endowment, a family office or a wealthy individual. Each fund here has 8 LPs. |
| **Commitment** | The total amount an LP has promised to invest over the life of the fund. They don't hand it over all at once. |
| **Capital call** | The fund asking its LPs to send part of their commitment now, usually to make an investment or pay fees. |
| **Distribution** | The fund paying money back to its LPs, usually after selling an investment. |
| **Pro rata** | "In proportion." An LP with 20% of a fund's total commitments pays 20% of each call and receives 20% of each distribution. |
| **Called to date** | The total an LP has paid in across all capital calls so far. |
| **Unfunded commitment** | What an LP still owes the fund if asked: commitment minus called to date. |
| **Quarterly statement** | A per-LP report for one calendar quarter (Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec): activity in that quarter plus running totals at quarter end. |

Simplifications in this app: calls are treated as paid on the call date, distributions are split pro rata by commitment,
and there are no fees, waterfalls or currencies other than USD.

## Stack

- **Backend:** Node + TypeScript + Express 5 (`src/`), run with `tsx`.
- **Database:** Postgres through `pg`, with raw parameterized SQL and no ORM. Money is stored as **integer cents** in `BIGINT` columns.
- **Frontend:** plain HTML + vanilla JS modules in `public/`, served by the same server, using `fetch` and DOM updates with no framework.
- **Tests:** vitest + supertest against a real Postgres test database.

```
src/
  server.ts            starts the HTTP server
  app.ts               Express app: routes, static files, error handler
  routes/              HTTP layer: parse + validate input, call a service, send JSON
  services/            business logic (allocation, capital calls, statements, ...)
  db/pool.ts           pg pool, type parsers, withTransaction()
  db/queries/          SQL, one file per table area
  db/seed.ts, reset.ts schema + seed loading
  lib/                 errors, validation, quarter date helpers
public/                index.html (funds), fund.html (fund detail), statement.html (LP statement)
db/schema.sql          the schema
test/                  unit + API tests
```

## Running it

You need Node 20+ and Postgres (from Docker or a local install).

**Option A: Postgres in Docker**
```bash
docker compose up -d          # Postgres 16 on localhost:5432, creates fundops + fundops_test DBs
npm install
npm run db:reset              # create tables + load seed data into the dev DB
npm run dev                   # http://localhost:3000
```

**Option B: Postgres you already have**
```bash
createuser fundops --pwprompt                # password: fundops (or anything, then match the URLs below)
createdb fundops -O fundops
createdb fundops_test -O fundops
export DATABASE_URL=postgres://fundops:fundops@localhost:5432/fundops
export TEST_DATABASE_URL=postgres://fundops:fundops@localhost:5432/fundops_test
npm install && npm run db:reset && npm run dev
```

**Checks**
```bash
npm test             # API + unit tests (each API test resets the *test* database)
npm run typecheck    # tsc --noEmit
```

`npm test` always uses `TEST_DATABASE_URL` (default `.../fundops_test`) and never touches your dev data.
Run `npm run db:reset` any time you want the dev database back to the seed state.

## API

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/funds` | All funds with LP count and total commitments |
| GET | `/api/funds/:fundId` | Fund + every LP's commitment, called, distributed and unfunded amounts |
| GET | `/api/funds/:fundId/capital-calls` | Calls for a fund, newest first |
| POST | `/api/funds/:fundId/capital-calls` | Create a call: `{ "call_date": "2026-11-20", "amount_cents": 150000000, "purpose": "..." }` |
| GET | `/api/capital-calls/:callId` | One call with its per-LP allocations |
| GET | `/api/funds/:fundId/distributions` | Distributions for a fund, newest first |
| GET | `/api/lps/:lpId/statements/:quarter` | LP quarterly statement, e.g. `/api/lps/2/statements/2026-Q3` |

Errors come back as `{ "error": "message" }`: 400 for bad input, 404 for unknown ids.

## Seed data

Three funds (Growth Fund I, Infrastructure Fund II, Ventures III), each with 8 LPs with uneven commitments,
plus capital calls and distributions spread across the 2026 quarters.
