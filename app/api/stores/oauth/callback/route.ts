import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { generateStorefrontToken } from '@/lib/oauth';
import { getAccessToken } from '@/lib/access-token';


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');

    const savedState = request.cookies.get('oauth_state')?.value;
    const storeId = request.cookies.get('oauth_store_id')?.value;

    if (!code || !state || !shop) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_params', request.url)
      );
    }

    if (state !== savedState) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state', request.url)
      );
    }

    if (!storeId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_store_id', request.url)
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.redirect(
        new URL('/dashboard?error=store_not_found', request.url)
      );
    }

    // Decrypt the client secret before using it
    const clientSecret = decrypt(store.clientSecret);

    const { accessToken, expiresIn } = await getAccessToken(
      store.id,
      store.shopDomain,
      store.clientId,
      clientSecret,
      true // force fresh token after install
    );

    let storefrontToken: string | null = null;
    try {
      storefrontToken = await generateStorefrontToken(shop, accessToken);
    } catch (err) {
      console.warn('Storefront token generation failed (skipping):', err);
    }
    await prisma.store.update({
      where: { id: storeId },
      data: {
        adminAccessToken: encrypt(accessToken),
        storefrontAccessToken: storefrontToken ? encrypt(storefrontToken) : null,
        expireAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    const response = NextResponse.redirect(
      new URL('/stores/oauth/callback?success=true', APP_URL)
    );

    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_store_id');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', APP_URL)
    );
  }
}


