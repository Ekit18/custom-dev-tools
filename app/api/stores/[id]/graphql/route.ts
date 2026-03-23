import { verifyToken } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/encryption';
import { getAccessToken } from '@/lib/access-token';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const { id } = await params;
    console.log(await params)
    const store = await prisma.store.findFirst({
      where: { id, userId: decoded.userId },
    });
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get version and schema from query params
    const version = request.nextUrl.searchParams.get('version') || '2026-01';
    const schema = request.nextUrl.searchParams.get('schema') || 'admin';

    // Determine which access token to use
    let accessToken: string | undefined;
    let endpoint: string;
    if (schema === 'admin') {
      const decryptedClientSecret = decrypt(store.clientSecret);
      const { accessToken: freshToken, expiresIn, fresh } = await getAccessToken(
        store.id,
        store.shopDomain,
        store.clientId,
        decryptedClientSecret
      );
      if (fresh) {
        const encryptedToken = encrypt(freshToken);
        await prisma.store.update({
          where: { id: store.id },
          data: {
            adminAccessToken: encryptedToken,
            expireAt: new Date(Date.now() + expiresIn * 1000),
          },
        });
      }
      accessToken = freshToken;
      endpoint = `https://${store.shopDomain}/admin/api/${version}/graphql.json`;
    } else if (schema === 'storefront') {
      if (!store.storefrontAccessToken) {
        return NextResponse.json({ error: 'Storefront access token not found' }, { status: 404 });
      }
      accessToken = decrypt(store.storefrontAccessToken);
      endpoint = `https://${store.shopDomain}/api/${version}/graphql.json`;
    } else {
      return NextResponse.json({ error: 'Invalid schema. Must be "admin" or "storefront".' }, { status: 400 });
    }

    const body = await request.json();
    const { query, variables } = body;

    // Forward the request to Shopify
    const shopifyRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(schema === 'admin'
          ? { 'X-Shopify-Access-Token': accessToken }
          : { 'X-Shopify-Storefront-Access-Token': accessToken }),
      },
      body: JSON.stringify({ query, variables }),
    });
    const shopifyData = await shopifyRes.json();
    return NextResponse.json(shopifyData, { status: shopifyRes.status });
  } catch (error) {
    console.error('Shopify GraphQL proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}