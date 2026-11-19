import { dollarsToCents, formatCents, getJson, postJson, row, showMessage } from "./api.js";

const fundId = new URLSearchParams(location.search).get("id");
const message = document.getElementById("message");
const DEFAULT_QUARTER = "2026-Q3";

/** Amount cell for the "allocated to LPs" column. */
function allocatedCell(allocatedCents) {
  return { text: formatCents(allocatedCents), className: "num" };
}

async function loadFund() {
  const { fund, lps, totals } = await getJson(`/api/funds/${fundId}`);
  document.title = `${fund.name} · Aldermoor Capital`;
  document.getElementById("fund-name").textContent = fund.name;
  document.getElementById("fund-meta").textContent = `Vintage ${fund.vintage_year} · ${lps.length} LPs`;

  const tbody = document.getElementById("lps");
  tbody.replaceChildren(
    ...lps.map((lp) =>
      row([
        { text: lp.name, href: `/statement.html?lp=${lp.id}&quarter=${DEFAULT_QUARTER}` },
        { text: formatCents(lp.commitment_cents), className: "num" },
        { text: formatCents(lp.called_cents), className: "num" },
        { text: formatCents(lp.distributed_cents), className: "num" },
        { text: formatCents(lp.unfunded_cents), className: "num" },
      ]),
    ),
  );
  document.getElementById("lp-totals").replaceChildren(
    row([
      "Total",
      { text: formatCents(totals.commitment_cents), className: "num" },
      { text: formatCents(totals.called_cents), className: "num" },
      { text: formatCents(totals.distributed_cents), className: "num" },
      { text: formatCents(totals.unfunded_cents), className: "num" },
    ]),
  );
}

async function loadCalls() {
  const calls = await getJson(`/api/funds/${fundId}/capital-calls`);
  document.getElementById("calls").replaceChildren(
    ...calls.map((c) =>
      row([
        c.call_date,
        c.purpose,
        { text: formatCents(c.amount_cents), className: "num" },
        allocatedCell(c.allocated_cents),
      ]),
    ),
  );
}

async function loadDistributions() {
  const distributions = await getJson(`/api/funds/${fundId}/distributions`);
  document.getElementById("distributions").replaceChildren(
    ...distributions.map((d) =>
      row([
        d.distribution_date,
        d.description,
        { text: formatCents(d.amount_cents), className: "num" },
        allocatedCell(d.allocated_cents),
      ]),
    ),
  );
}

document.getElementById("call-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const callMessage = document.getElementById("call-message");
  const data = new FormData(form);
  const amountCents = dollarsToCents(data.get("amount"));
  if (amountCents === null || amountCents <= 0) {
    showMessage(callMessage, "Enter a positive dollar amount, e.g. 250000.00", "error");
    return;
  }
  try {
    const call = await postJson(`/api/funds/${fundId}/capital-calls`, {
      call_date: data.get("call_date"),
      amount_cents: amountCents,
      purpose: data.get("purpose"),
    });
    showMessage(callMessage, `Created a ${formatCents(call.amount_cents)} call across ${call.allocations.length} LPs.`, "ok");
    form.reset();
    await Promise.all([loadFund(), loadCalls()]);
  } catch (err) {
    showMessage(callMessage, err.message, "error");
  }
});

document.getElementById("distribution-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const distributionMessage = document.getElementById("distribution-message");
  const data = new FormData(form);
  const amountCents = dollarsToCents(data.get("amount"));
  if (amountCents === null || amountCents <= 0) {
    showMessage(distributionMessage, "Enter a positive dollar amount, e.g. 250000.00", "error");
    return;
  }
  try {
    const distribution = await postJson(`/api/funds/${fundId}/distributions`, {
      distribution_date: data.get("distribution_date"),
      amount_cents: amountCents,
      description: data.get("description"),
    });
    showMessage(distributionMessage, `Created a ${formatCents(distribution.amount_cents)} distribution across ${distribution.allocations.length} LPs.`, "ok");
    form.reset();
    await Promise.all([loadFund(), loadDistributions()]);
  } catch (err) {
    showMessage(distributionMessage, err.message, "error");
  }
});

document.getElementById("lp-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const lpMessage = document.getElementById("lp-message");
  const data = new FormData(form);
  const commitmentCents = dollarsToCents(data.get("amount"));
  if (commitmentCents === null || commitmentCents <= 0) {
    showMessage(lpMessage, "Enter a positive dollar amount, e.g. 50000000.00", "error");
    return;
  }
  const name = data.get("name");
  if (!name || typeof name !== "string" || !name.trim()) {
    showMessage(lpMessage, "Enter a non-empty LP name", "error");
    return;
  }
  try {
    const lp = await postJson(`/api/funds/${fundId}/lps`, {
      name: name.trim(),
      commitment_cents: commitmentCents,
    });
    showMessage(lpMessage, `Added ${lp.name} with ${formatCents(lp.commitment_cents)} commitment.`, "ok");
    form.reset();
    await loadFund();
  } catch (err) {
    showMessage(lpMessage, err.message, "error");
  }
});

if (!fundId) {
  showMessage(message, "No fund selected.", "error");
} else {
  Promise.all([loadFund(), loadCalls(), loadDistributions()]).catch((err) =>
    showMessage(message, err.message, "error"),
  );
}
