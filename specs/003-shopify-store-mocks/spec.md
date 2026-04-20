# Feature Specification: Shopify store mock data

**Feature Branch**: `003-shopify-store-mocks`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "I want to add to this project functionality to mock data in shopify store. There should be different types of mock data. So for example there could be data for electronic device, in which should be included products with shopify correct info and smart collection for this products. Also should be generated mock customers for this shop. So the flow should be next: 1) User in the store card click on button generate mock data 2) he is redirected on the page with mock data settings where he can select topic(for ex. clothes), how much products he want to generate and click submit Product info, collections and customers for mock data should be loaded from UI interface on separate page, where any user in this store can setup new store theme. So flow would be next: 1) User navigates to page upload mock data 2) In this page is shown all already loaded mocks 3) Click add new and navigate to page where he can load data 4) Enter mock data name, load file with collections, product, customers 5) Click save and this mock data type is saved and available for all users of the platform"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage platform mock data packs (Priority: P1)

A user opens the dedicated “mock data catalog” area, sees every mock data pack that has already been saved for the platform, can start adding a new pack, enters a name, provides a single import file that describes collections, products, and customers together, saves, and the new pack immediately appears in the catalog for everyone on the platform.

**Why this priority**: Generation flows depend on curated, reusable definitions. Without catalog management, operators cannot supply the “topics” and realistic structures the generation experience is supposed to use.

**Independent Test**: Upload a new named pack with valid sample content, confirm it appears in the list, then confirm another user session (or incognito profile) can see the same pack without re-uploading.

**Acceptance Scenarios**:

1. **Given** at least one mock pack exists, **When** the user opens the catalog page, **Then** every saved pack is listed with its display name and enough context to distinguish duplicates.
2. **Given** the user is on the “add mock pack” flow, **When** they enter a unique name, attach a valid import file, and save, **Then** the system stores the pack and returns them to a confirmation state showing the new entry in the catalog.
3. **Given** a pack was saved, **When** a different user on the platform opens the catalog, **Then** they see the same pack alongside previously existing packs.

---

### User Story 2 - Generate mock catalog and buyers for a store (Priority: P2)

From a connected store card, a user chooses “Generate mock data,” lands on a settings page, picks a topic (for example “clothes” or “electronics”), specifies how many products to create, submits, and the merchant’s Shopify catalog gains new products with complete storefront-ready information, at least one smart collection that automatically groups those products, and a batch of mock customers aligned with the selected topic.

**Why this priority**: This is the operator-facing outcome that reduces manual test data work, but it only works reliably once curated packs (User Story 1) exist—either uploaded or provided as built-in starter packs.

**Independent Test**: Connect a sandbox store, run generation with a known topic and product count, then verify in the merchant admin that products, a smart collection, and customers appeared in the expected quantities.

**Acceptance Scenarios**:

1. **Given** a store card for a connected Shopify shop, **When** the user clicks “Generate mock data,” **Then** they are taken to the mock generation settings page scoped to that store.
2. **Given** the settings page, **When** the user selects a topic that maps to an available mock pack, sets a positive product count within allowed limits, and submits, **Then** the system confirms acceptance and begins populating the store with products, a smart collection covering those products, and mock customers.
3. **Given** generation completes successfully, **When** the user inspects the store’s product catalog and customer list through their usual seller tools, **Then** product titles, descriptions, pricing cues, and collection membership appear coherent for the chosen topic (no empty shells or placeholder-only records).

---

### User Story 3 - Discover and reuse existing packs before generating (Priority: P3)

Before starting generation, a user can review which topics or packs are currently available (including any starter content shipped with the platform) so they understand what will appear in the topic selector.

**Why this priority**: Improves transparency and prevents surprise outcomes, but generation can still proceed if defaults are documented elsewhere.

**Independent Test**: Open the generation page and verify the topic list matches the catalog entries plus any documented starter packs.

**Acceptance Scenarios**:

1. **Given** multiple packs exist, **When** the user opens generation settings, **Then** each selectable topic corresponds to a catalog entry or documented built-in pack.
2. **Given** no custom packs exist but built-in packs are enabled, **When** the user opens generation settings, **Then** at least one topic remains selectable so stores can still be seeded.

---

### Edge Cases

