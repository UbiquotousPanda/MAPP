# ADR-0021: Azure deployment architecture

**Status:** Proposed · **Date:** 2026-11-11 · **Builds on:** ADR-0003, ADR-0011, ADR-0012, ADR-0013

## Context
MAPP runs only on laptops today (constitution, "Local only"): both parts listen on `127.0.0.1`, Docker is
optional and nothing calls a cloud service at run time. ADR-0012 says production images, their registry
and their scanning are chosen by ADR before hosting, and the constitution's "Now / Later" table names
Azure Container Apps behind Azure Front Door as the hosting target.
`docs/reference/shell-target-architecture.md` summarises Shell's deck, but at the level of a slide: it
names the services, not how MAPP's two programs, its migrations, its contract or its same-origin rules
map onto them. There is no deployment, environment or IaC in the repository, and an Azure Static Web Apps
workflow was added by a tool without a decision behind it.

## Decision
The shape is written out in `docs/architecture/azure-deployment-architecture.md`; the choices it rests on:

- **Azure Container Apps** runs all three containers — the API (`cmd/api`), the web container (nginx with
  the built files) and jobs — rather than App Service or AKS: revisions, blue-green and KEDA scaling
  without an orchestrator to run.
- **One public host name, routed by path.** Azure Front Door Premium with WAF is the only public entry;
  `/api/*` goes to API Management (internal), everything else to the web container. The API refuses
  cross-site requests and the pages run a `'self'` content security policy (D-361, ADR-0018), so a second
  host name would force CORS and a weaker policy. This is the constraint that fixes the edge design.
- **Migrations are their own step.** `cmd/seed` runs as a Container Apps Job before the new revision takes
  traffic, because the API never migrates and refuses a database behind its migrations (ADR-0013). Goose
  is forward-only, so releases are expand → deploy → contract and a rollback is a revision switch.
- **PostgreSQL Flexible Server 18** with zone-redundant HA, private endpoint, Entra authentication and
  PgBouncer; a read replica for dashboards only once a measurement asks for one.
- **Entra ID + SAM replace demo sign-in**, and only `internal/modules/auth` changes: the route table and the
  scoped service checks read the actor, not the sign-in method (ADR-0008).
- **One image, built once, promoted by commit SHA** through dev → test → prod, each with its own resource
  group, GitHub environment and OIDC federated identity. No long-lived Azure secrets; all secrets in Key
  Vault, read with a managed identity.
- **Nothing is built yet.** This ADR records the target so the first deployment feature has a design to
  implement; the constitution's local-only rule stands until the product owner lifts it.

## Consequences
- Five pieces of work must land before a production deployment can work at all, listed in §9 of the
  document: Entra ID sign-in (without it `APP_ENV=production` leaves nobody able to sign in), a shared
  sign-in attempt counter (today's counts are in one process's memory, D-361), an OTLP exporter (today
  only `none` and `console` exist), production images and IaC, and a measurement of the single-writer
  write lock, which serialises writes across every replica.
- The Azure Static Web Apps workflow contradicts this design — a second host name, and it builds to the
  wrong folder — and is removed when the first real pipeline lands.
- Choosing Container Apps keeps the two-part design intact: no code changes to deploy, only configuration
  the API already reads from environment variables.
- The architecture, security and operational-readiness gates of SEMS are the acceptance criteria for the
  deployment feature; the open questions in §10 (landing-zone spoke, shared or own APIM, SAM onboarding,
  Dynatrace or Azure Monitor, non-prod data) must be answered before building.
