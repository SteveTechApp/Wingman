# Wingman Load Testing Guide

This document describes how to run load tests against the Wingman API endpoints.

## Quick Start

```bash
# Start the server first
npm run server:dev

# Run load tests with defaults
npm run load-test

# Or run directly with custom options
node tools/load-test.mjs --concurrency 20 --requests 200
```

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url` | `http://localhost:8120` | Base URL of the server |
| `--concurrency` | `10` | Number of concurrent requests |
| `--requests` | `100` | Total requests per endpoint |
| `--endpoints` | (all health endpoints) | Comma-separated list of endpoints |
| `--timeout` | `5000` | Request timeout in milliseconds |
| `--help` | - | Show help message |

## Default Endpoints Tested

- `/api/health` - Basic health check
- `/api/ready` - Kubernetes-style readiness probe
- `/api/product-intelligence/health` - Product intelligence service health

## Usage Examples

### Basic Test
```bash
npm run load-test
```

### High Concurrency Stress Test
```bash
node tools/load-test.mjs --concurrency 100 --requests 1000
```

### Test Specific Endpoint
```bash
node tools/load-test.mjs --endpoints /api/health
```

### Test Against Staging/Production
```bash
node tools/load-test.mjs --url https://staging.example.com
```

### Quick Smoke Test
```bash
node tools/load-test.mjs --concurrency 5 --requests 20
```

## Interpreting Results

### Response Times

| Metric | Description |
|--------|-------------|
| Min | Fastest response time |
| Max | Slowest response time |
| Avg | Average (mean) response time |
| p50 | Median - 50% of requests faster than this |
| p95 | 95th percentile - important for SLA |
| p99 | 99th percentile - worst case typical experience |

### Success Rate

- **100%**: All requests succeeded
- **95-99%**: Minor issues, investigate
- **<95%**: Significant problems, immediate action required

### Throughput

Requests per second (req/s) the server can handle at the given concurrency.

### Overall Assessment

- **EXCELLENT**: 100% success, p95 < 100ms
- **GOOD**: 100% success, p95 < 500ms
- **WARNING**: 100% success but slow responses
- **CRITICAL**: Request failures detected

## Performance Baselines

These are target performance metrics for the Wingman API:

### Health Endpoints

| Endpoint | Target p95 | Target p99 | Min Throughput |
|----------|------------|------------|----------------|
| `/api/health` | < 50ms | < 100ms | 500 req/s |
| `/api/ready` | < 50ms | < 100ms | 500 req/s |
| `/api/product-intelligence/health` | < 100ms | < 200ms | 200 req/s |

### Load Levels

| Test Type | Concurrency | Requests | Purpose |
|-----------|-------------|----------|---------|
| Smoke | 5 | 20 | Quick validation |
| Standard | 10 | 100 | Default baseline |
| Stress | 50 | 500 | Capacity testing |
| Spike | 100 | 1000 | Peak load testing |

## Scaling Recommendations

### When Response Times Degrade

1. **p95 > 200ms at low concurrency (< 20)**
   - Check for database connection issues
   - Review recent code changes for regressions
   - Verify no blocking operations in health endpoints

2. **p95 > 500ms at moderate concurrency (20-50)**
   - Consider horizontal scaling (more server instances)
   - Review connection pooling settings
   - Check for resource contention

3. **p95 > 1s at any concurrency**
   - Immediate investigation required
   - Check server resource utilization (CPU, memory)
   - Review for memory leaks or GC pressure

### When Throughput is Low

1. **< 100 req/s per endpoint**
   - Check for synchronous blocking operations
   - Review Node.js event loop lag
   - Consider async optimization

2. **Decreasing throughput over time**
   - Investigate memory leaks
   - Check for connection leaks
   - Review logging verbosity

### Scaling Strategies

1. **Vertical Scaling**
   - Increase server memory (Node.js heap)
   - Upgrade to faster CPU
   - Use SSD storage

2. **Horizontal Scaling**
   - Add more server instances behind load balancer
   - Implement proper health checks for load balancer
   - Ensure stateless request handling

3. **Application Optimization**
   - Implement response caching
   - Optimize database queries
   - Use connection pooling

## Continuous Integration

Add load tests to your CI pipeline:

```yaml
# Example GitHub Actions step
- name: Load Test
  run: |
    npm run server:start &
    sleep 5
    node tools/load-test.mjs --concurrency 10 --requests 50
```

## Troubleshooting

### All Requests Timeout

1. Verify server is running: `curl http://localhost:8120/api/health`
2. Check firewall settings
3. Increase timeout: `--timeout 10000`

### Connection Refused

1. Server not started - run `npm run server:dev`
2. Wrong port - check `--url` parameter
3. Server crashed - check server logs

### Inconsistent Results

1. Run multiple test iterations
2. Ensure no other processes competing for resources
3. Check for background jobs or cron tasks

## Exit Codes

- `0`: All tests passed (100% success rate)
- `1`: Some requests failed or test errored

Use exit codes for CI/CD pipeline integration.
