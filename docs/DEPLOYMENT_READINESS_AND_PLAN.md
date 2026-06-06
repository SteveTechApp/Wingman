# Wingman Deployment Readiness Assessment & Completion Plan

**Date:** 2026-06-06  
**Status:** NOT READY FOR CUSTOMER DEPLOYMENT  
**Estimated Time to Production:** 2-3 weeks (focused effort)

---

## Executive Summary

Wingman is a sophisticated AV sales enablement tool with substantial functionality already built. However, critical infrastructure gaps prevent customer deployment. The core UI is 80% complete, but backend infrastructure, testing, and deployment automation are missing or incomplete.

### Overall Readiness Score: 45/100

| Category | Score | Status |
|----------|-------|--------|
| Core UI/UX | 75% | Good - minor gaps |
| Backend Services | 60% | Functional but not production-safe |
| Testing | 10% | Critical gap - no automated tests |
| Deployment Infrastructure | 15% | Missing Docker, CI/CD, docs |
| Security | 70% | Good foundation, needs production config |
| Documentation | 30% | Internal only, no deployment guides |

---

## Critical Blockers (Must Fix Before Any Deployment)

### 1. No Automated Test Suite
- **Impact:** Changes can break functionality silently
- **Risk:** High - no regression safety net
- **Fix Time:** 3-5 days

### 2. File-Based Storage Not Production-Safe
- **Impact:** Data corruption under concurrent load
- **Risk:** Critical - data loss possible
- **Fix Time:** 2-3 days (enable Supabase)

### 3. No Docker/Containerization
- **Impact:** Cannot deploy to cloud platforms
- **Risk:** Blocking - deployment impossible
- **Fix Time:** 1-2 days

### 4. Hardcoded Localhost Configuration
- **Impact:** Services won't work outside dev machine
- **Risk:** Blocking - app won't run in production
- **Fix Time:** 0.5 days

### 5. No CI/CD Pipeline
- **Impact:** Manual deployments, no quality gates
- **Risk:** High - operational burden
- **Fix Time:** 1-2 days

### 6. Missing Deployment Documentation
- **Impact:** Operations team can't deploy
- **Risk:** High - knowledge gap
- **Fix Time:** 1 day

---

## Detailed Assessment by Category

### A. Backend & API Services (60% Ready)

**Working:**
- Session-based authentication with password hashing
- Role-based access control (owner/admin/sales/customer)
- Rate limiting on auth endpoints
- Product intelligence database (187 products)
- Agent endpoints (discovery, architect, validate, guru)
- Competitor lookup with protected routes

**Critical Issues:**
| Issue | File | Line | Severity |
|-------|------|------|----------|
| Non-atomic file writes | wingman-app-store.mjs | 103-106 | CRITICAL |
| Cookie security defaults to false | wingman-app-store.mjs | 25-29 | HIGH |
| CORS hardcoded to localhost | competitor-lookup-server.mjs | 62 | HIGH |
| Silent mock mode fallback | agents/guruAgent.mjs | 40-42 | MEDIUM |
| Undocumented Google CSE API | compare-intelligence.mjs | 265 | HIGH |

**Fix Plan:**
1. Enable Supabase for production storage
2. Set `WINGMAN_SESSION_COOKIE_SECURE=true`
3. Make CORS configurable via environment
4. Add structured logging for mock mode activation
5. Document all required API keys

### B. Frontend UI/UX (75% Ready)

**Complete Pages (23 total):**
- Dashboard, Discovery (8-step wizard), Finder (5-step)
- Compare, Proposal, Templates, Projects
- Call Cards, Sales Helper, Support
- Profile, Glossary, Product pages

**Issues Found:**
| Issue | Location | Severity |
|-------|----------|----------|
| IntelligencePage returns null | IntelligencePage.tsx:14 | HIGH |
| No form validation | Multiple pages | MEDIUM |
| No React Error Boundaries | App shell | MEDIUM |
| Limited keyboard navigation | Voice capture | MEDIUM |
| No loading skeletons | 22+ pages | LOW |

**Fix Plan:**
1. Fix IntelligencePage redirect
2. Add React Error Boundary to app shell
3. Implement form validation with feedback
4. Add keyboard support for voice capture

### C. Testing & Quality (10% Ready)

**Current State:**
- Zero unit tests
- Zero integration tests
- Playwright installed but no test suite
- 20+ manual validation scripts exist

**Required:**
1. Unit tests for state management
2. Unit tests for document extraction
3. E2E tests for Discovery → Proposal flow
4. E2E tests for auth flow

### D. Deployment Infrastructure (15% Ready)

**Missing:**
- Dockerfile (frontend and backend)
- docker-compose.yml
- GitHub Actions workflows
- Production environment configs
- Health check endpoints
- Deployment documentation

**Exists:**
- .env.example with 64 config options
- Pre-commit hooks
- Validation scripts

### E. Security (70% Ready)

**Implemented:**
- Password hashing (crypto.scrypt)
- Session tokens with hash storage
- Rate limiting (8 req/60s on auth)
- CSP headers configured
- HSTS enabled

**Gaps:**
- Session cookies not HTTPS-secure by default
- No OAuth/SSO
- No API key rotation strategy
- No CSRF tokens (relies on SameSite)

---

## Completion Plan: Fast Track to Production

### Phase 1: Critical Infrastructure (Days 1-3)

