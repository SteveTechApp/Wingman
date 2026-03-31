$routes = @'
import express from "express";

const router = express.Router();

// ---- HEALTH ----
router.get("/wingman/health", (req, res) => {
  res.json({ ok: true, service: "wingman" });
});

router.get("/product-intelligence/health", (req, res) => {
  res.json({ ok: true, service: "product-intelligence" });
});

// ---- COMPETITOR LOOKUP ----
router.get("/competitor-lookup", (req, res) => {
  res.json({
    ok: true,
    data: [],
    message: "Competitor lookup endpoint active"
  });
});

router.get("/competitor-lookup/diagnostics", (req, res) => {
  res.json({
    ok: true,
    diagnostics: {
      cache: "ok",
      runtime: "ok"
    }
  });
});

// ---- PRODUCT INTELLIGENCE ----
router.get("/product-intelligence", (req, res) => {
  res.json({
    ok: true,
    records: []
  });
});

// ---- WINGMAN ----
router.get("/wingman", (req, res) => {
  res.json({
    ok: true,
    message: "Wingman API root"
  });
});

export default router;
'@

[System.IO.File]::WriteAllText("C:\Users\steve\wingman\server\routes.js", $routes, $utf8)