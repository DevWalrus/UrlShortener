# creator-fe/api

The auth proxy between the React frontend and `creator-api`. Deployed as Azure Functions v4 (Node.js), bundled with the Static Web App. All `/api/*` requests from the browser hit this service first.

## How it works

1. Reads the `x-ms-client-principal` header injected by Azure Static Web Apps after AAD login
2. Decodes the header to extract the user's email
3. Looks up the email in the MongoDB `users` collection — if not found, returns `403`
4. If found, forwards the request to `creator-api` with the `X-API-Key` header injected
5. Returns the response from `creator-api` to the browser

The API key for `creator-api` is never sent to the browser — it lives in this proxy's environment variables only.

## Local development

**Prerequisites:** Node.js 22+, Azure Functions Core Tools v4

Create `local.settings.json` (gitignored):
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MONGODB_URI": "<cosmos-connection-string>",
    "MONGODB_DB": "clintendev",
    "CREATOR_API_URL": "http://localhost:4201"
  }
}
```

```bash
cd creator-fe/api
npm install
npm run build     # compile TypeScript → dist/
npm start         # Azure Functions Core Tools on :7071
```

```bash
npm run watch     # watch mode — recompiles on change
npm run lint
```

To test without AAD (Postman/curl), create a base64-encoded `x-ms-client-principal` header:
```json
{ "claims": [{ "typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "val": "you@example.com" }] }
```

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | Cosmos DB connection string | Yes |
| `MONGODB_DB` | Database name (default: `clintendev`) | No |
| `CREATOR_API_URL` | Base URL of the `creator-api` service | Yes |

`CREATOR_API_URL` must include the scheme (`http://` or `https://`).

## Endpoints

All other endpoints are pass-throughs to `creator-api`. The only endpoint with distinct behaviour here:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Pings MongoDB — publicly accessible (bypasses SWA auth in `staticwebapp.config.json`) |
| `GET` | `/api/auth` | AAD session | Returns 200 + email if user is provisioned, 403 if not |

## Deployment

Deployed together with `creator-fe/` as part of the SWA build. The Functions output (`dist/`) is picked up automatically by the SWA deployment action.

Functions are registered using the v4 programmatic model in `src/index.ts` and compiled to `dist/index.js`. The `main` field in `package.json` points to `dist/index.js`. Route params use `req.params.<name>` (not `context.triggerMetadata`).

## Design decisions

**Why an Azure Functions proxy instead of calling `creator-api` directly from the browser?**
The `creator-api` API key must never reach the browser. The proxy holds the key in its environment, validates the AAD session, checks MongoDB for user provisioning, and only then forwards the request. This keeps the actual API internal with no public exposure needed.

**Why check MongoDB for users separately from AAD auth?**
AAD controls who can log in with Microsoft SSO. The `users` collection controls who is provisioned for this specific app. This allows revoking access without touching AAD, and supports future per-user permissions if needed. ([Authentication Vs Authorization](https://www.geeksforgeeks.org/computer-networks/difference-between-authentication-and-authorization/))
