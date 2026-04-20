# Contract: Mock pack HTTP API (planned)

**Base path (illustrative)**: `/api/mock-packs`  
**Auth**: Same session / bearer strategy as existing `app/api/stores/*` routes (implementation must reuse established auth middleware).

## `GET /api/mock-packs`

Lists `active` (+ optionally `draft` for owner) mock packs for the platform.

**Response 200** (`application/json`):

```json
{
  "packs": [
    {
      "id": "string",
      "slug": "string",
      "name": "string",
      "source": "uploaded | built_in",
      "status": "active",
      "createdAt": "ISO-8601",
      "rowCounts": { "products": 0, "collections": 0, "customers": 0 }
    }
  ]
}
```

---

## `POST /api/mock-packs`

Creates a pack from CSV input.

**Request** (`multipart/form-data`):

| Part | Type | Required |
|------|------|----------|
| `name` | text | yes |
| `slug` | text | no (server-generated from name if omitted) |
| `products` | file (`text/csv`) | yes* |
| `collections` | file (`text/csv`) | yes* |
| `customers` | file (`text/csv`) | yes* |
| `archive` | file (`application/zip`) | yes* |

\*Exactly one mode: **either** three CSV parts **or** one `archive` zip containing the three canonical filenames.

**Responses**:

| Code | When |
|------|------|
| `201` | Validation passed, Drive upload committed, DB row `active` |
| `400` | CSV validation failure (body includes `errors[]` with `file`, `row`, `message`) |
| `409` | Slug or name conflict |
| `500` | Drive or DB failure after validation |

**Response 201** body:

```json
{
  "id": "string",
  "slug": "string",
  "name": "string",
  "drive": { "productsFileId": "string", "collectionsFileId": "string", "customersFileId": "string" }
}
```

---

## `POST /api/stores/:storeId/mock-generate` (illustrative)

Starts generation for a connected store.

**JSON body**:

```json
{
  "packId": "string",
  "productCount": 10
}
```

**Responses**: `202` accepted with `jobId`, or `400` / `409` (running job) / `502` Shopify userErrors.

---

## Versioning

Bump this document’s **Version** field when columns or endpoints change; keep `quickstart.md` in sync.
