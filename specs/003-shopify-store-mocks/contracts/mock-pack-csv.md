# Contract: Mock pack CSV files

**Version**: 1.0.0  
**Encoding**: UTF-8  
**Delimiter**: comma (`,`)  
**Header row**: required, case-sensitive column names as below

Each mock pack MUST include **three** files at the root of the upload (multipart) or zip archive:

- `products.csv`
- `collections.csv`
- `customers.csv`

---

## `products.csv`

| Column | Required | Description |
|--------|----------|-------------|
| `sku` | yes | Unique within file; becomes `ProductSetInput` variant SKU |
| `title` | yes | Product title |
| `body_html` | no | Long description (HTML allowed) |
| `vendor` | no | Vendor string |
| `product_type` | no | Product type |
| `price` | yes | Decimal string, e.g. `19.99` |
| `compare_at_price` | no | Optional decimal string |
| `inventory_qty` | no | Non-negative integer; default `0` |
| `tags` | no | Semicolon-separated tags applied to product; used for smart collection rules |
| `image_url_1` … `image_url_5` | no | HTTPS URLs |

**Rules**:

- `sku` must be unique across all rows in the file.
- If `tags` is empty, generation MUST still apply a synthetic tag derived from pack `slug` so smart collections can target generated rows (documented in UI help).

---

## `collections.csv`

Each row defines **one** smart collection template (single rule v1; multiple rows = multiple collections).

| Column | Required | Description |
|--------|----------|-------------|
| `title` | yes | Collection title |
| `handle` | no | URL handle; if empty, derive from title |
| `rule_column` | yes | Must be a valid `CollectionRuleColumn` for the shop (e.g. `TAG`, `TYPE`, `VENDOR`) |
| `rule_relation` | yes | e.g. `EQUALS`, `CONTAINS` |
| `rule_condition` | yes | Operand string, e.g. tag value |
| `applied_disjunctively` | no | `true` / `false`; default `false` |

**Rules**:

- For `rule_column = TAG`, `rule_condition` SHOULD appear in the union of all product `tags` for at least one product row **or** match the synthetic pack tag strategy.

---

## `customers.csv`

| Column | Required | Description |
|--------|----------|-------------|
| `email` | yes | Unique per file; use `@example.com` style synthetic domains |
| `first_name` | no | |
| `last_name` | no | |
| `phone` | no | E.164 preferred |
| `tags` | no | Semicolon-separated |
| `address1` | no | |
| `city` | no | |
| `province_code` | no | ISO-like province/state when country is US/CA |
| `country_code` | no | ISO 3166-1 alpha-2 |
| `zip` | no | |

**Rules**:

- `email` unique within file.
- No real PII requirement; reject rows with known disposable patterns if internal policy demands (optional).

---

## Parser settings

- `columns: true`, `skip_empty_lines: true`, `trim: true` (match existing feed import style).
- Reject if BOM breaks first header (strip UTF-8 BOM in preprocessor).
