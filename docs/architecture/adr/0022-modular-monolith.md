# ADR-0022: Modular monolith — the module becomes the unit

**Status:** Accepted, built · **Date:** 2026-11-12 · **Built:** 2026-11-14 · **Refines:** ADR-0003 (Go API as one layered program)

## Context
ADR-0003 chose one layered Go program: handler → service → store. Since then the API has grown to 27
business areas, 286 endpoints and about 1,400 Go files, and the constitution has made the area the unit
of work (each area a package with the same five files, feature 025). So the code is already grouped by
module while the architecture is still described, and enforced, by layer.

Four things follow from that, measured on the code as it stands:

- **59 cross-module imports**, and the graph is a **DAG with no cycles** — five topological tiers.
- Each module already declares the narrow interface it needs (`plan.Settings`, `plan.Directory`) and
  `internal/app` wires it. Behaviour is inverted; **types are not** — those interfaces return
  `settings.Model` and `people.PersonRef`, so the import stays, and nothing marks which exported types
  are meant for other modules.
- The data layer is shared: `internal/stores` holds all 27 stores in one `stores.Set`, every module
  imports the same generated `sqlcdb` package, and 26 migrations and 32 query files sit in one folder
  each, so no table has an owner. **27 of the 32 query files already touch only their own module's
  tables**; five cross, and each has a specific answer.
- Nothing enforces a boundary. Go's `internal/` is used once, at `backend/internal`, which only keeps the
  outside world out; between modules it does nothing.

MAPP is expected to grow past the Plan module — Measure, Finance and the GSAP worker are named later
phases — so the boundaries between areas are about to matter more, not less.

## Decision
Make the **module** the unit of design, ownership and enforcement, keeping the layering inside it. The
design is `docs/architecture/modular-monolith-architecture.md`; the choices it rests on:

- **Compile-time privacy through nested `internal/`.** A module becomes
  `internal/modules/<m>/{<m>.go,internal/core}`. Because Go applies the `internal/` rule at every level of
  the tree, `modules/<m>/internal/core` is importable only from within `modules/<m>/`. The hard boundary
  costs nothing and cannot be argued with; no linter is involved.
- **The contract is the module's root package, not an `api/` subfolder.** An `api/` folder in every
  module would mean a package named `api` in every module, which the composition root would have to alias
  on each import. The root package publishes the types and ports as aliases of the private
  implementation, so consumers keep reading `spa.Plan` and no type is declared twice.
- **The kernel stays business-free.** `platform/*` only. `rollup` is a shared *domain* package — roll-up
  maths is a business rule, and the kernel sits under every module — so it stays a module. `history` also
  stays a module, because besides the `Tools`, `Log` and `MoveToBin` that 20 modules use, it owns the
  activity log and recycle bin screens: eight endpoints with a service, a store and a handler. Other
  modules see only `history.Recorder`, the methods they call; moving the write side into the kernel would
  have put the activity log's tables and the bin's restore rules there.
- **Calls stay synchronous, in-process and in one transaction.** No queue, no event bus, no eventual
  consistency — that is the advantage of a modular monolith over services, and `Write`-carried-in-context
  already provides it. For reactions, the hook pattern `internal/app` already uses (deleting a team
  removes dashboard and dataset shares inside the same transaction) is the mechanism, not a bus.
- **One module owns each table.** Migrations stay in one numbered folder — goose needs one sequence,
  foreign keys cross modules, and D-378 shows what parallel numbering costs — but ownership is declared
  and tested. sqlc goes per module: one entry each with its own `queries:` and `out:`, sharing the full
  `schema:`, after which a module physically cannot call another's queries.
- **Set-based cross-module reads go through a published SQL view**, named in the owner's contract, so
  queries like the finance-to-planning match stay one statement instead of becoming an N+1. The overspend
  guard's unscoped read of every budget stays a **declared exception**, already argued in ADR-0019.
- **A kernel of shared, business-free packages: `platform/*`, under its present name.** Renaming it
  `kernel/` was planned and dropped (D-380): it would touch every Go file and the constitution and change
  no meaning. Nothing with a business rule or an endpoint joins it.
- **Three enforcement mechanisms**: the compiler, a `module-boundaries` rule for `depguard` in
  `.golangci.yml`, and eleven architecture tests in `internal/architecture/` — every module declared, every
  cross-module import declared both ways, no module using the wiring, the kernel knowing no module, the
  tiers equal to the longest path, which is what proves the graph has no cycles, every module a test fake
  uses declared (as an edge, or in `fakeEdges` where the fake stands in for SQL that crosses), only the
  composition root building modules, and the data: one owner per table, every view and SQL function
  published by one, and each module's queries reading only its own tables or what others publish.
- **Staged** (§9 of the document), and built: the map and tests, the `spa` pilot, the 12 modules with no
  consumer, the other 14, per-module sqlc with the table-owner register, and the narrow `history` and
  `auth` ports. The layout is constitution B2 since 4.10.0.

## Consequences
- Roughly 1,400 files moved. It buys nothing a customer can see; behaviour, the tables and the API are
  unchanged. The move is exempt from the comment budget's touch rule, as 025, 027, 028 and 035 were
  (constitution 4.10.0, VIII).
- **13 of 27 modules have fan-in zero** — `access`, `auth`, `bulk`, `customdashboard`, `dashboard`,
  `dataset`, `home`, `lineitem`, `sample`, `simulatedgsap`, `spa`, `swbs`, `workbook` — so half the work
  needed no coordination and could break nothing; they moved first.
- `internal/app` keeps its adapter files (`campaign_adapters.go`, `budgets_adapter.go` and the rest).
  The first plan expected them to go; each one fills one module's port from another's contract, which is
  the composition root's job here. `stores.Set` stays too, as the wiring's switch between PostgreSQL and
  the in-memory fakes (feature 029), out of every module's reach.
- Of the five crossing query files, `custom_dashboards` and `datasets` read views `people` publishes,
  `financials` reads one `lineitem` publishes (migration 00030, the same rows as before), `owners` turned
  out never to cross and was split among its owners, and `overspend` is written down as an exception rather
  than quietly allowed.
- Nothing changes for deployment (ADR-0021), the OpenAPI contract and its 286 endpoints, the error
  envelope, the fail-closed route table and scoped checks, or the layering itself.
- If MAPP were to be split into services within a year this would be wasted effort — extracting services
  directly would be cheaper. The bet is that it stays one deployable and grows modules instead.
