import express from "express";

const router = express.Router();

const nowIso = () => new Date().toISOString();

router.get("/wingman/health", (_req, res) => {
  res.json({
    ok: true,
    service: "wingman",
    mode: "file-backed",
    timestamp: nowIso()
  });
});

router.get("/product-intelligence/health", (_req, res) => {
  res.json({
    ok: true,
    service: "product-intelligence",
    mode: "file-backed",
    timestamp: nowIso()
  });
});

router.get("/competitor-lookup/diagnostics", (_req, res) => {
  res.json({
    ok: true,
    available: true,
    endpoint: "/api/competitor-lookup/diagnostics",
    fetchedAt: nowIso(),
    mode: "file-backed",
    memoryCount: 0,
    count: 0,
    maxEvents: 200,
    warnings: [],
    events: [],
    health: { ok: true }
  });
});

export default router;