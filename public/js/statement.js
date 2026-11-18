import { formatCents, getJson, row, showMessage } from "./api.js";

const params = new URLSearchParams(location.search);
const lpId = params.get("lp");
const form = document.getElementById("quarter-form");
const message = document.getElementById("message");
form.quarter.value = params.get("quarter") ?? "2026-Q3";

function lines(tbodyId, items) {
  const tbody = document.getElementById(tbodyId);
  if (items.length === 0) {
    tbody.replaceChildren(row([{ text: "None this quarter", className: "muted" }, "", ""]));
    return;
  }
  tbody.replaceChildren(
    ...items.map((l) => row([l.date, l.description, { text: formatCents(l.amount_cents), className: "num" }])),
  );
}

async function load(quarter) {
  const s = await getJson(`/api/lps/${lpId}/statements/${quarter}`);
  document.getElementById("lp-name").textContent = `${s.lp.name} · ${s.quarter.label}`;
  document.getElementById("statement-meta").textContent =
    `${s.lp.fund_name} · ${s.quarter.start} to ${s.quarter.end}`;
  document.getElementById("back-link").href = `/fund.html?id=${s.lp.fund_id}`;

  const set = (id, cents) => (document.getElementById(id).textContent = formatCents(cents));
  set("commitment", s.commitment_cents);
  set("called-quarter", s.called_in_quarter_cents);
  set("distributed-quarter", s.distributed_in_quarter_cents);
  set("called-cumulative", s.cumulative_called_cents);
  set("distributed-cumulative", s.cumulative_distributed_cents);
  set("unfunded", s.unfunded_cents);
  lines("calls", s.calls);
  lines("distributions", s.distributions);
  showMessage(message, "", "");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const quarter = form.quarter.value;
  history.replaceState(null, "", `?lp=${lpId}&quarter=${quarter}`);
  load(quarter).catch((err) => showMessage(message, err.message, "error"));
});

if (!lpId) {
  showMessage(message, "No LP selected.", "error");
} else {
  load(form.quarter.value).catch((err) => showMessage(message, err.message, "error"));
}