**Day 1: Storage & Configuration**
```
Morning:
- [ ] Enable Supabase storage mode
- [ ] Create database migration scripts
- [ ] Set WINGMAN_SESSION_COOKIE_SECURE=true
- [ ] Make CORS origin configurable

Afternoon:
- [ ] Fix hardcoded localhost in vite.config.ts
- [ ] Create production environment template
- [ ] Document all required API keys in .env.example
```

**Day 2: Containerization**
```
Morning:
- [ ] Create Dockerfile for backend (Node.js)
- [ ] Create Dockerfile for frontend (multi-stage nginx)
- [ ] Create .dockerignore

Afternoon:
- [ ] Create docker-compose.yml for local dev
- [ ] Create docker-compose.prod.yml
- [ ] Test container builds
```

**Day 3: CI/CD Pipeline**
```
Morning:
- [ ] Create .github/workflows/ci.yml (lint, typecheck, build)
- [ ] Create .github/workflows/test.yml (when tests exist)
- [ ] Add build status badge to README

Afternoon:
- [ ] Create deployment workflow (manual trigger)
- [ ] Add health check endpoints
- [ ] Test full pipeline
```

### Phase 2: Testing Foundation (Days 4-6)

**Day 4: Test Infrastructure**
```
- [ ] Set up Vitest for unit tests
- [ ] Configure Playwright for e2e
- [ ] Create test utilities and fixtures
- [ ] Write first unit tests (projectStore)
```

**Day 5: Core Unit Tests**
```
- [ ] Test document extraction
- [ ] Test state management hooks
- [ ] Test form validation
- [ ] Test authentication flow
```

**Day 6: E2E Tests**
```
- [ ] Test Discovery → Proposal workflow
- [ ] Test Compare workflow
- [ ] Test auth/login flow
- [ ] Test project save/load
```

### Phase 3: UI Polish (Days 7-9)

**Day 7: Error Handling**
```
- [ ] Create ErrorBoundary component
- [ ] Wrap app routes with ErrorBoundary
- [ ] Add global error logging
- [ ] Fix IntelligencePage redirect issue
```

**Day 8: Form Validation**
```
- [ ] Add validation to Discovery forms
- [ ] Add validation to Project forms
- [ ] Add inline error messages
- [ ] Add submit button state management
```

**Day 9: Accessibility & Polish**
```
- [ ] Add keyboard navigation to voice capture
- [ ] Add aria-live for dynamic content
- [ ] Add loading skeletons
- [ ] Review mobile responsiveness
```

### Phase 4: Documentation & Launch Prep (Days 10-12)

**Day 10: Documentation**
```
- [ ] Create README.md with overview
- [ ] Create DEPLOYMENT.md with step-by-step
- [ ] Create OPERATIONS.md with runbooks
- [ ] Update .env.example with comments
```

**Day 11: Security Hardening**
```
- [ ] Security review of production config
- [ ] Test with HTTPS enforced
- [ ] Verify rate limiting works
- [ ] Test auth session management
```

**Day 12: Launch Preparation**
```
- [ ] Run full verification suite
- [ ] Perform load testing
- [ ] Create rollback procedure
- [ ] Final documentation review
```

---

## Resource Requirements

### Development Team
- 1 Full-stack developer (primary)
- 1 DevOps engineer (days 2-3, 10-12)
- 1 QA engineer (days 4-6)

### Infrastructure
- Supabase project (or PostgreSQL)
- Docker registry access
- CI/CD runner (GitHub Actions)
- Production hosting (TBD)

### External Services
- Gemini API key (required)
- Google Custom Search API (optional)
- Supabase credentials (required for production)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data migration issues | Medium | High | Test thoroughly, keep file backup |
| API rate limits | Medium | Medium | Implement caching, monitor usage |
| Container compatibility | Low | Medium | Test on target platform early |
| Performance under load | Medium | High | Load test before launch |
| Security vulnerabilities | Low | Critical | Security review, pen test |

---

## Success Criteria

### Minimum Viable Production (MVP)
- [ ] All critical blockers resolved
- [ ] Core workflows functional end-to-end
- [ ] Basic test coverage (>50% critical paths)
- [ ] Docker deployment working
- [ ] Documentation complete

### Full Production Ready
- [ ] 80%+ test coverage
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Monitoring/alerting configured
- [ ] Runbooks tested

---

## Next Steps

1. **Immediate:** Review this plan with team
2. **Day 0:** Set up development environment, install dependencies
3. **Day 1:** Begin Phase 1 - Critical Infrastructure
4. **Daily:** Stand-up to track progress and blockers
5. **Day 12:** Go/No-Go decision for deployment

---

## Appendix: File References

### Key Configuration Files
- `/home/user/Wingman/.env.example` - Environment configuration
- `/home/user/Wingman/vite.config.ts` - Build configuration
- `/home/user/Wingman/server/wingman-app-store.mjs` - Backend storage
- `/home/user/Wingman/server/competitor-lookup-server.mjs` - Main API server

### Critical Fix Locations
- Storage: `server/wingman-app-store.mjs:103-106`
- CORS: `server/competitor-lookup-server.mjs:62`
- Cookies: `server/wingman-app-store.mjs:25-29`
- UI Redirect: `src/wingman2/pages/IntelligencePage.tsx:14`

### Documentation Locations
- Existing audit: `/home/user/Wingman/docs/production-readiness-audit.md`
- This plan: `/home/user/Wingman/docs/DEPLOYMENT_READINESS_AND_PLAN.md`
