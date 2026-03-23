interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Returns a valid access token for the given store, using an in-memory cache.
 * Fetches a new token from Shopify when the cached one is within 60 s of expiry.
 * Returns `fresh: true` when a new token was fetched so callers can persist it.
 */
export async function getAccessToken(
  storeId: string,
  shop: string,
  clientId: string,
  clientSecret: string,
  forceRefresh = false
): Promise<{ accessToken: string; expiresIn: number; fresh: boolean }> {
  const cached = tokenCache.get(storeId);
  if (!forceRefresh && cached && Date.now() < cached.expiresAt - 60_000) {
    return { accessToken: cached.token, expiresIn: 0, fresh: false };
  }

  const response = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

  const { access_token, expires_in } = await response.json();
  console.log('Access Token Data:', { access_token, expires_in });
  tokenCache.set(storeId, { token: access_token, expiresAt: Date.now() + expires_in * 1000 });
  return { accessToken: access_token, expiresIn: expires_in, fresh: true };
}

