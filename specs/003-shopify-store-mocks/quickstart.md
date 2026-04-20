# Quickstart: Mock packs + generation (developers)

**Plan**: [plan.md](./plan.md)  
**Contracts**: [contracts/](./contracts/)

## Prerequisites

- Node.js matching project engines (see repo root `package.json`).
- Postgres `DATABASE_URL` configured (see `.env`).
- Apply migrations: `npm run pg:migrate` (or `npm run pg:migrate:dev` in development) so `MockDataPack`, `MockPackDriveFile`, and `MockGenerationJob` exist.
- Shopify **dev** store with app credentials already working for existing store cards.
- Optional: Google Cloud project with **Drive API** enabled (see below).

## Environment variables

See repository root `.env.example` for placeholders. Implemented names:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Required for Drive archival**: full service account JSON string (single line in `.env`). |
| `GOOGLE_DRIVE_MOCK_PACK_PARENT_ID` | **Required for Drive**: parent folder ID for uploaded CSVs. |
| `MOCK_PACK_MAX_*_ROWS` | Optional caps for CSV validation (defaults in `.env.example`). |

If Drive variables are **omitted**, mock packs are stored **only in Postgres** (CSV text columns); uploads still succeed.

## Google Drive setup (optional)

1. Create a dedicated folder (or Shared Drive) for mock-pack uploads.
2. Create a **service account**, download JSON key, grant it **Editor** on the folder (or add to Shared Drive).
3. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the raw JSON string and `GOOGLE_DRIVE_MOCK_PACK_PARENT_ID` to the folder ID.
4. Never commit key material; use local `.env` and CI secrets.

## Local CSV pack smoke test

1. Build three CSVs following [contracts/mock-pack-csv.md](./contracts/mock-pack-csv.md).
2. Log in, open **Dashboard → Mock packs → Add pack** (`/dashboard/mock-packs/new`), or `POST /api/mock-packs` with `multipart/form-data`: fields `name`, and either `archive` (zip) or `products`, `collections`, `customers` (three files).
3. Expect `201` only when validation passes; `400` returns `{ errors: [...] }` with row-level messages.
4. If Drive is configured, three files appear in the folder; `MockPackDriveFile` rows reference their Drive IDs.

## Generation smoke test

1. From the dashboard store card, click **Generate mock data**, or open `/stores/[storeId]/mock-generate`.
2. Select an **active** pack (built-ins are bootstrapped on first `GET /api/mock-packs`) and a product count (1–500).
3. Submit; the API runs synchronously and returns the `MockGenerationJob` with `SUCCEEDED` or `FAILED`.
4. In Shopify Admin, verify products (tag `mock-pack-{slug}`), one smart collection on that tag, and customers.

## Shopify GraphQL during development

- Use `POST /api/stores/:id/graphql` with `schema: admin` for exploratory queries (version query param defaults to `2026-01`).
- Server-side mutations use `SHOPIFY_ADMIN_API_VERSION` from `lib/shopifyAdminVersion.ts` (currently `2026-01`).

## Tests (constitution)

- Unit-test CSV validators with golden good/bad fixtures (no network) — recommended follow-up.
- Integration tests with mocked Drive + Shopify HTTP — optional follow-up.
