import { afterAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/db/pool";
import { resetDatabase } from "../src/db/reset";

/** Call once at the top of an API test file: fresh schema + seed before every test. */
export function useFreshDatabase() {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await pool.end();
  });
}

export const api = () => request(createApp());

export async function fundIdByName(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`SELECT id FROM funds WHERE name = $1`, [name]);
  if (!rows[0]) throw new Error(`No seeded fund named ${name}`);
  return rows[0].id;
}

export async function lpIdByName(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`SELECT id FROM lps WHERE name = $1`, [name]);
  if (!rows[0]) throw new Error(`No seeded LP named ${name}`);
  return rows[0].id;
}

export const sumCents = (rows: { amount_cents: number }[]) =>
  rows.reduce((total, r) => total + r.amount_cents, 0);
