#!/usr/bin/env node
/**
 * Wingman Load Testing Script
 *
 * A simple load testing tool using native Node.js fetch.
 * Tests health endpoints with configurable concurrency and request count.
 *
 * Usage:
 *   node tools/load-test.mjs [options]
 *
 * Options:
 *   --url <url>           Base URL (default: http://localhost:8787)
 *   --concurrency <n>     Number of concurrent requests (default: 10)
 *   --requests <n>        Total number of requests per endpoint (default: 100)
 *   --endpoints <list>    Comma-separated endpoints to test (default: all health endpoints)
 *   --timeout <ms>        Request timeout in milliseconds (default: 5000)
 *   --help                Show this help message
 */

import { parseArgs } from "node:util";

const DEFAULT_BASE_URL = "http://localhost:8787";
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_REQUESTS = 100;
const DEFAULT_TIMEOUT = 5000;

const DEFAULT_ENDPOINTS = [
  "/api/health",
  "/api/ready",
  "/api/product-intelligence/health",
];

function printHelp() {
  console.log(`
Wingman Load Testing Script

Usage:
  node tools/load-test.mjs [options]

Options:
  --url <url>           Base URL (default: ${DEFAULT_BASE_URL})
  --concurrency <n>     Number of concurrent requests (default: ${DEFAULT_CONCURRENCY})
  --requests <n>        Total number of requests per endpoint (default: ${DEFAULT_REQUESTS})
  --endpoints <list>    Comma-separated endpoints to test
  --timeout <ms>        Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  --help                Show this help message

Default endpoints tested:
${DEFAULT_ENDPOINTS.map((e) => `  - ${e}`).join("\n")}

Examples:
  # Run with defaults
  node tools/load-test.mjs

  # High concurrency test
  node tools/load-test.mjs --concurrency 50 --requests 500

  # Test specific endpoint
  node tools/load-test.mjs --endpoints /api/health

  # Test against production
  node tools/load-test.mjs --url https://api.example.com
`);
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: DEFAULT_BASE_URL },
      concurrency: { type: "string", default: String(DEFAULT_CONCURRENCY) },
      requests: { type: "string", default: String(DEFAULT_REQUESTS) },
      endpoints: { type: "string", default: "" },
      timeout: { type: "string", default: String(DEFAULT_TIMEOUT) },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const endpoints = values.endpoints
    ? values.endpoints.split(",").map((e) => e.trim())
    : DEFAULT_ENDPOINTS;

  return {
    baseUrl: values.url.replace(/\/$/, ""),
    concurrency: parseInt(values.concurrency, 10),
    totalRequests: parseInt(values.requests, 10),
    endpoints,
    timeout: parseInt(values.timeout, 10),
  };
}

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function formatMs(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function makeRequest(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const elapsed = performance.now() - start;
    clearTimeout(timeoutId);

    return {
      success: response.ok,
      status: response.status,
      elapsed,
      error: null,
    };
  } catch (error) {
    const elapsed = performance.now() - start;
    clearTimeout(timeoutId);

    return {
      success: false,
      status: 0,
      elapsed,
      error: error.name === "AbortError" ? "timeout" : error.message,
    };
  }
}

async function runLoadTest(url, concurrency, totalRequests, timeout) {
  const results = [];
  let completed = 0;
  let _inFlight = 0;

  const runNext = async () => {
    if (completed >= totalRequests) return;

    completed++;
    inFlight++;

    const result = await makeRequest(url, timeout);
    results.push(result);
    inFlight--;

    // Progress indicator (every 10%)
    const _progress = Math.floor((results.length / totalRequests) * 10);
    if (results.length % Math.ceil(totalRequests / 10) === 0) {
      process.stdout.write(`\r  Progress: ${results.length}/${totalRequests}`);
    }
  };

  // Start initial batch
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, totalRequests); i++) {
    workers.push(
      (async () => {
        while (completed < totalRequests) {
          await runNext();
        }
      })()
    );
  }

  await Promise.all(workers);
  process.stdout.write(`\r  Progress: ${totalRequests}/${totalRequests}\n`);

  return results;
}

