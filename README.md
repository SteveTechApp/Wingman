# Wingman

AV Sales Enablement Tool by WyreStorm

## Overview

Wingman is a comprehensive sales enablement platform for AV professionals, featuring:
- **Discovery Wizard** - Guided client requirements capture
- **Product Finder** - AI-powered product recommendations
- **Competitor Compare** - Side-by-side competitor analysis
- **Proposal Builder** - Generate professional proposals and BOMs
- **Guru Assistant** - Real-time technical Q&A
- **Video Wall Designer** - Visual wall configuration tool

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Development Setup

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Copy environment configuration
cp .env.example .env

# Start development servers
npm run dev          # Frontend (port 3000)
npm run server:dev   # Backend (port 8787)
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8787
```

## Configuration

Copy `.env.example` to `.env` and configure:

### Required
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |

### Recommended for Production
| Variable | Default | Description |
|----------|---------|-------------|
| `WINGMAN_SESSION_COOKIE_SECURE` | `false` | Set `true` for HTTPS |
| `WINGMAN_CORS_ALLOW_ORIGIN` | `http://localhost:3000` | Your production domain |
| `SUPABASE_URL` | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Supabase service role key |

See `.env.example` for all configuration options.

## Project Structure

```
wingman/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layer
│   └── utils/              # Utilities and types
├── server/                 # Backend Node.js server
│   ├── routes/             # API route handlers
│   ├── agents/             # AI agent implementations
│   └── competitor/         # Competitor lookup services
├── data/                   # Product data and intelligence
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Scripts

```bash
# Development
npm run dev              # Start Vite dev server
npm run server:dev       # Start backend dev server

# Build
npm run build            # Build for production
npm run preview          # Preview production build

# Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript checks
npm run verify           # Run full verification suite

# Data
npm run product-update:doctor            # Show source/update status
npm run data:sources:check               # Validate authoritative CSV/JSON sources
npm run data:sources:build               # Compile and publish runtime catalogues
npm run data:maintenance                 # Full source sweep and safety workflow
```

Authoritative product data lives under [`data-sources`](data-sources/README.md).
WyreStorm has one source package; competitor products use one shared schema split
into manufacturer CSVs for bulk editing. Files under `data/` and `public/` are
generated runtime outputs.

## Deployment

### Production Checklist

1. **Environment Configuration**
   - Set `WINGMAN_SESSION_COOKIE_SECURE=true`
   - Configure `WINGMAN_CORS_ALLOW_ORIGIN` for your domain
   - Set up Supabase for persistent storage
   - Add `GEMINI_API_KEY` for AI features

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy**
   - Frontend: Serve `dist/` with nginx or similar
   - Backend: Run `node server/competitor-lookup-server.mjs`

4. **Verify**
   - Health check: `GET /api/health`
   - Product intelligence: `GET /api/product-intelligence/status`

### Docker Production

```bash
# Build images
docker build -t wingman-frontend .
docker build -f Dockerfile.server -t wingman-backend .

# Run with production config
docker-compose -f docker-compose.yml up -d
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/product-intelligence/*` | GET | Product data |
| `/api/agents/*` | POST | AI agent endpoints |
| `/api/workspaces/*` | GET/POST | Workspace management |

## Contributing

1. Create a feature branch
2. Make changes
3. Run `npm run verify` to ensure quality
4. Submit a pull request

## License

Proprietary - WyreStorm Technologies
