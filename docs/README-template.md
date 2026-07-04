# <Service Name>

One-sentence description of what this service does and where it runs.

## How it works

Brief prose or bullets on the request flow and key behaviour. Focus on the non-obvious parts — what decisions are being made, not what the code does.

## Local development

**Prerequisites:** list only what's non-obvious or service-specific.

**Environment variables:**

| Variable | Description | Required |
|---|---|---|
| `VAR_NAME` | What it's for | Yes/No |

**Run:**

```bash
# copy-paste ready commands
```

## Deployment

How a deploy is triggered (branch, path filter, manual), what the pipeline does, and any post-deploy manual steps. Link to the relevant workflow file.

## Endpoints

_Include only for services that own their API contract. For pass-through proxies, note only the endpoints with non-obvious behaviour (e.g. which are publicly accessible)._

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check — publicly accessible |

## Design decisions

_Include only decisions with non-obvious tradeoffs. High-level decisions that affect multiple services belong in the root README as well._

- **Decision:** Why this choice was made and what the tradeoff is.
