import { Router } from "express";
import { parseId } from "../lib/validation";
import * as statements from "../services/statements";

export const lpsRouter = Router();

// GET /api/lps/12/statements/2026-Q3
lpsRouter.get("/:lpId/statements/:quarter", async (req, res) => {
  res.json(
    await statements.getQuarterlyStatement(parseId(req.params.lpId, "lpId"), req.params.quarter),
  );
});
