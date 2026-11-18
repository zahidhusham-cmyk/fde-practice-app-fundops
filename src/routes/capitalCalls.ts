import { Router } from "express";
import { parseId } from "../lib/validation";
import * as capitalCalls from "../services/capitalCalls";

export const capitalCallsRouter = Router();

capitalCallsRouter.get("/:callId", async (req, res) => {
  res.json(await capitalCalls.getCapitalCallDetail(parseId(req.params.callId, "callId")));
});
