# Phase 0 Research: Shopify store mock data

**Branch**: `003-shopify-store-mocks`  
**Date**: 2026-04-17

## 1. Google Drive as canonical file storage

**Decision**: Persist uploaded mock-pack CSV payloads in **Google Drive** (single parent folder per environment, optional Shared Drive). The application database stores **metadata** (pack name, topic slug, validation hash, row counts, createdBy) and **Drive resource identifiers** (`fileId` for each stored CSV object, or one `fileId` for a single uploaded `.zip`).

**Rationale**:

- Meets the requirement to “use Google Drive to save files” while keeping Postgres as the source of truth for catalog listing and authorization.
- Large CSVs and revisions stay off the DB blob path; Postgres indexes stay small.

**Alternatives considered**:

- **S3-compatible object storage**: Simpler credentials story; rejected for this iteration because the stakeholder explicitly requested Drive.
- **Postgres `BYTEA`**: Rejected; conflicts with Drive requirement and bloats backups.

**Implementation notes**:

- Prefer **service account** + folder ACL (folder shared with the service account email) or **Shared Drive** membership to avoid end-user Google OAuth for uploads in v1.
- Use Drive API v3 `files.create` with `uploadType=multipart` for CSV or zip uploads from server actions / route handlers.
- Optional later: domain-wide delegation if uploads must appear as a specific human user.

---

## 2. CSV-only import shape and validation-before-DB

**Decision**: Accept **exactly three CSV documents** per mock pack, named:

- `products.csv`
- `collections.csv`
- `customers.csv`

Upload flow accepts either **three files in one multipart request** or **one `.zip`** containing those three names at the archive root. **No row is written to application tables** (and no Drive upload completes) until **all three** pass structural validation.

**Rationale**:

- Satisfies “file should be in csv format” while keeping products, collections, and customers **separable** (clearer errors than one mega-CSV).
- Matches existing project usage of `csv-parse` and patterns in `app/api/stores/[id]/feeds/generate/route.ts`.

**Alternatives considered**:

- **Single CSV with `entity_type` column**: Rejected; harder for authors and worse validation UX.
- **JSON bundle**: Rejected by stakeholder constraint (CSV only).

**Validation rules (v1)**:

- UTF-8 encoding; parse with headers; reject empty files.
- Enforce **required columns** per contract in `specs/003-shopify-store-mocks/contracts/mock-pack-csv.md`.
- Cross-check: every `collections.csv` rule `condition` that references a **TAG** aligns with tags present on product rows (or document that generation adds synthetic tags—implementation choice recorded in plan).
- Caps: max rows per file (configurable env, e.g. 5k products / 500 collections / 10k customers) to protect API quotas and request timeouts.

---

## 3. Shopify Admin GraphQL for seeding (MCP note + API choices)

**Decision**:

- **Products**: Continue the established approach using Admin GraphQL **`productSet`** with `ProductSetInput` (already used in `app/api/stores/[id]/feeds/generate/route.ts`). Align API version string with the store proxy (`app/api/stores/[id]/graphql/route.ts`) over time to avoid schema drift.
- **Smart collections**: Use **`collectionCreate`** with `CollectionInput.ruleSet` (smart collection). Discover allowed `column` / `relation` pairs via **`collectionRulesConditions`** when building rules from CSV or when validating CSV rules against the merchant’s shop (dev stores may use cached rule types for offline validation).
- **Customers**: Use **`customerCreate`** (or bulk strategy if row counts grow—defer until needed) with synthetic emails and marketing consent flags set to safe defaults per store policy.

**Rationale**: Official Admin API mutations are stable, auditable via `userErrors`, and documented on shopify.dev.

**Shopify Dev MCP**: The user’s Cursor config includes `shopify-dev-mcp` (`@shopify/dev-mcp`). It was **not reachable from this planning environment** (`MCP server does not exist`). During implementation, re-run discovery with the MCP (e.g. schema introspection / doc search) and cross-check against:

- [collectionCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/collectioncreate)
- [collectionRulesConditions](https://shopify.dev/docs/api/admin-graphql/latest/queries/collectionRulesConditions)
- Product mutations around **`productSet`** / productCreate (per chosen API version)

**Alternatives considered**:

- **REST Admin**: Rejected; project already standardizes on GraphQL proxy + direct fetch patterns.

---

## 4. Operational alignment with feature spec

**Decision**: Treat the stakeholder’s CSV constraint as an **amendment** to spec FR-002/FR-003 (“single import bundle” → **three CSV files or one zip of three CSVs**). User-facing copy should say “CSV pack (three files)”.

**Rationale**: Eliminates contradiction without reopening the whole spec; behavior stays testable.

---

## Resolved clarifications

| Topic              | Status |
|--------------------|--------|
| File storage       | Google Drive + DB metadata |
| Import format      | Three CSVs (or zip thereof) |
| Validation gating  | Validate all CSVs before DB write and before Drive finalize |
| Shopify operations | Admin GraphQL `productSet`, `collectionCreate` (+ rules query), `customerCreate` |
| MCP Shopify        | Use when available; shopify.dev used for this document |
