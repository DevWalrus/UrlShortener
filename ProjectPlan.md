## Phase 1: Foundation
**Goal: infrastructure exists, deployable, but empty**

- Register/configure DNS for `clinten.dev`, `create.clinten.dev`, `api.clinten.dev` if not already done
- Set up Azure resources via Terraform: Container Apps environment, Azure Container Registry, Blob Storage for Terraform state, Key Vault for secrets
- Set up MongoDB Atlas cluster, configure network access to allow Azure egress IPs
- Create GitHub repo with the monorepo structure, set up GitHub Actions with Azure credentials
- Validate the pipeline deploys a "hello world" Go container successfully

---

## Phase 2: Redirect Service (`clinten.dev`)
**Goal: core product works end to end**

- Scaffold Go project, set up MongoDB driver and connection pooling
- Implement slug generation (base36, 7 chars, uppercase)
- Implement redirect handler with `ToUpper` normalization
- Add in-memory TTL cache
- Mongo index on slug field
- Basic 404 HTML page for unknown slugs
- Deploy to Container Apps via GitHub Actions
- Manually insert a test document in Atlas and validate a real redirect works

---

## Phase 3: Creator API (`api.clinten.dev`)
**Goal: can create and manage links via API**

- Scaffold second Go service (can share internal packages with redirect service if monorepo)
- Endpoints: `POST /links` (create), `GET /links` (list yours), `DELETE /links/:slug`
- SSO via Azure Easy Auth in front of the Container App
- Wire up to same Atlas instance, different collection or same with an `ownerId` field
- Deploy and validate you can create a link via curl/Postman and then hit it via the redirect service

---

## Phase 4: Creator UI (`create.clinten.dev`)
**Goal: usable interface for day-to-day use**

- Scaffold Vite app
- Login flow (handled mostly by Easy Auth, just need to handle the redirect)
- Create link form — long URL in, short URL displayed
- Link list/management table — view, copy, delete
- Deploy to Azure Static Web Apps
- Validate full flow: login → create → copy short link → redirect works

---

## Phase 5: Hardening
**Goal: this is actually production quality**

- Click tracking (`hitCount` increment on redirect, async so it doesn't add latency)
- `expiresAt` support in both services
- Terraform remote state locking (prevent concurrent applies)
- Health check endpoints on both Go services
- Alerts in Azure Monitor for error rates and latency
- Review Atlas tier — make sure connection limits fit your Container App scaling config

---

## Suggested Starting Point

Phase 1 is the unglamorous-but-critical part that most people skip and then regret. Getting Terraform, GitHub Actions, and Azure wired up correctly before writing any real application code means every subsequent phase has a clean deploy path from day one. 

If you want, we can start by scaffolding the Terraform config for Phase 1.