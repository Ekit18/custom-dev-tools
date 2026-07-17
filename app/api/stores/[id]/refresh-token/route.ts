import { verifyToken } from '@/lib/auth';
import { getAccessToken } from '@/lib/access-token';
import { prisma } from '@/lib/db';

import { decrypt, encrypt } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: storeId } = await params;
    const store = await prisma.store.findFirst({
      where: { id: storeId, userId: decoded.userId },
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

    const expireAt = new Date(Date.now() + expiresIn * 1000);
    await prisma.store.update({
      where: { id: store.id },
      data: {
        adminAccessToken: encrypt(accessToken),
        expireAt,
      },
    });

    return NextResponse.json({ shopifyAccessToken: accessToken, expireAt });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}