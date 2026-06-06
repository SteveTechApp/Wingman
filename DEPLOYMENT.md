# Wingman Deployment Guide

Complete deployment documentation for the Wingman AV Sales Enablement Platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment Checklist](#production-deployment-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Health Check Verification](#health-check-verification)
8. [Monitoring and Logs](#monitoring-and-logs)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime for frontend build and backend server |
| npm | 10+ | Package management |
| Docker | 24+ | Container deployment (optional) |
| Docker Compose | 2.20+ | Multi-container orchestration (optional) |

### System Requirements

- **Memory**: Minimum 2GB RAM (4GB recommended for development)
- **Disk**: 1GB free space for dependencies and build artifacts
- **Network**: Outbound HTTPS access for API integrations (Google Gemini, Supabase)

### Verify Prerequisites

```bash
# Check Node.js version
node --version   # Should output v20.x.x or higher

# Check npm version
npm --version    # Should output 10.x.x or higher

# Check Docker (if using container deployment)
docker --version
docker compose version
```

---

## Environment Configuration

Copy the example environment file and configure for your environment:

```bash
cp .env.example .env
```

### Core Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Backend server bind address |
| `PORT` | `8787` | Backend server port |
| `WINGMAN_UI_HOST` | `127.0.0.1` | Frontend server bind address |
| `WINGMAN_UI_PORT` | `3000` | Frontend server port |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WINGMAN_CORS_ALLOW_ORIGIN` | `http://127.0.0.1:3000` | Allowed origin for API requests. Set to your production domain. Use `*` for open access (disables credentials). |

### Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WINGMAN_MAX_JSON_BODY_BYTES` | `1048576` | Maximum JSON request body size (1MB) |
| `WINGMAN_SESSION_COOKIE_SECURE` | `false` | Set `true` for HTTPS production deployments |
| `WINGMAN_ENABLE_SECURITY_HEADERS` | `true` | Enable security headers (CSP, HSTS) |
| `WINGMAN_API_CONTENT_SECURITY_POLICY` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` | Content Security Policy header |
| `WINGMAN_API_HSTS` | `max-age=31536000; includeSubDomains` | HSTS header value |

### Vite / Frontend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WINGMAN_LOCAL_BACKEND_HOST` | `127.0.0.1` | Backend host for Vite proxy |
| `VITE_WINGMAN_LOCAL_BACKEND_PORT` | `8787` | Backend port for Vite proxy |
| `VITE_API_PROXY_TARGET` | (empty) | Full API proxy URL (overrides host/port) |
| `VITE_SERVER_HOST` | `127.0.0.1` | Vite dev server bind address. Set to `0.0.0.0` for external access. |

### Frontend API Endpoints

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_COMPETITOR_LOOKUP_ENDPOINT` | `http://127.0.0.1:8787/api/competitor-lookup` | Competitor lookup API |
| `VITE_COMPETITOR_APPROVAL_ENDPOINT` | `http://127.0.0.1:8787/api/competitor-approvals` | Competitor approvals API |
| `VITE_PRODUCT_INTELLIGENCE_ENDPOINT` | `http://127.0.0.1:8787/api/product-intelligence` | Product intelligence API |
| `VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT` | `http://127.0.0.1:8787/api/product-intelligence/health` | Product intelligence health check |
| `VITE_WINGMAN_API_BASE_URL` | `http://127.0.0.1:8787/api/wingman` | Wingman API base URL |
| `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC` | `false` | Enable project sync with backend |

### Build Metadata

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_VERSION` | (empty) | Application version |
| `VITE_APP_COMMIT` | (empty) | Git commit SHA |
| `VITE_BUILD_NUMBER` | (empty) | CI build number |
| `VITE_BUILD_DATE` | (empty) | Build timestamp |
| `VITE_BUILD_CHANNEL` | (empty) | Release channel |

### Supabase Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | (empty) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | (empty) | Supabase service role key (keep secret) |
| `SUPABASE_COMPETITOR_APPROVALS_TABLE` | `competitor_approvals` | Table for competitor approvals |
| `SUPABASE_LOOKUP_DIAGNOSTICS_TABLE` | `competitor_lookup_runtime_events` | Table for lookup diagnostics |
| `SUPABASE_WINGMAN_TABLES_ENABLED` | `false` | Enable Wingman Supabase tables |
| `SUPABASE_WINGMAN_STATE_TABLE` | `wingman_app_state` | App state table |
| `SUPABASE_WINGMAN_USERS_TABLE` | `wingman_users` | Users table |
| `SUPABASE_WINGMAN_WORKSPACES_TABLE` | `wingman_workspaces` | Workspaces table |
| `SUPABASE_WINGMAN_MEMBERS_TABLE` | `wingman_workspace_members` | Workspace members table |
| `SUPABASE_WINGMAN_INVITATIONS_TABLE` | `wingman_workspace_invitations` | Invitations table |
| `SUPABASE_WINGMAN_SESSIONS_TABLE` | `wingman_sessions` | Sessions table |
| `SUPABASE_WINGMAN_PROJECTS_TABLE` | `wingman_projects` | Projects table |
| `SUPABASE_WINGMAN_AUDIT_TABLE` | `wingman_audit_events` | Audit events table |
| `SUPABASE_WINGMAN_TELEMETRY_TABLE` | `wingman_telemetry_events` | Telemetry events table |

### Lookup Service Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOOKUP_ENABLE_LIVE_ENRICHMENT` | `true` | Enable live competitor enrichment |
| `LOOKUP_RETRY_ATTEMPTS` | `3` | Number of retry attempts for lookups |
| `LOOKUP_TIMEOUT_MS` | `4500` | Lookup request timeout (ms) |
| `LOOKUP_CACHE_TTL_MS` | `1800000` | Cache TTL (30 minutes) |
| `LOOKUP_CACHE_MAX_ENTRIES` | `500` | Maximum cache entries |
| `LOOKUP_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 minute) |
| `LOOKUP_RATE_LIMIT_MAX_REQUESTS` | `12` | Max requests per window |
| `LOOKUP_RUNTIME_EVENT_MAX` | `120` | Max runtime events to store |
| `LOOKUP_RUNTIME_EVENT_RETENTION_DAYS` | `30` | Runtime event retention (days) |
| `LOOKUP_PERSIST_RUNTIME_EVENTS` | `true` | Persist runtime events to Supabase |

### Session & Auth Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WINGMAN_SESSION_TTL_MS` | `604800000` | Session TTL (7 days) |
| `WINGMAN_INVITATION_TTL_MS` | `604800000` | Invitation TTL (7 days) |
| `WINGMAN_AUTH_RATE_LIMIT_WINDOW_MS` | `60000` | Auth rate limit window (1 minute) |
| `WINGMAN_AUTH_RATE_LIMIT_MAX_REQUESTS` | `8` | Max auth requests per window |
| `WINGMAN_AUDIT_RETENTION` | `800` | Audit event retention count |
| `WINGMAN_TELEMETRY_RETENTION` | `400` | Telemetry event retention count |
| `WINGMAN_STORAGE_MODE` | `auto` | Storage mode (`auto`, `supabase`, `memory`) |
| `WINGMAN_STORAGE_FAIL_CLOSED` | `false` | Fail closed on storage errors |

### External API Keys

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CSE_API_KEY` | (empty) | Google Custom Search API key |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | (empty) | Alternative name for CSE key |
| `GEMINI_API_KEY` | (empty) | Google Gemini API key for AI features |
| `GURU_GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model for Guru assistant |

---

## Local Development Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd Wingman

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set GEMINI_API_KEY for AI features
```

### Step 3: Start Development Servers

**Option A: Run servers separately (recommended for development)**

```bash
# Terminal 1: Start frontend dev server
npm run dev

# Terminal 2: Start backend dev server
npm run server:dev
```

**Option B: Access points**

- Frontend: http://127.0.0.1:3000
- Backend API: http://127.0.0.1:8787

### Step 4: Verify Installation

```bash
# Check frontend health (via Vite proxy)
curl http://127.0.0.1:3000/api/health

# Check backend health directly
curl http://127.0.0.1:8787/api/health

# Check product intelligence health
curl http://127.0.0.1:8787/api/product-intelligence/health
```

### Development Scripts

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run full verification suite
npm run verify

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8787

### Build Images Individually

```bash
# Build frontend image (nginx + static assets)
docker build -t wingman-frontend .

# Build backend image (Node.js server)
docker build -f Dockerfile.server -t wingman-backend .
```

### Run Containers Individually

```bash
# Create network
docker network create wingman-network

# Run backend
docker run -d \
  --name wingman-backend \
  --network wingman-network \
  -p 8787:8787 \
  -e HOST=0.0.0.0 \
  -e PORT=8787 \
  -e NODE_ENV=production \
  -e WINGMAN_CORS_ALLOW_ORIGIN=http://localhost:3000 \
  -e GEMINI_API_KEY=your-api-key \
  wingman-backend

# Run frontend
docker run -d \
  --name wingman-frontend \
  --network wingman-network \
  -p 3000:80 \
  wingman-frontend
```

### Docker Compose with Environment File

Create a `.env` file with your production settings:

```bash
# .env (production)
WINGMAN_CORS_ALLOW_ORIGIN=https://your-domain.com
WINGMAN_SESSION_COOKIE_SECURE=true
GEMINI_API_KEY=your-production-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_WINGMAN_TABLES_ENABLED=true
```

Then run:

```bash
docker compose --env-file .env up -d
```

### Verify Docker Deployment

```bash
# Check container status
docker compose ps

# Check backend health
docker compose exec backend wget -qO- http://localhost:8787/api/health

# View backend logs
docker compose logs backend

# View frontend logs
docker compose logs frontend
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] **Node.js 20+** installed on target server
- [ ] **Environment variables** configured in `.env`
- [ ] **API keys** obtained (Gemini, Google CSE if using live enrichment)
- [ ] **Supabase** project created and configured (for persistent storage)
- [ ] **SSL certificate** obtained for HTTPS

### Security Configuration

- [ ] Set `WINGMAN_SESSION_COOKIE_SECURE=true`
- [ ] Set `WINGMAN_CORS_ALLOW_ORIGIN` to your production domain
- [ ] Verify `WINGMAN_ENABLE_SECURITY_HEADERS=true`
- [ ] Review and configure CSP headers if needed
- [ ] Ensure all API keys are kept secret (not in version control)

### Build and Deploy

```bash
# 1. Install dependencies
npm ci
cd server && npm ci && cd ..

# 2. Build frontend
npm run build

# 3. Verify build
ls -la dist/

# 4. Start backend server
NODE_ENV=production npm run server:start

# 5. Serve frontend with nginx/reverse proxy (see nginx config below)
```

### Nginx Configuration (Production)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /path/to/wingman/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8787/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
pm2 start server/competitor-lookup-server.mjs --name wingman-backend

# Configure startup script
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs wingman-backend
```

### Post-Deployment Verification

- [ ] Health check endpoints responding
- [ ] Frontend loads correctly
- [ ] API proxy working
- [ ] Authentication flow functional
- [ ] AI features operational (if Gemini configured)
- [ ] Supabase connectivity verified (if enabled)

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8787
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=8788
```

#### CORS Errors

**Symptoms**: Browser console shows "Access-Control-Allow-Origin" errors

**Solutions**:
1. Verify `WINGMAN_CORS_ALLOW_ORIGIN` matches your frontend URL exactly
2. Check protocol (http vs https)
3. Check port number
4. Restart backend server after changing CORS settings

```bash
# Example: Frontend at https://app.example.com
WINGMAN_CORS_ALLOW_ORIGIN=https://app.example.com
```

#### Docker Container Won't Start

```bash
# Check container logs
docker compose logs backend

# Rebuild without cache
docker compose build --no-cache

# Check disk space
df -h
```

#### Backend Connection Refused

**Symptoms**: Frontend shows "Failed to fetch" or connection errors

**Solutions**:
1. Verify backend is running: `curl http://127.0.0.1:8787/api/health`
2. Check backend logs for startup errors
3. Verify `HOST=0.0.0.0` in Docker environments
4. Check firewall rules

#### Gemini API Errors

**Symptoms**: AI features return errors or timeouts

**Solutions**:
1. Verify `GEMINI_API_KEY` is set correctly
2. Check API key quotas in Google Cloud Console
3. Verify network connectivity to Google APIs
4. Check `GURU_GEMINI_MODEL` is a valid model name

#### Supabase Connection Issues

**Symptoms**: "Storage unavailable" errors or data not persisting

**Solutions**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check Supabase project is active
3. Verify tables exist (run migrations)
4. Check RLS policies allow service role access

#### Build Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Must be 20+
```

#### Memory Issues During Build

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## Health Check Verification

### Available Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic backend health check |
| `/api/health/details` | GET | Detailed health with component status |
| `/api/product-intelligence/health` | GET | Product intelligence service health |
| `/api/wingman/health` | GET | Wingman app service health |
| `/api/wingman/agents/health` | GET | AI agents health |

### Health Check Commands

```bash
# Basic health check
curl -s http://localhost:8787/api/health | jq

# Expected response:
# {
#   "ok": true,
#   "version": "0.1.0",
#   "timestamp": "2024-..."
# }

# Detailed health check
curl -s http://localhost:8787/api/health/details | jq

# Product intelligence health
curl -s http://localhost:8787/api/product-intelligence/health | jq

# Docker health check
docker compose exec backend wget -qO- http://localhost:8787/api/health
```

### Automated Health Monitoring

Docker Compose includes a built-in health check:

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:8787/api/product-intelligence/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

Check container health status:

```bash
docker compose ps
# Look for "(healthy)" status
```

---

## Monitoring and Logs

### Log Locations

| Component | Location |
|-----------|----------|
| Backend (local) | stdout/stderr |
| Backend (PM2) | `~/.pm2/logs/wingman-backend-*.log` |
| Backend (Docker) | `docker compose logs backend` |
| Frontend (nginx) | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |

### Viewing Logs

```bash
# Local development - backend logs are in terminal

# PM2 logs
pm2 logs wingman-backend
pm2 logs wingman-backend --lines 100

# Docker logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs --tail=100 backend

# Nginx logs (production)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Log Levels and Debugging

```bash
# Enable debug logging
DEBUG=* npm run server:dev

# Filter specific debug namespaces
DEBUG=wingman:* npm run server:dev
```

### Performance Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# Docker stats
docker stats

# Check memory usage
docker compose exec backend ps aux
```

### Telemetry and Audit (When Supabase Enabled)

Application telemetry and audit events are stored in Supabase tables when configured:

- `wingman_audit_events` - User actions and system events
- `wingman_telemetry_events` - Performance and usage metrics

Query via Supabase dashboard or API:

```sql
-- Recent audit events
SELECT * FROM wingman_audit_events 
ORDER BY created_at DESC 
LIMIT 100;

-- Telemetry summary
SELECT event_type, COUNT(*) 
FROM wingman_telemetry_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

### Alerting Recommendations

For production deployments, configure alerts for:

1. **Health check failures** - Monitor `/api/health` returns non-200
2. **High error rate** - Monitor 5xx responses
3. **Memory usage** - Alert when container memory exceeds 80%
4. **Disk space** - Alert when disk usage exceeds 85%
5. **Response latency** - Alert when P95 latency exceeds threshold

Example with curl-based monitoring:

```bash
#!/bin/bash
# Simple health check script
HEALTH_URL="http://localhost:8787/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$RESPONSE" != "200" ]; then
    echo "Health check failed with status $RESPONSE"
    # Send alert notification
    exit 1
fi
```

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start frontend
npm run server:dev       # Start backend
npm run verify           # Run all checks

# Production build
npm run build            # Build frontend
npm run server:start     # Start production backend

# Docker
docker compose up -d     # Start all services
docker compose down      # Stop all services
docker compose logs -f   # View logs

# Health checks
curl localhost:8787/api/health
curl localhost:8787/api/health/details
```

### Required Environment Variables (Minimum)

```bash
# .env minimum for local development
HOST=127.0.0.1
PORT=8787
WINGMAN_UI_HOST=127.0.0.1
WINGMAN_UI_PORT=3000

# Add for AI features
GEMINI_API_KEY=your-api-key
```

### Required Environment Variables (Production)

```bash
# .env for production
HOST=0.0.0.0
PORT=8787
WINGMAN_CORS_ALLOW_ORIGIN=https://your-domain.com
WINGMAN_SESSION_COOKIE_SECURE=true
GEMINI_API_KEY=your-production-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_WINGMAN_TABLES_ENABLED=true
```
