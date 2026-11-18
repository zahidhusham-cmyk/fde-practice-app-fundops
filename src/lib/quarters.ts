import { ValidationError } from "./errors";

export interface Quarter {
  /** e.g. "2026-Q3" */
  label: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  /** First day of the quarter, YYYY-MM-DD. */
  start: string;
  /** Last day of the quarter, YYYY-MM-DD. */
  end: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse a label like "2026-Q3" into the quarter's first and last day. */
export function parseQuarter(label: string): Quarter {
  const match = /^(\d{4})-Q([1-4])$/.exec(label);
  if (!match) {
    throw new ValidationError(`Invalid quarter "${label}". Use the form YYYY-Q1 .. YYYY-Q4.`);
  }
  const year = Number(match[1]);
  const quarter = Number(match[2]) as Quarter["quarter"];
  const firstMonth = (quarter - 1) * 3 + 1; // 1, 4, 7, 10
  const lastMonth = firstMonth + 2; // 3, 6, 9, 12
  // Day 0 of the following month is the last day of lastMonth.
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  return {
    label,
    year,
    quarter,
    start: `${year}-${pad(firstMonth)}-01`,
    end: `${year}-${pad(lastMonth)}-${pad(lastDay)}`,
  };
}
