# custom-dev-tools (shopify-oauth-platform)

Internal tool for connecting Shopify stores via OAuth/client-credentials, browsing their Admin & Storefront GraphQL APIs, and generating mock data packs.

## Stack

- **Framework**: Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript 5 (strict)
- **UI**: MUI 7 + Emotion, Tailwind 4, `react-hot-toast` for notifications
- **Data**: Prisma 5 against **two** datastores:
  - `prisma/` → PostgreSQL — system of record (`User`, `Store`, mock-pack metadata)
  - `prisma-mongo/` → MongoDB — only for `MockPackPayload` (large CSV blobs), client output to `node_modules/@prisma/mongo-client`
- **Auth**: `lib/auth.ts` — JWT (`jsonwebtoken`) in an httpOnly `token` cookie + bcrypt password hashing. `middleware.ts` gates all non-public routes by verifying that cookie.
- **GraphQL explorer**: `graphiql` / `@graphiql/toolkit`, proxied server-side through `app/api/stores/[id]/graphql/route.ts`
- **Lint/format**: Biome (`biome.json`) — one tool for both

## Folder structure

- `app/` — App Router pages and `app/api/**` route handlers (`auth`, `stores`, `stores/[id]/graphql`, `stores/[id]/refresh-token`, `stores/[id]/feeds/generate`, `oauth/callback`, `mock-packs`, `mongo`)
- `components/` — client components (`StoreCard`, `StoreForm`, `AuthForm`, `Navigation`, `mock-packs/`, `theme/`)
- `lib/` — server/shared logic:
  - `auth.ts` — app JWT sign/verify, password hashing
  - `oauth.ts` — Shopify OAuth URL + code/token exchange, storefront token generation
  - `access-token.ts` — in-memory cache + refresh of the Shopify **admin** access token (client-credentials grant)
  - `encryption.ts` — encrypt/decrypt secrets & tokens at rest
  - `db.ts` / `mongo.ts` — Prisma clients
  - `fetchWithAuth.ts` — fetch wrapper that redirects to `/login` on a 401 (app-session expiry, not Shopify token expiry)
  - `shopify.ts`, `scopes.ts`, `mock-packs/`, `mongo-playground/`
- `prisma/`, `prisma-mongo/` — schemas + migrations for the two datastores
- `tests/` — `unit/`, `integration/`, `__mocks__/`
- `specs/` — per-feature spec docs (tasks/quickstart/data-model)
- `docker/`, `Makefile` — Docker Compose wrapper (`make build/up/down/logs/shell-<svc>`, `PROJECT_ENV=dev|prod`)

## Commands

```
npm run dev              # start dev server
npm run build             # prisma generate (both schemas) + next build
npm run lint               # biome check
npm run format              # biome format --write
npm test                     # jest --runInBand
npm run test:coverage         # jest --runInBand --coverage
npm run setup:dev              # prisma migrate dev (postgres)
npm run pg:migrate:dev / pg:migrate / pg:generate
npm run mongo:generate / mongo:push
```

## Testing

Jest + ts-jest, `testEnvironment: "node"` by default (jsdom used where components render). Tests live under `tests/**/*.test.ts(x)`, path alias `@/*`. `jest.setup.ts` seeds `JWT_SECRET`/`DATABASE_URL`/`MONGO_DATABASE_URL` and mocks `window.matchMedia`. Coverage threshold: 80% lines over `lib/**`, `app/api/**`, `components/**`.

## Conventions & gotchas

- Store tokens (`Store.adminAccessToken`, `Store.storefrontAccessToken`, `Store.clientSecret`) are stored **encrypted** (`lib/encryption.ts`) and only decrypted for outbound requests — never log or persist them decrypted.
- The Shopify **admin** access token expires and must be refreshed via `lib/access-token.ts#getAccessToken` (checks `Store.expireAt` with a 60s buffer) before use; any new code path that reads `adminAccessToken` for outbound use should go through this refresh check rather than reading the DB/prop value directly. The **storefront** token does not expire.
- Two separate "token expiry" concepts exist — don't conflate them: the app's own JWT session cookie (`lib/fetchWithAuth.ts` redirects to `/login` on 401) vs. the Shopify admin access token (`lib/access-token.ts`).
- API routes that look up a `Store` should scope the query by the authenticated user (`findFirst({ where: { id, userId: decoded.userId } })`) — see `app/api/stores/[id]/graphql/route.ts` for the pattern. Not all existing routes do this consistently.

## Worklog convention

After every code change in this project, add an entry at `worklog/<YYYY-MM-DD>-<short-slug>.md` with these sections:

```markdown
## What changed
## Why
## Notes & follow-ups
```

Keep entries short and factual; link related PRs/issues if known.
