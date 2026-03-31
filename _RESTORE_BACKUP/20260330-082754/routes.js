import express from "express";
import { runAI, hasAI } from "./ai.js";

const router = express.Router();

router.get("/health/openai", async (_req, res) => {
  if (!hasAI()) return res.json({ ok: false });

  const reply = await runAI("Reply OK");
  res.json({ ok: true, reply });
});

router.post("/proposal", async (req, res) => {
  let text = "WyreStorm AV system design.";

  if (hasAI()) {
    const ai = await runAI("Write AV proposal");
    if (ai) text = ai;
  }

  res.json({ proposal: text });
});

export default router;