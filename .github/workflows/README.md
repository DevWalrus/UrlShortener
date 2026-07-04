# CI/CD Pipelines

## Overview

Deployments use a reusable template pattern — two shared templates handle the actual work, and thin caller workflows trigger them per service. Improvements to the deploy process only need to be made in one place.

| Workflow | Trigger | Template used |
|---|---|---|
| `deploy-redirect.yml` | Push to `main`, changes in `redirect/` | `deploy-template.yml` |
| `deploy-creator-api.yml` | Push to `main`, changes in `creator-api/` | `deploy-template.yml` |
| `deploy-creator-api-stage.yml` | Push to `dev`, changes in `creator-api/` | `deploy-template.yml` |
| `deploy-creator-fe.yml` | Push to `main`, changes in `creator-fe/` | `deploy-fe-template.yml` |
| `deploy-creator-fe-stage.yml` | Push to `dev`, changes in `creator-fe/` | `deploy-fe-template.yml` |
| `pr-creator-fe.yml` | PR targeting `main`, changes in `creator-fe/` | — (inline lint + build) |

All workflows can also be triggered manually via `workflow_dispatch`.

## Container App deploys (`deploy-template.yml`)

Used by `redirect` and `creator-api` (prod and stage).

Steps:
1. Log in to Azure via OIDC (no stored credentials)
2. Log in to Azure Container Registry
3. Build Docker image and push to ACR
4. Update the Container App to the new image
5. Smoke test: poll `/health` up to 10 times (10s between attempts) until `200 OK`

Prod uses `:latest` image tag; stage uses `:stage`. This matches what Terraform manages — using a SHA tag would cause drift on the next `terraform apply`.

## SWA deploys (`deploy-fe-template.yml`)

Used by `creator-fe` (prod and stage).

Steps:
1. **lint** job — runs `npm run lint` in both `creator-fe/` and `creator-fe/api/`
2. **build-and-deploy** job (depends on lint) — builds the React app and Azure Functions, deploys to SWA via the official SWA deploy action
3. **smoke-test** job (depends on build-and-deploy) — polls `/api/health` up to 10 times (10s between attempts) until `200 OK`

## Authentication

Workflows authenticate to Azure using OIDC federated identity — no client secret stored in GitHub. The service principal is managed by Terraform (`infra/aad.tf`).

Federated credentials are scoped to GitHub **environments** (not branches):
- `repo:DevWalrus/UrlShortener:environment:prod`
- `repo:DevWalrus/UrlShortener:environment:stage`

Required secrets (repository-level):
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` — from Terraform outputs
- `ACR_USERNAME`, `ACR_PASSWORD` — from Azure Container Registry access keys

Required secrets (environment-level, set separately on `prod` and `stage`):
- `SWA_DEPLOYMENT_TOKEN` — from `terraform output -raw creator_ui_deployment_token` (prod) or `creator_ui_stage_deployment_token` (stage)

## Stage vs prod

| | Prod | Stage |
|---|---|---|
| Branch | `main` | `dev` |
| GitHub environment | `prod` | `stage` |
| Image tag | `:latest` | `:stage` |
| Creator API | `clinten-creator-api` | `clinten-creator-api-stage` |
| MongoDB database | `clintendev` | `clintendev-stage` |
| SWA | `ashy-meadow-07aae3f0f.7.azurestaticapps.net` | `red-desert-04141eb0f.7.azurestaticapps.net` |