- Import file is missing required sections (collections, products, or customers) or violates structural rules.
- Import file exceeds maximum supported size or row counts defined by platform policy.
- Duplicate mock pack names: system blocks overwrite unless user explicitly confirms replacement (if replacement is supported).
- Generation is requested while another generation job for the same store is running: system queues, blocks, or surfaces a clear conflict message.
- User selects a product count above the maximum allowed per run: system prevents submission and explains the cap.
- Shopify credentials lack permissions to create products, smart collections, or customers: user sees a actionable error without partial silent failures.
- User abandons the upload form midway: no partial pack is published until save succeeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a catalog page that lists all saved mock data packs available platform-wide, including name and basic metadata (for example created date and source: uploaded vs built-in).
- **FR-002**: Users MUST be able to start an “add mock pack” flow from the catalog page, enter a pack display name, attach one import bundle that contains collection definitions, product definitions, and customer definitions, and save the pack.
- **FR-003**: The system MUST validate import bundles before persisting them, rejecting saves when mandatory sections are missing or structurally invalid, with messages that identify what to fix.
- **FR-004**: After a successful save, the new mock pack MUST be visible to all platform users without requiring per-user duplication.
- **FR-005**: Each connected store card MUST expose an entry point labeled consistently (for example “Generate mock data”) that navigates to mock generation settings for that specific store.
- **FR-006**: The generation settings page MUST let the user choose a topic that maps to an available mock pack (uploaded or built-in) and specify how many products to generate for that run.
- **FR-007**: On successful submission, the system MUST create, in the target Shopify store, the requested number of new products with complete merchant-facing fields needed for realistic listings (for example title, body or description, media references where provided, variants or pricing placeholders as defined by the pack).
- **FR-008**: The system MUST create at least one smart collection per generation run whose rules include the newly generated products for the selected topic (for example via shared tags or other rule set supplied by the pack).
- **FR-009**: The system MUST create mock customers associated with the same topic, using non-sensitive synthetic personal data patterns appropriate for testing (no real personal data required from the operator).
- **FR-010**: The system MUST show progress or completion status for generation long enough for users to know whether to stay on the page or return later, and MUST surface authoritative error text when the commerce platform rejects an operation.
- **FR-011**: Operators MUST be able to delete or archive a mock pack when business policy allows, provided no in-flight generation depends on it; otherwise the system explains the dependency.
- **FR-012**: The platform SHOULD ship at least one built-in mock pack per common vertical (for example electronics and apparel) so generation works immediately on fresh tenants, matching the user’s expectation of “different types of mock data.”

### Key Entities

- **Mock data pack**: Named collection of structured definitions for products, smart collections, and customers; may be uploaded or built-in; referenced by topic during generation.
- **Import bundle**: Single file (or controlled multi-part upload treated as one bundle) supplied during pack creation; validated holistically before persistence.
- **Store connection**: Represents an authorized Shopify shop tied to a store card; scopes generation jobs.
- **Generation job**: User-initiated request capturing store, topic (pack), product count, timestamps, and outcome status for auditing and troubleshooting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with valid import data can register a new mock pack and see it in the catalog within two minutes in ninety-five percent of trials during normal platform conditions.
- **SC-002**: At least ninety percent of successful generation runs produce, for the requested count, the same number of net-new products visible in the seller’s catalog within ten minutes for stores under the documented product-volume limits.
- **SC-003**: For every successful generation run, one hundred percent of runs create at least one smart collection that includes all generated products from that run without manual reassignment.
- **SC-004**: For every successful generation run, mock customers are created in quantities matching the pack’s prescribed ratio to products (for example “two customers per product”) or a documented default ratio when the pack omits one, and the ratio is stated in onboarding help text.
- **SC-005**: Fewer than five percent of support-like interactions (simulated user tests) require re-uploading the same file because validation errors were unclear—each validation failure names the missing section or rule.
- **SC-006**: One hundred percent of catalog listings remain synchronized across simultaneous user sessions (no stale cache longer than one refresh cycle).

## Assumptions

- “Separate page where any user in this store can setup new store theme” is interpreted as separate administrative UI for defining reusable mock packs, not literal storefront theme editing; if literal theme uploads are required later, that becomes a follow-on feature.
- Pack authors accept a published import schema documented in operator help; the spec treats “file” as one validated bundle rather than three unrelated attachments.
- Built-in packs ship with the platform to satisfy “different types” until customers upload custom packs.
- Shopify authorization already exists for store cards; this feature reuses those credentials and respects existing permission boundaries.
- Mock customer data remains synthetic; the feature is not intended to import real consumer data from external sources.
