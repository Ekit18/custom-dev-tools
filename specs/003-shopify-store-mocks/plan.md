# Implementation Plan: Shopify store mock data

**Branch**: `003-shopify-store-mocks` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification plus planning addendum: Google Drive file storage, strict **CSV** import (validated before DB writes), Shopify Admin **GraphQL** for seeding; use **Shopify Dev MCP** during implementation when available.

## Summary

Deliver platform-wide **mock data packs** (products, smart collections, customers) authored as **three CSV files** (or one zip containing them), validated server-side **before** any Postgres rows or Google Drive artifacts are finalized, with CSV originals stored in **Google Drive** and metadata in **Postgres**. Add UI flows: catalog + upload wizard, and per-store **Generate mock data** that reads the active pack, creates **products** via `productSet`, **smart collections** via `collectionCreate` + `ruleSet`, and **customers** via `customerCreate`, reusing existing OAuth/token plumbing and the GraphQL proxy where practical.

**Planning amendment**: Original spec FR-002/FR-003 described a single bundle file; stakeholder direction fixes the interchange format to **CSV** (see [research.md](./research.md) §2).

## Technical Context

**Language/Version**: TypeScript 5.x, strict; Node.js 20+ (align with `@types/node` in repo)  
**Primary Dependencies**: Next.js 16, React 19, Prisma 5, MUI 7, `csv-parse`, `graphql` (existing); add **Google Drive API** access via **server-only** HTTP (`fetch` + service-account JWT) unless team prefers `googleapis` (justify in PR if client bundle or size gates affected—server-only imports should not move the browser bundle).  
**Storage**: PostgreSQL (`prisma/schema.prisma`); Google Drive for CSV/zips; encrypted Shopify tokens unchanged (`lib/encryption`, `Store` model).  
**Testing**: Jest + Testing Library (existing `npm test`); new unit tests for CSV validation; ≥80% coverage on changed files per constitution.  
**Target Platform**: Next.js App Router on Vercel or Node host (same as current app).  
**Project Type**: Web application (monolithic Next.js: `app/`, `components/`, `lib/`, `app/api/`).  
**Performance Goals**: API routes / server actions ≤200 ms p95 for metadata endpoints; long-running generation runs **asynchronously** (job row + polling or streaming) so interactive requests stay within constitution baseline.  
**Constraints**: WCAG 2.1 AA for new UI; Core Web Vitals; CSV size/row caps; Drive quota; Shopify Admin API rate limits; smart-collection rules must match [`collectionRulesConditions`](https://shopify.dev/docs/api/admin-graphql/latest/queries/collectionRulesConditions) for the API version in use.  
**Scale/Scope**: Platform-wide catalog (all users), per-store generation jobs, initial vertical packs (electronics, apparel) as `built_in` optional seed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Gate | Pass? | Evidence in this plan |
|------------------|---------|-------------------------|
| I. Code quality | Yes | Validation logic extracted to small pure functions in `lib/`; reuse existing GraphQL + token helpers. |
| II. Testing | Yes | Golden CSV fixtures for validators; integration path documented in [quickstart.md](./quickstart.md). |
| III. UX consistency | Yes | New pages use MUI + existing layout/navigation patterns; loading/error/empty/success states required for catalog, upload, and generation. |
| IV. Performance | Yes | No large SDK imports in client components; generation offloaded to job pattern; DB indexes in [data-model.md](./data-model.md). |
| Lint & format / types | Yes | Existing Biome + TS strict. |
| A11y (axe) | Yes | Form-based flows must pass automated checks in CI. |
| Lighthouse / bundle | Yes | Prefer server-only Drive client; if any client chunk grows >5 kB gzip, obtain explicit PR approval per constitution. |

**Post-design re-check**: Phase 0 [research.md](./research.md) and Phase 1 contracts/data model introduce no constitution violations; optional **Complexity** row below covers dependency choice only if `googleapis` is added to shared client graphs.

## Project Structure

### Documentation (this feature)

```text
specs/003-shopify-store-mocks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mock-pack-csv.md
│   └── mock-packs-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── stores/[id]/graphql/route.ts      # existing proxy — reuse for dev introspection
│   ├── stores/[id]/feeds/generate/route.ts  # reference: productSet + CSV patterns
│   └── mock-packs/                       # new: CRUD + validate + Drive upload
├── dashboard/…                           # new pages: mock catalog, upload wizard, generate
components/                               # new presentational pieces + reuse Navigation
lib/
├── db.ts                                 # Prisma client
├── access-token.ts                       # Shopify client-credentials
├── mock-packs/                           # new: csvValidate.ts, driveUpload.ts, shopifySeed.ts
prisma/
├── schema.prisma                         # extend: MockDataPack, MockPackDriveFile, MockGenerationJob
tests/ or **/*.test.ts                    # colocate or mirror existing Jest layout
```

**Structure Decision**: Stay inside the existing Next.js monolith under `D:\work\pet-projects\custom-dev-tools\app`, `components`, and `lib` per current repository layout; no new top-level backend project.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none yet)* | If `googleapis` is added and tripped bundle analysis, record here with PR approval link | `fetch`-only Drive v3 keeps dependency graph smaller |

## Phase 0 & 1 Outputs (this command)

| Artifact | Path |
|----------|------|
| Research | `D:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\research.md` |
| Data model | `D:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\data-model.md` |
| Contracts | `D:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\contracts\` |
| Quickstart | `D:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\quickstart.md` |

## Implementation notes (concise)

1. **CSV validation pipeline**: stream-parse each file, collect row-level errors with caps, run cross-file checks, then commit transaction: Drive upload(s) → insert `MockDataPack` + `MockPackDriveFile` rows.
2. **Drive**: service account + parent folder ID env vars; never stream customer CSV back to browser once stored.
3. **Shopify**: align Admin API version across `feeds/generate` hard-coded `2024-01` and `graphql` route dynamic version; during dev use **Shopify Dev MCP** (`shopify-dev-mcp` in user `mcp.json`) for schema-accurate snippets—MCP was unavailable in the planner session, so official shopify.dev links are captured in [research.md](./research.md).
4. **Generation job**: dequeue `requestedProductCount` rows from parsed product templates (shuffle or round-robin), apply synthetic tags, call `productSet`, then `collectionCreate`, then batched `customerCreate` with backoff on throttle.
