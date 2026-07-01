# Security Policy

## Reporting a vulnerability

If you find a security issue in this repository, do not open a public issue with exploit details.
Send a private report instead and include:

- a short summary of the issue
- the affected component or path
- steps to reproduce, if safe to share
- any suggested fix or mitigation

## Handling secrets

- Do not commit real secrets, API keys, connection strings, or private certificates.
- Keep local values in ignored `.env.local` or `.tfvars` files.
- Store production secrets in Azure Key Vault or the equivalent deployment secret store.
- Do not expose credentials to the browser unless they are intentionally public and non-sensitive.

## Public releases

Before making this repository public, verify that:

- no tracked files contain real credentials
- Terraform state and variable files are not committed
- build artifacts and dependency folders remain ignored
- deployment secrets are sourced from the cloud secret store, not from source control