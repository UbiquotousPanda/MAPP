# ADR-0021: One Azure VM as a hosted test environment

**Status:** Accepted · **Date:** 2026-11-03

## Context

One or two business analysts and testers need to use MAPP without installing Podman and running
`compose.yaml` themselves (ADR-0012). Constitution 4.9.0 allowed no cloud services at run time. The
repository owner approved a hosted test environment on 2026-11-03, as cheap and simple as possible.

A Static Web App created from the portal serves only the web app: MAPP also needs the Go API and
PostgreSQL. Container Apps with Azure Database for PostgreSQL and a registry costs more and adds three
services to wire together. The API refused every host but this computer (DNS rebinding), and in demo mode
the sign-in page shows the demo password to whoever opens it.

## Decision

- One small Linux VM (`Standard_B2als_v2`) runs the repository's `compose.yaml` with an overlay,
  `deploy/test-vm/compose.yaml`, that adds Caddy: HTTPS from Let's Encrypt and one shared tester sign-in
  (HTTP basic authentication) in front of the whole site.
- The API answers the host names in a new, optional `PUBLIC_HOSTS` variable as well as this computer's; the
  cross-site checks are unchanged.
- `deploy/test-vm/deploy.sh` sends `HEAD` over SSH and rebuilds there: no registry, no deploy from CI.
- SSH is open only to the maintainer's address; the VM shuts down every evening.
- The portal's Static Web App and its workflow are removed.

## Consequences

- About USD 30 a month if left running, less with the nightly shutdown; one machine to patch.
- Only the fictitious demo seed is ever loaded; it is not a production environment, and Shell's release
  gates (CSPM scanning, ServiceNow) apply when MAPP moves to Shell's environment.
- The session cookie is not marked `Secure` behind the proxy, and every tester reaches the API through the
  same proxy address, so the sign-in attempt limit counts them together.
- Deploying stays a manual step by the maintainer.
