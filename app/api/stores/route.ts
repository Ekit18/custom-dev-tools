import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';


export async function GET(request: NextRequest) {
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

    const stores = await prisma.store.findMany({
      where: { userId: decoded.userId },
      select: {
        id: true,
        shopDomain: true,
        adminScopes: true,
        storefrontScopes: true,
        installedAt: true,
        adminAccessToken: true,
        storefrontAccessToken: true,
        updatedAt: true,
      },
      orderBy: { installedAt: 'desc' },
    });

    const storesWithParsedScopes = stores.map(store => ({
      ...store,
      adminScopes: JSON.parse(store.adminScopes),
      storefrontScopes: JSON.parse(store.storefrontScopes),
      adminAccessToken: store.adminAccessToken ? decrypt(store.adminAccessToken) : null,
      storefrontAccessToken: store.storefrontAccessToken ? decrypt(store.storefrontAccessToken) : null,
    }));

    return NextResponse.json({ stores: storesWithParsedScopes });
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
