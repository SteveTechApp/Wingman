import express from "express";
import { runAI, hasOpenAI } from "./ai.js";
import { buildBom, validateContext, generateProposalText } from "./proposal.js";
import { generateCopilotResponse } from "./copilot.js";
import { generateProposalHtml } from "./export.js";

const router = express.Router();

router.post("/proposal", async (req, res) => {
  const context = req.body || {};
  const bom = buildBom(context);
  const validation = validateContext(context);

  let proposal = generateProposalText(context);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a professional AV pre-sales and proposal writing assistant. Keep the proposal commercially disciplined, technically credible, and aligned to a WyreStorm-first delivery model.",
        `Write a concise client-facing AV proposal based on this JSON context:\n${JSON.stringify(context, null, 2)}`
      );
      if (aiText) proposal = aiText;
    } catch (err) {
      console.warn("OpenAI proposal fallback used:", err.message);
    }
  }

  res.json({ proposal, bom, validation });
});

router.post("/copilot", async (req, res) => {
  const { context = {}, objection = "" } = req.body || {};
  let output = generateCopilotResponse(context, objection);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a live AV sales copilot. Respond with short, useful call support. Include a response line, 2-3 questions to ask, and a positioning note. Stay honest. Never invent features.",
        `Context:\n${JSON.stringify(context, null, 2)}\n\nCustomer objection:\n${objection}`
      );

      if (aiText) {
        output = {
          response: aiText,
          questions: [],
          positioning: "AI-generated live sales guidance"
        };
      }
    } catch (err) {
      console.warn("OpenAI copilot fallback used:", err.message);
    }
  }

  res.json(output);
});

router.post("/export/proposal", async (req, res) => {
  const context = req.body || {};
  const bom = buildBom(context);
  const validation = validateContext(context);

  let proposal = generateProposalText(context);

  if (hasOpenAI()) {
    try {
      const aiText = await runAI(
        "You are a professional AV proposal writer. Produce a polished but concise client-facing proposal aligned to a WyreStorm-first AV design.",
        `Generate a proposal from this JSON context:\n${JSON.stringify(context, null, 2)}`
      );
      if (aiText) proposal = aiText;
    } catch (err) {
      console.warn("OpenAI export fallback used:", err.message);
    }
  }

  const html = generateProposalHtml(context, proposal, bom, validation);
  res.json({ filename: "wingman-proposal.html", html });
});

export default router;