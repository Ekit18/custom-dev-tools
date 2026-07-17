## What changed

- `components/StoreCard.tsx`: the admin-token "Copy" button now checks `store.expireAt` (with the same 60s buffer used server-side) before copying. If the cached admin token is missing or expired, it calls `GET /api/stores/[id]/refresh-token` first, updates local state with the fresh token/expiry via `setStores`, then copies the new token. Storefront token copy is unchanged (that token doesn't expire). Added a small loading state (`refreshingAdminToken`) so the copy icon shows a spinner while refreshing.
- `app/api/stores/[id]/refresh-token/route.ts`: added the same auth-cookie + JWT-verify + `userId`-scoped ownership check used by `app/api/stores/[id]/graphql/route.ts` (this route previously had none — any caller who knew a store id could force-refresh and overwrite that store's admin token). Response now also returns `expireAt` so the client can update its local copy of the store without refetching the whole list.

## Why

Reported bug: copying the admin access token from the UI copied whatever was last persisted in `Store.adminAccessToken`, even if it had already expired — unlike the GraphQL request path (`app/api/stores/[id]/graphql/route.ts`), which always goes through `lib/access-token.ts#getAccessToken` and refreshes/persists a new token when the cached one is within 60s of `expireAt`. The copy button had no equivalent check.

## Notes & follow-ups

- The `refresh-token` route's missing auth check was pre-existing and unrelated to the reported bug, but since this fix now wires it up to be called directly from client UI, fixed it alongside rather than increasing exposure of an unauthenticated write endpoint.
- No test suite coverage exists yet for `StoreCard` or the `stores/[id]/*` API routes (repo only has 2 test suites total, for the theme-preference feature). Did not add new tests for this fix to stay consistent with current project practice; flagging in case this area should get real coverage later.
