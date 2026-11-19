import { Router } from "express";
import * as capitalCalls from "../services/capitalCalls";
import * as distributions from "../services/distributions";
import * as funds from "../services/funds";
import { parseAmountCents, parseDate, parseId, parseOptionalText } from "../lib/validation";

export const fundsRouter = Router();

fundsRouter.get("/", async (_req, res) => {
  res.json(await funds.listFunds());
});

fundsRouter.get("/:fundId", async (req, res) => {
  res.json(await funds.getFundDetail(parseId(req.params.fundId, "fundId")));
});

fundsRouter.get("/:fundId/capital-calls", async (req, res) => {
  res.json(await capitalCalls.listCapitalCalls(parseId(req.params.fundId, "fundId")));
});

fundsRouter.post("/:fundId/capital-calls", async (req, res) => {
  const body = req.body ?? {};
  const created = await capitalCalls.createCapitalCall({
    fundId: parseId(req.params.fundId, "fundId"),
    callDate: parseDate(body.call_date, "call_date"),
    amountCents: parseAmountCents(body.amount_cents),
    purpose: parseOptionalText(body.purpose, "purpose"),
  });
  res.status(201).json(created);
});

fundsRouter.get("/:fundId/distributions", async (req, res) => {
  res.json(await distributions.listDistributions(parseId(req.params.fundId, "fundId")));
});

fundsRouter.post("/:fundId/distributions", async (req, res) => {
  const body = req.body ?? {};
  const created = await distributions.createDistribution({
    fundId: parseId(req.params.fundId, "fundId"),
    distributionDate: parseDate(body.distribution_date, "distribution_date"),
    amountCents: parseAmountCents(body.amount_cents),
    description: parseOptionalText(body.description, "description"),
  });
  res.status(201).json(created);
});
