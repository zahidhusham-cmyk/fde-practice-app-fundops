import { pool } from "../src/db/pool";
import { resetDatabase } from "../src/db/reset";

const target = (process.env.DATABASE_URL ?? "default local database").replace(/:[^:@/]+@/, ":***@");

try {
  await resetDatabase();
  const { rows } = await pool.query<{ funds: number; lps: number; calls: number; distributions: number }>(
    `SELECT (SELECT COUNT(*) FROM funds)::int AS funds,
            (SELECT COUNT(*) FROM lps)::int AS lps,
            (SELECT COUNT(*) FROM capital_calls)::int AS calls,
            (SELECT COUNT(*) FROM distributions)::int AS distributions`,
  );
  console.log(`Reset ${target}:`, rows[0]);
} catch (err) {
  console.error("db:reset failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
