import express from "express";
import { resolveCompetitorIntelligence } from "./compare-intelligence.mjs";

function compareCors(req, res, next) {
  const origin = req.headers.origin || "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}

export function registerCompareIntelligenceRoute(app) {
  const jsonParser = express.json({ limit: "1mb" });

  app.options("/api/compare/intelligence", compareCors);

  app.post("/api/compare/intelligence", compareCors, jsonParser, async (req, res) => {
    try {
      const result = await resolveCompetitorIntelligence(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error?.message || String(error),
      });
    }
  });

  app.get("/api/compare/intelligence", compareCors, async (req, res) => {
    try {
      const result = await resolveCompetitorIntelligence({
        brand: req.query.brand,
        sku: req.query.sku,
        productName: req.query.productName,        rawText: req.query.rawText,
        productUrl: req.query.productUrl,
        allowWeb: req.query.allowWeb !== "false",
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error?.message || String(error),
      });
    }
  });
}

export default registerCompareIntelligenceRoute;