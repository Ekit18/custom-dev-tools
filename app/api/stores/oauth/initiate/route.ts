import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';
import { generateOAuthUrl, generateState } from '@/lib/oauth';


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { shopDomain, clientId, clientSecret, adminScopes, storefrontScopes } =
      await request.json();

    if (!shopDomain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findUnique({
      where: {
        userId_shopDomain: {
          userId: decoded.userId,
          shopDomain,
        },
      },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: 'Store already exists. Use edit to update scopes.' },
        { status: 409 }
      );
    }

    const encryptedClientSecret = encrypt(clientSecret);

    const store = await prisma.store.create({
      data: {
        userId: decoded.userId,
        shopDomain,
        clientId,
        clientSecret: encryptedClientSecret,
        adminScopes: JSON.stringify(adminScopes),
        storefrontScopes: JSON.stringify(storefrontScopes),
      },
    });

    const state = generateState();
    const redirectUri = `${APP_URL}/api/stores/oauth/callback`;
    const oauthUrl = generateOAuthUrl(shopDomain, clientId, adminScopes, state, redirectUri);

    const response = NextResponse.json({ oauthUrl, storeId: store.id }, { status: 201 });
    response.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
    response.cookies.set('oauth_store_id', store.id, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
    return response;
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
