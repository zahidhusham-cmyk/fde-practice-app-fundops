import { formatCents, getJson, row, showMessage } from "./api.js";

const tbody = document.getElementById("funds");
const message = document.getElementById("message");

try {
  const funds = await getJson("/api/funds");
  for (const f of funds) {
    tbody.append(
      row([
        { text: f.name, href: `/fund.html?id=${f.id}` },
        String(f.vintage_year),
        { text: String(f.lp_count), className: "num" },
        { text: formatCents(f.total_commitment_cents), className: "num" },
      ]),
    );
  }
} catch (err) {
  showMessage(message, err.message, "error");
}