function analyzeResults(results, endpoint) {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const times = successful.map((r) => r.elapsed).sort((a, b) => a - b);

  const statusCounts = {};
  for (const r of results) {
    const key = r.error || r.status;
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }

  const totalTime = results.reduce((sum, r) => sum + r.elapsed, 0);

  return {
    endpoint,
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: ((successful.length / results.length) * 100).toFixed(2),
    times: {
      min: times.length > 0 ? Math.min(...times) : 0,
      max: times.length > 0 ? Math.max(...times) : 0,
      avg: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      p50: calculatePercentile(times, 50),
      p95: calculatePercentile(times, 95),
      p99: calculatePercentile(times, 99),
    },
    totalTime,
    throughput: (results.length / (totalTime / 1000)).toFixed(2),
    statusCounts,
  };
}

function printReport(analysis) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Endpoint: ${analysis.endpoint}`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\nRequests:`);
  console.log(`  Total:      ${analysis.total}`);
  console.log(`  Successful: ${analysis.successful} (${analysis.successRate}%)`);
  console.log(`  Failed:     ${analysis.failed}`);

  console.log(`\nResponse Times:`);
  console.log(`  Min:    ${formatMs(analysis.times.min)}`);
  console.log(`  Max:    ${formatMs(analysis.times.max)}`);
  console.log(`  Avg:    ${formatMs(analysis.times.avg)}`);
  console.log(`  p50:    ${formatMs(analysis.times.p50)}`);
  console.log(`  p95:    ${formatMs(analysis.times.p95)}`);
  console.log(`  p99:    ${formatMs(analysis.times.p99)}`);

  console.log(`\nThroughput:`);
  console.log(`  ${analysis.throughput} req/s`);

  console.log(`\nStatus Breakdown:`);
  for (const [status, count] of Object.entries(analysis.statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
}

function printSummary(analyses) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}\n`);

  const headers = ["Endpoint", "Success%", "Avg", "p95", "p99", "Throughput"];
  const rows = analyses.map((a) => [
    a.endpoint,
    `${a.successRate}%`,
    formatMs(a.times.avg),
    formatMs(a.times.p95),
    formatMs(a.times.p99),
    `${a.throughput} req/s`,
  ]);

  // Calculate column widths
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length))
  );

  // Print header
  console.log(headers.map((h, i) => h.padEnd(colWidths[i])).join(" | "));
  console.log(colWidths.map((w) => "-".repeat(w)).join("-+-"));

  // Print rows
  for (const row of rows) {
    console.log(row.map((c, i) => c.padEnd(colWidths[i])).join(" | "));
  }

  // Overall assessment
  const allSuccessful = analyses.every((a) => parseFloat(a.successRate) === 100);
  const avgP95 =
    analyses.reduce((sum, a) => sum + a.times.p95, 0) / analyses.length;

  console.log(`\nOverall Assessment:`);
  if (allSuccessful && avgP95 < 100) {
    console.log("  [EXCELLENT] All endpoints healthy with fast response times");
  } else if (allSuccessful && avgP95 < 500) {
    console.log("  [GOOD] All endpoints healthy with acceptable response times");
  } else if (allSuccessful) {
    console.log("  [WARNING] All endpoints healthy but response times are slow");
  } else {
    console.log("  [CRITICAL] Some endpoints are failing - investigate immediately");
  }
}

async function main() {
  const config = parseCliArgs();

  console.log(`\nWingman Load Test`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Base URL:    ${config.baseUrl}`);
  console.log(`Concurrency: ${config.concurrency}`);
  console.log(`Requests:    ${config.totalRequests} per endpoint`);
  console.log(`Timeout:     ${config.timeout}ms`);
  console.log(`Endpoints:   ${config.endpoints.length}`);

  const analyses = [];

  for (const endpoint of config.endpoints) {
    const url = `${config.baseUrl}${endpoint}`;
    console.log(`\nTesting: ${url}`);

    const results = await runLoadTest(
      url,
      config.concurrency,
      config.totalRequests,
      config.timeout
    );

    const analysis = analyzeResults(results, endpoint);
    analyses.push(analysis);
    printReport(analysis);
  }

  printSummary(analyses);

  // Exit with error if any endpoint failed
  const hasFailures = analyses.some((a) => a.failed > 0);
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nLoad test failed: ${error.message}`);
  process.exit(1);
});
