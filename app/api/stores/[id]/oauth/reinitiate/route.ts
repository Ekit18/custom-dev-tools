import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateOAuthUrl, generateState } from '@/lib/oauth';


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { adminScopes, storefrontScopes } = await request.json();

    const { id } = await params;
    const store = await prisma.store.findFirst({
      where: {
        id: id,
        userId: decoded.userId,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    await prisma.store.update({
      where: { id },
      data: {
        adminScopes: JSON.stringify(adminScopes),
        storefrontScopes: JSON.stringify(storefrontScopes),
      },
    });

    const state = generateState();
    const redirectUri = `${APP_URL}/api/stores/oauth/callback`;
    const oauthUrl = generateOAuthUrl(store.shopDomain, store.clientId, adminScopes, state, redirectUri);

    const response = NextResponse.json({ oauthUrl });
    response.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
    response.cookies.set('oauth_store_id', id, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
    return response;
  } catch (error) {
    console.error('OAuth reinitiate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
