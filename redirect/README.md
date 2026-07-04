# redirect

The performance-critical path. Every click on a `clinten.dev` short link hits this service.

## How it works

1. Extracts the slug from the URL path and normalizes to uppercase
2. Checks the in-memory TTL cache (5 minute expiry)
3. On cache miss, queries Cosmos DB for a document where `slug` matches and `deletedAt` does not exist
4. On hit: caches the destination, issues a `302` redirect, then increments `hitCount` asynchronously (fire-and-forget — does not block the redirect)
5. On miss: caches the miss for 1 minute (to prevent DB hammering on invalid slugs), then serves an inline 404 page

## Local development

**Prerequisites:** Go 1.22+, access to Cosmos DB (see root README for connection string command)

Create `.env.local`:
```
MONGODB_URI=<connection-string>
MONGODB_DB=clintendev
PORT=4200
```

```bash
cd redirect
go mod tidy
go run ./cmd/main.go
```

Service runs at `http://localhost:4200`. Test with:
```bash
curl -v http://localhost:4200/<SLUG>
# expect 302 to the destination URL
```

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | Cosmos DB connection string | Yes |
| `MONGODB_DB` | Database name (default: `clintendev`) | No |
| `PORT` | HTTP port (default: `8080`) | No |

## Deployment

Triggers automatically on push to `main` when files under `redirect/` change. Uses the reusable [`deploy-template.yml`](../.github/workflows/deploy-template.yml) workflow.

See [`.github/workflows/README.md`](../.github/workflows/README.md) for pipeline details.

To deploy manually:
```bash
docker build -t clintenregistry.azurecr.io/clinten-redirect:latest .
docker push clintenregistry.azurecr.io/clinten-redirect:latest
az containerapp update \
  --name clinten-redirect \
  --resource-group rg-clinten \
  --image clintenregistry.azurecr.io/clinten-redirect:latest
```

## Design decisions

**Why in-memory cache instead of Redis?**
This is a personal tool running a single container instance. Redis would add cost, complexity, and a network hop on every redirect. The in-memory TTL cache eliminates the vast majority of DB lookups for any link shared in a burst. The tradeoff: hit counts are undercounted for cached requests.

**Why cache misses too?**
A bad or expired slug with any traffic (e.g. a broken link in a document) would hammer Cosmos DB on every request. Caching misses for 1 minute bounds the DB load regardless of request rate.

**Why `302` not `301`?**
See root README — this is a cross-service decision.
