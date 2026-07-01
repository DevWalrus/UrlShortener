# clinten.dev — Personal URL Shortener

A self-hosted URL shortener built on Azure, written in Go and React. Short links live at `clinten.dev/XXXXXXX`, are created and managed via `create.clinten.dev`, and the backend API lives at a stable Azure Container Apps URL.

This is a personal tool designed to make it easy to distribute long links (shared documents, deep URLs, etc.) in a clean, memorable format.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Technologies Used](#technologies-used)
- [Services](#services)
  - [Redirect Service](#redirect-service-clintendev)
  - [Creator API](#creator-api)
  - [Creator UI](#creator-ui-createclintendev)
- [Infrastructure](#infrastructure-infra)
- [CI/CD](#cicd-github-actions)
- [Local Development Setup](#local-development-setup)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

```
User clicks clinten.dev/X7K2M9P
        │
        ▼
Azure Container App (Go)
  clinten-redirect
        │
        ├── Check in-memory TTL cache
        │       hit → 302 redirect
        │
        └── Miss → Cosmos DB lookup
                │
                ├── Found → cache it → 302 redirect
                └── Not found → 302 to create.clinten.dev/404


Admin visits create.clinten.dev
        │
        ▼
Azure Static Web App (React + Vite)
  creator-ui
        │
        └── Calls Creator API (Go)
              clinten-creator-api (Container App)
                      │
                      └── Cosmos DB (MongoDB API)
                              links collection
```

Three deployed services share one Cosmos DB database:

- **`clinten.dev`** — the redirect service, optimized for speed
- **`create.clinten.dev`** — the management UI, protected by Azure SSO
- **Creator API** — the backend for the management UI, protected by an API key stored in Key Vault

---

## Repository Structure

```
UrlShortener/
│
├── .github/
│   └── workflows/
│       ├── deploy-template.yml       # Reusable workflow for Container App deploys
│       ├── deploy-redirect.yml       # Triggers on changes to /redirect
│       └── deploy-creator-api.yml    # Triggers on changes to /creator-api
│       └── deploy-creator-ui.yml     # Triggers on changes to /creator-ui
│
├── redirect/                         # Go — clinten.dev redirect service
│   ├── cmd/
│   │   └── main.go                   # Entry point, router setup
│   ├── internal/
│   │   ├── cache/
│   │   │   └── cache.go              # In-memory TTL cache wrapper
│   │   ├── db/
│   │   │   └── mongo.go              # Cosmos DB connection and queries
│   │   └── handler/
│   │       └── handler.go            # HTTP handler for slug lookups
│   ├── Dockerfile
│   ├── go.mod
│   └── .env.local                    # Local env vars (gitignored)
│
├── creator-api/                      # Go — management REST API
│   ├── cmd/
│   │   └── main.go                   # Entry point, router setup, CORS
│   ├── internal/
│   │   ├── db/
│   │   │   └── mongo.go              # Cosmos DB connection and queries
│   │   ├── handler/
│   │   │   └── handler.go            # HTTP handlers for CRUD operations
│   │   ├── middleware/
│   │   │   └── auth.go               # API key middleware
│   │   └── slug/
│   │       └── slug.go               # Base36 slug generation (crypto/rand)
│   ├── Dockerfile
│   ├── go.mod
│   └── .env.local                    # Local env vars (gitignored)
│
├── creator-ui/                       # React + Vite — create.clinten.dev
│   ├── public/
│   │   └── staticwebapp.config.json  # SWA routing, auth, cache headers
│   ├── src/
│   │   ├── api/
│   │   │   └── links.ts              # All API calls in one place
│   │   ├── components/
│   │   │   ├── Layout.tsx            # Nav bar + page wrapper
│   │   │   └── ConfirmDialog.tsx     # Reusable delete confirmation dialog
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page
│   │   │   ├── Create.tsx            # Create short link form
│   │   │   ├── List.tsx              # Active/deleted link manager
│   │   │   └── NotFound.tsx          # 404 page (also receives redirects from clinten.dev)
│   │   ├── App.tsx                   # Router setup
│   │   └── main.tsx                  # Vite entry point
│   ├── .env.local                    # Local env vars (gitignored)
│   ├── .env                          # Production env vars (no secrets, committed)
│   └── package.json
│
└── infra/                            # Terraform — all Azure infrastructure
    ├── main.tf                       # Provider config
    ├── backend.tf                    # Remote state in Azure Blob Storage
    ├── variables.tf                  # Input variable declarations
    ├── terraform.tfvars              # Variable values (gitignored)
    ├── resource_group.tf             # Azure resource group
    ├── cosmosdb.tf                   # Cosmos DB account, database, collection + indexes
    ├── container_registry.tf         # Azure Container Registry
    ├── keyvault.tf                   # Key Vault + secrets (MongoDB URI, ACR password, API key)
    ├── container_apps.tf             # Container App environment + both Go services
    ├── static_web_app.tf             # SWA for the React frontend
    └── outputs.tf                    # Registry URL, Key Vault URI, SWA hostname
```

---

## Technologies Used

| Layer | Technology | Why |
|---|---|---|
| Redirect service | Go + chi router | Fast, low memory, minimal cold starts |
| Creator API | Go + chi router | Consistent with redirect service, shared patterns |
| Creator UI | React + Vite + TypeScript | Fast builds, modern tooling |
| UI components | MUI (Material UI) | Comprehensive, well-documented component library |
| UI notifications | Sonner | Lightweight toast notifications |
| Database | Azure Cosmos DB for MongoDB (free tier) | MongoDB-compatible API, permanent free tier on Azure |
| Container runtime | Azure Container Apps | Serverless containers, scales to zero, built-in ingress |
| Image registry | Azure Container Registry | Native Azure integration with Container Apps |
| Secret management | Azure Key Vault | Secrets never exist as plaintext in config or state |
| Frontend hosting | Azure Static Web Apps (free tier) | Global CDN, built-in SSO, free tier |
| Auth | Azure Static Web Apps built-in AAD | Zero-code SSO on free tier |
| Infrastructure | Terraform | All infra as code, reproducible |
| CI/CD | GitHub Actions | Reusable workflow pattern, image SHA tagging |
| DNS | Porkbun | Domain registrar, CNAME to Azure FQDNs |

---

## Services

### Redirect Service (`clinten.dev`)

The performance-critical path. Every click on a short URL hits this service.

**How it works:**
1. Extracts the slug from the URL path and normalizes to uppercase
2. Checks the in-memory TTL cache (5 minute expiry)
3. On cache miss, queries Cosmos DB for a document matching the slug where `deletedAt` does not exist
4. On hit, caches the destination and issues a `302` redirect
5. Increments `hitCount` on the document asynchronously (fire-and-forget goroutine, does not block the redirect)
6. On miss, caches the miss (1 minute, to prevent DB hammering) and redirects to `create.clinten.dev/404?slug=XXXXXXX`

**Key design choices:**
- `302` (temporary) redirect, not `301` — preserves the ability to change or delete destinations without browser cache issues
- Uppercase normalization means `clinten.dev/x7k2m9p` and `clinten.dev/X7K2M9P` both work
- Cache miss entries are also cached briefly to protect Cosmos DB from repeated lookups of invalid slugs

**Environment variables:**

| Variable | Description |
|---|---|
| `MONGODB_URI` | Cosmos DB connection string |
| `PORT` | HTTP port (default: `8080`) |
| `NOT_FOUND_URL` | Where to redirect unknown slugs (default: `https://create.clinten.dev/404`) |

---

### Creator API

A REST API consumed only by the Creator UI. Protected by an API key passed as the `X-API-Key` header.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (unauthenticated) |
| `POST` | `/links` | Create a new short link |
| `GET` | `/links` | List all active (non-deleted) links |
| `GET` | `/links/deleted` | List all soft-deleted links |
| `DELETE` | `/links/:slug` | Soft delete a link |

**Slug generation:**
- 7 characters, base36 alphabet (`A-Z`, `0-9`)
- Generated using `crypto/rand` for cryptographic randomness
- `36^7 ≈ 78 billion` possible slugs
- Collision check on insert with up to 5 retry attempts
- Custom slugs supported — same alphabet enforced, uppercase normalized

**Soft deletes:**
- `DELETE /links/:slug` sets `deletedAt` to the current timestamp, it does not remove the document
- Deleted slugs are permanently reserved — they cannot be reused
- `GET /links` excludes deleted documents
- `GET /links/deleted` returns only deleted documents for historical analysis
- The redirect service also filters out deleted links at the DB query level

**CORS:**
- Only `https://create.clinten.dev` and a configurable dev origin are allowed
- `OPTIONS` preflight requests are handled before auth middleware

**Environment variables:**

| Variable | Description |
|---|---|
| `MONGODB_URI` | Cosmos DB connection string |
| `API_KEY` | Shared secret for `X-API-Key` header auth |
| `PORT` | HTTP port (default: `8080`) |
| `CORS_ORIGIN_DEV` | Additional CORS origin for local development |

---

### Creator UI (`create.clinten.dev`)

A React SPA deployed to Azure Static Web Apps. Protected by Azure's built-in AAD authentication — unauthenticated visitors are redirected to Microsoft login before any content or assets are served.

**Pages:**

| Route | Description |
|---|---|
| `/` | Home page with links to Create and List |
| `/create` | Form to create a short link, with optional custom slug |
| `/list` | Tabbed view of active and deleted links with delete action |
| `/404` | Not found page, receives redirects from the redirect service with `?slug=` query param |
| `/*` | Catch-all 404 |

**Key behaviours:**
- Custom slug input strips non-alphanumeric characters and forces uppercase as you type
- Delete action shows a confirmation dialog before calling the API
- After any mutation, both the active and deleted lists are refreshed from the server
- Short URLs displayed after creation have a one-click copy-to-clipboard button

**Environment variables (build-time, injected by GitHub Actions):**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Creator API base URL |
| `VITE_API_KEY` | API key for `X-API-Key` header |
| `VITE_CREATE_URL` | `create.clinten.dev` base URL (for internal links) |
| `VITE_REDIRECT_URL` | `clinten.dev` base URL (for displaying short URLs) |

---

## Infrastructure (`/infra`)

All Azure infrastructure is managed by Terraform. The only resource created manually is the Azure Blob Storage account for Terraform remote state — a one-time bootstrap step before Terraform itself can run. Everything else, including the GitHub Actions service principal and its federated credential, is managed by Terraform.

**Resources managed by Terraform:**

| File | Resources |
|---|---|
| `resource_group.tf` | `rg-clinten` resource group |
| `cosmosdb.tf` | Cosmos DB account (free tier), `clintendev` database, `links` collection with indexes on `slug` (unique) and `_id` |
| `container_registry.tf` | Azure Container Registry (Basic SKU) |
| `keyvault.tf` | Key Vault, access policies for Terraform and each managed identity, secrets for MongoDB URI, ACR password, and API key |
| `container_apps.tf` | Log Analytics workspace, Container App environment, managed identities, and Container Apps for redirect and creator-api |
| `static_web_app.tf` | Static Web App for the creator UI |

**Secret flow:**
```
terraform.tfvars (local only, gitignored)
        │
        ▼
Azure Key Vault
        │
        ▼
Container App secret block (references Key Vault secret ID)
        │
        ▼
Container environment variable (MONGODB_URI, API_KEY, etc.)
        │
        ▼
os.Getenv() in Go
```

Secrets are never stored as plaintext in Terraform state, Container App configuration, or anywhere visible in the Azure portal.

### Manual Bootstrap (One-Time Only)

Only one resource must be created manually — the Azure Blob Storage account 
for Terraform remote state. This is required before Terraform can run at all 
since Terraform itself would normally manage this resource.

    az login

    az group create --name rg-clinten-tfstate --location eastus2

    az storage account create \
      --name clintentfstate \
      --resource-group rg-clinten-tfstate \
      --sku Standard_LRS

    az storage container create \
      --name tfstate \
      --account-name clintentfstate

Everything else — including the GitHub Actions service principal and its 
federated OIDC credential — is managed by Terraform.

### GitHub Secrets (Post-Apply)

After running `terraform apply` for the first time, add these three values 
as GitHub Actions secrets. These are identifiers, not passwords — 
authentication is handled via OIDC and requires no stored secret.

    terraform output github_actions_client_id   → AZURE_CLIENT_ID
    terraform output github_actions_tenant_id   → AZURE_TENANT_ID
    <subscription_id from terraform.tfvars>     → AZURE_SUBSCRIPTION_ID

The following secrets must be added manually from the Azure portal or CLI 
as they are not available as Terraform outputs:

    ACR_USERNAME         → Azure portal → Container Registry → Access Keys
    ACR_PASSWORD         → Azure portal → Container Registry → Access Keys
    SWA_DEPLOYMENT_TOKEN → terraform output -json creator_ui_deployment_token
    VITE_API_URL         → Creator API Container App ingress FQDN
    CREATOR_API_KEY      → Same value as creator_api_key in terraform.tfvars

---

## Local Development Setup

### Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Terraform 1.x](https://developer.hashicorp.com/terraform/downloads)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)

### Get the Cosmos DB connection string

```bash
az cosmosdb keys list \
  --name clinten-cosmos \
  --resource-group rg-clinten \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

### Redirect Service

Create `/redirect/.env.local`:
```
MONGODB_URI=<connection-string>
PORT=4200
NOT_FOUND_URL=http://localhost:5173/404
```

```bash
cd redirect
go mod tidy
go run ./cmd/main.go
```

Service runs at `http://localhost:4200`.

### Creator API

Create `/creator-api/.env.local`:
```
MONGODB_URI=<connection-string>
API_KEY=local-dev-key
PORT=4201
CORS_ORIGIN_DEV=http://localhost:5173
```

```bash
cd creator-api
go mod tidy
go run ./cmd/main.go
```

Service runs at `http://localhost:4201`.

### Creator UI

Create `/creator-ui/.env.local`:
```
VITE_API_URL=http://localhost:4201
VITE_API_KEY=local-dev-key
```

```bash
cd creator-ui
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

### Test the full local flow

1. Insert a test document via the creator API:
```bash
curl -X POST http://localhost:4201/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -d '{"destination": "https://example.com"}'
```

2. Copy the returned slug and hit the redirect service:
```bash
curl -v http://localhost:4200/<SLUG>
```

You should receive a `302` to `https://example.com`.

---

## Deployment

### First-time infrastructure deploy

```bash
cd infra
terraform init
terraform plan
terraform apply
```

After apply, bind custom domains in the Azure portal:
- `clinten.dev` → `clinten-redirect` Container App → Custom Domains
- `create.clinten.dev` → Static Web App → Custom Domains

Add DNS records in Porkbun:

| Type | Host | Value |
|---|---|---|
| A | `*` | Container App ingress IP |
| CNAME | `create` | SWA default hostname |
| TXT | `asuid` | Redirect app domain verification ID |

**Note:** the A record IP for Container Apps can change if the Container App environment is destroyed and recreated via Terraform. If that ever happens, grab the new IP with: 

```bash
az containerapp env show \
  --name clinten-env \
  --resource-group rg-clinten \
  --query "properties.staticIp" \
  --output tsv
```

### Deploying a service

Push to `main` with changes in the relevant service folder. GitHub Actions handles the rest.

To deploy manually:
```bash
# Build and push image
docker build -t clintenregistry.azurecr.io/clinten-redirect:latest ./redirect
docker push clintenregistry.azurecr.io/clinten-redirect:latest

# Update the Container App
az containerapp update \
  --name clinten-redirect \
  --resource-group rg-clinten \
  --image clintenregistry.azurecr.io/clinten-redirect:latest
```

### Infrastructure changes

```bash
cd infra
terraform plan   # always review before applying
terraform apply
```

---

## Design Decisions

**Why Go for the backend?**
Go compiles to a single static binary, has excellent HTTP performance, and starts fast in containers. For a redirect service where every millisecond matters, it's a better fit than Node or Python.

**Why 302 instead of 301?**
301 redirects are cached permanently by browsers. If you ever change or delete a destination, users who visited before would still be sent to the old URL. 302 means every click re-validates with the server (or cache), keeping you in control.

**Why soft deletes?**
Hard deletes lose history. Soft deletes let you see which links existed, when they were deleted, and how many hits they accumulated before deletion. The `deletedAt` field also means deleted slugs can never be reused, which prevents a deleted link's destination from being hijacked by a new owner of the same slug.

**Why base36 (A-Z, 0-9) instead of base62?**
Base62 includes both upper and lowercase letters. URLs are technically case-sensitive but users and some tools lowercase them when copying. Base36 uppercase-only slugs are unambiguous — `X7K2M9P` and `x7k2m9p` are the same thing, and the redirect service normalizes both to uppercase before lookup.

**Why in-memory cache instead of Redis?**
This is a personal tool with one instance of the redirect service. Redis would add cost, complexity, and a network hop. An in-memory TTL cache (5 minute expiry) eliminates the vast majority of DB lookups for any link that gets shared in a burst. The tradeoff is hit counts are undercounted for cached requests — tracked as a known issue for v1.1.

**Why Key Vault instead of environment variables?**
Secrets passed as plain environment variables appear in plaintext in the Azure portal, in Terraform state, and in Container App revision history. Key Vault references mean the actual secret value never appears anywhere in the Azure control plane — the Container App fetches it at runtime using its managed identity.

**Why a reusable GitHub Actions workflow?**
The redirect service and creator API have identical deployment steps — build image, push to ACR, update Container App. A reusable `workflow_call` template means any improvement to the deploy process (adding a smoke test, changing the Azure CLI version, etc.) only needs to be made in one place.
