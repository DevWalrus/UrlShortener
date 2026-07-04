# creator-api

The management REST API, consumed only by the auth proxy (`creator-fe/api/`). Protected by an `X-API-Key` header — the key is stored in Key Vault and injected into the proxy at deploy time.

## How it works

Handles CRUD operations on links. Slug generation uses `crypto/rand` with a base36 alphabet (`A-Z`, `0-9`), producing 7-character slugs with ~78 billion possible values. On creation, the slug is checked for collisions with up to 5 retry attempts. Custom slugs are accepted but validated against the same alphabet and normalized to uppercase.

Soft deletes: `DELETE /links/:slug` sets `deletedAt` on the document rather than removing it. Deleted slugs are permanently reserved — they can never be reassigned.

## Local development

**Prerequisites:** Go 1.22+, access to Cosmos DB (see root README for connection string command)

Create `.env.local`:
```
MONGODB_URI=<connection-string>
MONGODB_DB=clintendev
API_KEY=local-dev-key
PORT=4201
CORS_ORIGIN_DEV=http://localhost:5173
```

```bash
cd creator-api
go mod tidy
go run ./cmd/main.go
```

Service runs at `http://localhost:4201`. Test with:
```bash
curl -X POST http://localhost:4201/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -d '{"destination": "https://example.com"}'
```

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | Cosmos DB connection string | Yes |
| `MONGODB_DB` | Database name (default: `clintendev`) | No |
| `API_KEY` | Shared secret for `X-API-Key` header | Yes |
| `PORT` | HTTP port (default: `8080`) | No |
| `CORS_ORIGIN_DEV` | Extra CORS origin for local development | No |

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check — pings MongoDB |
| `POST` | `/links` | `X-API-Key` | Create a new short link |
| `GET` | `/links` | `X-API-Key` | List all active (non-deleted) links |
| `GET` | `/links/deleted` | `X-API-Key` | List all soft-deleted links |
| `DELETE` | `/links/:slug` | `X-API-Key` | Soft delete a link |

CORS allows `https://create.clinten.dev` and `CORS_ORIGIN_DEV`. `OPTIONS` preflight requests are handled before auth middleware.

## Deployment

Triggers automatically on push to `main` when files under `creator-api/` change. Stage deploys on push to `dev`. Uses the reusable [`deploy-template.yml`](../.github/workflows/deploy-template.yml) workflow.

- Prod container app: `clinten-creator-api`
- Stage container app: `clinten-creator-api-stage` (uses `MONGODB_DB=clintendev-stage`)

See [`.github/workflows/README.md`](../.github/workflows/README.md) for pipeline details.

## Design decisions

**Why `X-API-Key` instead of mTLS or JWT?**
The only caller is the auth proxy running in the same Azure environment. A shared API key from Key Vault is simple, auditable, and sufficient for a single trusted internal caller. The key is never exposed to the browser.

**Why soft deletes?**
See root README — this is a cross-service decision. Locally relevant: `GET /links` and `GET /links/deleted` use the `deletedAt` field to partition the response without needing separate collections.
