import crypto from 'crypto';

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateOAuthUrl(
  shop: string,
  clientId: string,
  scopes: string[],
  state: string,
  redirectUri: string
): string {
  const scopeString = scopes.join(',');
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopeString,
    redirect_uri: redirectUri,
    state: state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  shop: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data)
  return data.access_token;
}

export const generateStorefrontToken = async (shop: string, accessToken: string) => {
  try {
    const resp = await fetch(`https://${shop}/admin/api/2026-01/storefront_access_tokens.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        storefront_access_token: {
          title: 'Custom Storefront Token'
        }
      })
    });
    if (!resp.ok) {
      throw new Error(`Failed to generate storefront token: ${resp}`);
    }
    const data = await resp.json();
    console.log('Storefront Token Data:', data);
    return data.storefront_access_token.access_token;
  } catch (error) {
    console.error('Error generating storefront token:', error);
  }
}
