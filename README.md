# clinten.dev — Personal URL Shortener

A self-hosted URL shortener built on Azure, written in Go and React. Short links live at `clinten.dev/SLUG`, are created and managed via `create.clinten.dev`.

## Architecture

```
User clicks clinten.dev/X7K2M9P
        │
        ▼
redirect/ (Go — Container App)
        ├── in-memory TTL cache hit → 302 redirect
        └── cache miss → Cosmos DB lookup
                ├── found → cache + 302 redirect
                └── not found → inline 404 page

Admin visits create.clinten.dev
        │
        ▼
creator-fe/ (React SPA — Static Web App)
        │  Azure AAD SSO enforced at the edge
        │
        └── /api/* → creator-fe/api/ (Azure Functions — bundled with SWA)
                │  validates AAD session + MongoDB user lookup
                │
                └── forwards to creator-api/ (Go — Container App)
                        │  X-API-Key auth
                        └── Cosmos DB
```

## Services

| Directory | What it is | Deployed at |
|---|---|---|
| [`redirect/`](redirect/README.md) | Go redirect service | `clinten.dev` |
| [`creator-api/`](creator-api/README.md) | Go REST API | internal Azure FQDN |
| [`creator-fe/`](creator-fe/README.md) | React + Vite SPA | `create.clinten.dev` |
| [`creator-fe/api/`](creator-fe/api/README.md) | Azure Functions auth proxy | `create.clinten.dev/api/*` |
| [`infra/`](infra/README.md) | Terraform — all Azure infrastructure | — |
| [`.github/workflows/`](.github/workflows/README.md) | GitHub Actions CI/CD pipelines | — |

## Technologies

| Layer | Technology | Why |
|---|---|---|
| Redirect + API | Go + chi router | Fast, low memory, minimal cold starts |
| Creator UI | React + Vite + TypeScript + MUI | Fast builds, comprehensive component library |
| Auth proxy | Azure Functions v4 (Node.js) | Bundled with SWA; reads AAD session headers |
| Database | Azure Cosmos DB for MongoDB (free tier) | MongoDB-compatible API, permanent free tier |
| Container runtime | Azure Container Apps | Serverless containers, scales to zero |
| Image registry | Azure Container Registry | Native Azure integration with Container Apps |
| Secret management | Azure Key Vault | Secrets never appear as plaintext in Azure control plane |
| Frontend hosting | Azure Static Web Apps (free tier) | Global CDN, built-in AAD SSO, free tier |
| Infrastructure | Terraform | All infra as code, reproducible |
| CI/CD | GitHub Actions | Reusable workflow pattern, environment-gated deploys |
| DNS | Porkbun | Domain registrar, CNAME to Azure FQDNs |

## Design Decisions

**Why Go for the backend?**
Go compiles to a single static binary with fast startup and low memory — well suited for a redirect service where every millisecond matters, and for Container Apps that scale to zero between requests.

**Why 302 instead of 301?**
301 redirects are cached permanently by browsers. If a destination is changed or deleted, users who visited before would still go to the old URL. 302 re-validates on every click, keeping destinations changeable.

**Why soft deletes?**
Hard deletes lose history. Soft deletes preserve hit counts, creation dates, and deletion timestamps. The `deletedAt` field also permanently reserves a slug — a deleted slug can never be reassigned, preventing a future link from inheriting the reputation of a deleted one.

**Why base36 (A-Z, 0-9) instead of base62?**
Base62 includes both cases, but URLs get lowercased when copied or shared. Base36 uppercase-only slugs are unambiguous — `X7K2M9P` and `x7k2m9p` are the same thing. The redirect service normalizes both to uppercase before lookup.

**Why Key Vault instead of plain environment variables?**
Environment variables appear as plaintext in the Azure portal, Terraform state, and Container App revision history. Key Vault references mean the actual secret value is fetched at runtime via managed identity and never appears in the control plane.
