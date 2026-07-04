# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Services Overview

Four services, one MongoDB-compatible database (Azure Cosmos DB):

| Directory | Language | Deployed to | Domain |
|---|---|---|---|
| `redirect/` | Go + chi | Azure Container App | `clinten.dev` |
| `creator-api/` | Go + chi | Azure Container App | internal FQDN |
| `creator-fe/` | React + Vite + TypeScript | Azure Static Web App | `create.clinten.dev` |
| `creator-fe/api/` | Node.js + Azure Functions v4 | Bundled with SWA | `create.clinten.dev/api/*` |
| `infra/` | Terraform | Azure | — |

The SWA auth proxy (`creator-fe/api/`) sits between the React frontend and `creator-api`. It validates the Azure SSO session (via `x-ms-client-principal` header), checks the user exists in MongoDB, then forwards the request to `creator-api` with the API key injected.

## Commands

### Go services (`redirect/`, `creator-api/`)
```bash
go run ./cmd/main.go        # run locally (from service directory)
go build ./...              # build
go vet ./...                # lint
```
No test suite yet. Each service loads env from `.env.local` (gitignored).

### Creator Frontend (`creator-fe/`)
```bash
npm install
npm run dev          # Vite dev server on :5173
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

### Auth Proxy / Azure Functions (`creator-fe/api/`)
```bash
npm install
npm run build        # tsc → dist/
npm run lint         # ESLint
npm start            # Azure Functions Core Tools on :7071
```
Requires `.env.local` → `local.settings.json` (not gitignored, must be created manually):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MONGODB_URI": "<cosmos connection string>",
    "MONGODB_DB": "clintendev",
    "CREATOR_API_URL": "http://localhost:4201"
  }
}
```

### Terraform (`infra/`)
```bash
terraform init
terraform plan
terraform apply
```

## Architecture Details

### Auth Flow
```
Browser → SWA (AAD login enforced by staticwebapp.config.json)
       → React app calls /api/* (same SWA origin)
       → Azure Functions proxy (creator-fe/api/)
             reads x-ms-client-principal header
             looks up user email in MongoDB users collection
             if not found → 403
             if found → forwards request to creator-api with X-API-Key header
       → creator-api (Go) validates X-API-Key, handles CRUD
```

The React frontend calls `checkAuth()` on mount via `AuthGuard` (wraps the entire app in `App.tsx`). If `403` is returned, it navigates to `/403` and hides nav links via `AuthContext`.

### Frontend Auth Guard Pattern
- `AuthGuard` component wraps all routes in `App.tsx`
- `AuthContext` / `useAuth()` hook is in `creator-fe/src/hooks/useAuth.ts` (separate file required by react-refresh lint rule)
- `ForbiddenError` class in `creator-fe/src/api/links.ts` enables typed error handling

### SWA Routing
`creator-fe/public/staticwebapp.config.json` controls auth at the edge:
- `/api/health` — anonymous (must stay unauthenticated for smoke tests)
- `/api/*` — authenticated
- `/.auth/*` — anonymous
- `/*` — authenticated, rewrites to `index.html`
- 401 → redirects to `/.auth/login/aad`

### Azure Functions v4 Model
`creator-fe/api/` uses the v4 programmatic model (not v3 `function.json` files). Functions are registered in `src/index.ts` and compiled to `dist/`. The `main` field in `package.json` points to `dist/index.js`. Route params use `req.params.slug` (not `context.triggerMetadata`).

### Stage vs Prod
- Stage deploys from the `dev` branch; prod deploys from `main`
- Stage uses a separate MongoDB database: `clintendev-stage`
- Stage container app: `clinten-creator-api-stage`
- Stage SWA: `red-desert-04141eb0f.7.azurestaticapps.net`
- Prod SWA: `ashy-meadow-07aae3f0f.7.azurestaticapps.net`
- GitHub environments (`stage`, `prod`) gate secrets — each has its own `SWA_DEPLOYMENT_TOKEN`

### CI/CD
- `.github/workflows/deploy-template.yml` — reusable workflow for Go Container App deploys
- `.github/workflows/deploy-fe-template.yml` — reusable workflow for SWA deploys (lint → build → deploy → smoke test)
- Caller workflows pass `environment:` as a string input (not a job-level key) to satisfy `workflow_call` constraints
- OIDC federated credentials use `environment:`-scoped subjects (not branch-scoped): `repo:DevWalrus/UrlShortener:environment:prod`
- Smoke tests hit `/health` with retry loop (10 attempts, 10s sleep) after deploy

### Health Endpoints
All four services expose `GET /health` (or `GET /api/health` for the SWA proxy) that ping MongoDB and return `503` if unavailable.

### Key Design Choices
- Slugs are 7-char base36 (`A-Z0-9`), uppercase-normalized — `clinten.dev/abc` and `clinten.dev/ABC` are identical
- `302` redirects (not `301`) to keep destinations changeable without browser cache issues
- Soft deletes only — deleted slugs are permanently reserved to prevent hijacking
- Redirect service uses in-memory TTL cache (5 min) to avoid DB round-trips on popular links; hit count increments are fire-and-forget goroutines
- Secrets flow: `terraform.tfvars` → Key Vault → Container App secret ref → `os.Getenv()` — secrets never appear as plaintext in Azure portal or Terraform state
