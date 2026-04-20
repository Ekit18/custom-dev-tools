# Data Model: Shopify store mock data

**Branch**: `003-shopify-store-mocks`  
**Date**: 2026-04-17  
**Spec**: [spec.md](./spec.md)

## Overview

Postgres holds **catalog metadata**, **generation jobs**, and **Google Drive pointers**. Large CSV payloads live in **Drive**; parsed snapshots for fast listing are optional (v1 can derive counts from validation pass only).

## Entities

### `MockDataPack`

Represents a platform-wide mock pack (topic) operators can select during generation.

| Field | Type | Notes |
|-------|------|--------|
| `id` | string (cuid) | Primary key |
| `slug` | string | Unique, URL-safe; used for tagging products during generation |
| `name` | string | Display name from UI |
| `source` | enum | `uploaded` \| `built_in` |
| `status` | enum | `draft` \| `active` \| `archived` |
| `createdAt` / `updatedAt` | datetime | Audit |
| `createdByUserId` | string? | FK → `User.id` when schema links users |

**Relations**:

- `1` → many `MockPackDriveFile` (or embedded three columns if fixed schema preferred)
- `1` → many `MockGenerationJob`

**Validation rules**:

- `slug` unique; immutable after create (or versioned—v1: immutable).
- Only `active` packs appear in generation topic pickers.

---

### `MockPackDriveFile`

Stores Google Drive file references for the three CSV artifacts (or zip).

| Field | Type | Notes |
|-------|------|--------|
| `id` | cuid | PK |
| `packId` | string | FK → `MockDataPack` |
| `role` | enum | `products` \| `collections` \| `customers` \| `bundle_zip` |
| `driveFileId` | string | Drive `files.id` |
| `mimeType` | string | e.g. `text/csv`, `application/zip` |
| `sha256` | string? | Content hash post-upload |
| `byteSize` | int? | For admin diagnostics |

**Rules**:

- For zip uploads: single row with `role = bundle_zip` **or** expand server-side to three Drive files after extraction—implementation choice; prefer **three Drive files** for simpler regeneration/debug.

---

### `MockGenerationJob`

Tracks each “generate mock data” execution for a store.

| Field | Type | Notes |
|-------|------|--------|
| `id` | cuid | PK |
| `storeId` | string | FK → `Store.id` |
| `packId` | string | FK → `MockDataPack` |
| `requestedProductCount` | int | From UI |
| `status` | enum | `queued` \| `running` \| `succeeded` \| `failed` |
| `errorMessage` | text? | User-safe summary |
| `createdAt` / `completedAt` | datetime | |

**Rules**:

- At most one `running` job per `storeId` (DB partial unique index or transactional lock).

---

## State transitions

### `MockDataPack.status`

```
draft → active   (after successful validation + Drive persistence)
active → archived (operator action; blocks new jobs)
archived → active (optional restore if no conflicting slug)
```

### `MockGenerationJob.status`

```
queued → running → succeeded
                 └→ failed
```

---

## Indexes

- `MockDataPack(slug)` unique
- `MockGenerationJob(storeId, status)` partial where `status = 'running'`
- `MockPackDriveFile(packId, role)` unique together

---

## Prisma placement

Add models to `D:\work\pet-projects\custom-dev-tools\prisma\schema.prisma` (existing datasource) and run migrations when implementing.
