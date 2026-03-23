import { getAccessToken } from '@/lib/access-token';
import { prisma } from '@/lib/db';

import { decrypt, encrypt } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storeId } = await params;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const decryptedClientSecret = decrypt(store.clientSecret);
    const { accessToken, expiresIn } = await getAccessToken(
      store.id,
      store.shopDomain,
      store.clientId,
      decryptedClientSecret,
      true // always force a fresh token on explicit refresh
    );

    await prisma.store.update({
      where: { id: store.id },
      data: {
        adminAccessToken: encrypt(accessToken),
        expireAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return NextResponse.json({ shopifyAccessToken: accessToken });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}