import express from "express";
import { runDiscoveryAgent } from "../agents/discoveryAgent.mjs";
import { runArchitectAgent } from "../agents/architectAgent.mjs";
import { runValidationAgent } from "../agents/validationAgent.mjs";
import { runProposalAgent } from "../agents/proposalAgent.mjs";
import { runGuruAgent } from "../agents/guruAgent.mjs";
import { runCompetitorMatchAgent } from "../agents/competitorMatchAgent.mjs";
import { runPhase1Pipeline } from "../agents/runPhase1Pipeline.mjs";

function badRequest(message) {
  return {
    ok: false,
    error: message,
  };
}

export function createAgentsRouter(deps = {}) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "wingman-agents",
      phases: ["phase1", "phase2", "phase3"],
    });
  });

  router.post("/discovery", async (req, res) => {
    try {
      if (!req.body?.userInput) {
        return res.status(400).json(badRequest("userInput is required."));
      }

      const data = await runDiscoveryAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase1", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Discovery agent failed."));
    }
  });

  router.post("/architect", async (req, res) => {
    try {
      if (!req.body?.brief) {
        return res.status(400).json(badRequest("brief is required."));
      }

      const data = await runArchitectAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase1", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Architect agent failed."));
    }
  });

  router.post("/validate", async (req, res) => {
    try {
      if (!req.body?.brief || !req.body?.architecture) {
        return res.status(400).json(badRequest("brief and architecture are required."));
      }

      const data = await runValidationAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase1", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Validation agent failed."));
    }
  });

  router.post("/run-phase1", async (req, res) => {
    try {
      if (!req.body?.userInput) {
        return res.status(400).json(badRequest("userInput is required."));
      }

      const data = await runPhase1Pipeline(req.body, deps);
      return res.json(data);
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Phase 1 pipeline failed."));
    }
  });

  router.post("/proposal", async (req, res) => {
    try {
      if (!req.body?.brief || !req.body?.architecture || !req.body?.validation) {
        return res.status(400).json(badRequest("brief, architecture, and validation are required."));
      }

      const data = await runProposalAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase2", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Proposal agent failed."));
    }
  });

  router.post("/guru", async (req, res) => {
    try {
      if (!req.body?.question) {
        return res.status(400).json(badRequest("question is required."));
      }

      const data = await runGuruAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase3", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Guru agent failed."));
    }
  });

  router.post("/competitor-match", async (req, res) => {
    try {
      if (!req.body?.competitorVendor && !req.body?.competitorSku && !req.body?.notes) {
        return res.status(400).json(badRequest("At least one of competitorVendor, competitorSku, or notes is required."));
      }

      const data = await runCompetitorMatchAgent(req.body, deps);
      return res.json({ ok: true, phase: "phase3", data });
    } catch (error) {
      return res.status(500).json(badRequest(error.message || "Competitor match agent failed."));
    }
  });

  return router;
}
