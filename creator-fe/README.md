# creator-fe

The management UI for clinten.dev, deployed to Azure Static Web Apps at `create.clinten.dev`. Built with React + Vite + TypeScript + MUI.

## How it works

Azure Static Web Apps enforces AAD authentication at the edge — unauthenticated visitors are redirected to Microsoft login before any content is served. `staticwebapp.config.json` controls routing and which paths are publicly accessible.

On load, `AuthGuard` (wrapping the entire app) calls `/api/auth` to verify the logged-in user exists in the MongoDB `users` collection. If the user is not provisioned, a `403` is returned and the app navigates to the `/403` page and hides all nav links. This check is separate from Azure SSO — AAD authenticates identity, the `users` collection controls access.

API calls go to `/api/*` (same origin), which is handled by the Azure Functions auth proxy in [`creator-fe/api/`](api/README.md).

## Local development

**Prerequisites:** Node.js 22+

The auth proxy (`creator-fe/api/`) must also be running locally — see its README.

Create `.env.local`:
```
VITE_API_BASE=http://localhost:7071/api
```

```bash
cd creator-fe
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

```bash
npm run lint       # ESLint check
npm run build      # production build → dist/
```

## Environment variables

All are build-time (Vite injects at build, not runtime).

| Variable | Description | Required |
|---|---|---|
| `VITE_API_BASE` | Auth proxy base URL (default: `/api`) | No |

## Pages

| Route | Description |
|---|---|
| `/` | Home — links to Create and List |
| `/create` | Create a short link with optional custom slug |
| `/list` | Tabbed view of active and soft-deleted links |
| `/403` | Shown when AAD user is not provisioned in MongoDB |
| `/404` | Also receives redirects from `clinten.dev` when a slug is not found |

## Deployment

Triggers automatically on push to `main` when files under `creator-fe/` change. Stage deploys on push to `dev`. Uses the reusable [`deploy-fe-template.yml`](../.github/workflows/deploy-fe-template.yml) workflow, which runs lint, builds, deploys to SWA, and runs a smoke test against `/api/health`.

- Prod SWA: `ashy-meadow-07aae3f0f.7.azurestaticapps.net` / `create.clinten.dev`
- Stage SWA: `red-desert-04141eb0f.7.azurestaticapps.net`

Each environment uses its own `SWA_DEPLOYMENT_TOKEN` GitHub secret scoped to the `prod` or `stage` GitHub environment.

See [`.github/workflows/README.md`](../.github/workflows/README.md) for pipeline details.
