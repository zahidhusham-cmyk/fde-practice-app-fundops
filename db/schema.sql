-- Aldermoor Capital fund operations schema.
-- All money is stored as integer cents in BIGINT columns (never floats).

DROP TABLE IF EXISTS distribution_allocations;
DROP TABLE IF EXISTS distributions;
DROP TABLE IF EXISTS capital_call_allocations;
DROP TABLE IF EXISTS capital_calls;
DROP TABLE IF EXISTS lps;
DROP TABLE IF EXISTS funds;

CREATE TABLE funds (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  vintage_year  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limited partners (investors). Each LP belongs to one fund.
CREATE TABLE lps (
  id                SERIAL PRIMARY KEY,
  fund_id           INTEGER NOT NULL REFERENCES funds(id),
  name              TEXT NOT NULL,
  commitment_cents  BIGINT NOT NULL CHECK (commitment_cents > 0),
  UNIQUE (fund_id, name)
);

-- A capital call asks every LP in a fund for money.
CREATE TABLE capital_calls (
  id            SERIAL PRIMARY KEY,
  fund_id       INTEGER NOT NULL REFERENCES funds(id),
  call_date     DATE NOT NULL,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  purpose       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each LP's share of a capital call. Calls are treated as paid on the call date.
CREATE TABLE capital_call_allocations (
  id               SERIAL PRIMARY KEY,
  capital_call_id  INTEGER NOT NULL REFERENCES capital_calls(id) ON DELETE CASCADE,
  lp_id            INTEGER NOT NULL REFERENCES lps(id),
  amount_cents     BIGINT NOT NULL CHECK (amount_cents >= 0),
  UNIQUE (capital_call_id, lp_id)
);

-- A distribution pays money back to every LP in a fund.
CREATE TABLE distributions (
  id                 SERIAL PRIMARY KEY,
  fund_id            INTEGER NOT NULL REFERENCES funds(id),
  distribution_date  DATE NOT NULL,
  amount_cents       BIGINT NOT NULL CHECK (amount_cents > 0),
  description        TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE distribution_allocations (
  id               SERIAL PRIMARY KEY,
  distribution_id  INTEGER NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
  lp_id            INTEGER NOT NULL REFERENCES lps(id),
  amount_cents     BIGINT NOT NULL CHECK (amount_cents >= 0),
  UNIQUE (distribution_id, lp_id)
);

CREATE INDEX capital_calls_fund_date_idx ON capital_calls (fund_id, call_date);
CREATE INDEX distributions_fund_date_idx ON distributions (fund_id, distribution_date);
CREATE INDEX capital_call_allocations_lp_idx ON capital_call_allocations (lp_id);
CREATE INDEX distribution_allocations_lp_idx ON distribution_allocations (lp_id);
