import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { uninstallApp } from '@/lib/shopify';


export async function GET(
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

    // Await params before accessing properties
    const { id } = await params;

    const store = await prisma.store.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      store: {
        id: store.id,
        shopDomain: store.shopDomain,
        clientId: store.clientId,
        adminScopes: JSON.parse(store.adminScopes),
        storefrontScopes: JSON.parse(store.storefrontScopes),
        installedAt: store.installedAt,
        updatedAt: store.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Await params before accessing properties
    const { id } = await params;

    const store = await prisma.store.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    let uninstallSuccess = false;

    if (store.adminAccessToken) {
      try {
        const decryptedToken = decrypt(store.adminAccessToken);
        uninstallSuccess = await uninstallApp(store.shopDomain, decryptedToken);
      } catch (err) {
        console.error('Failed to uninstall app:', err);
      }
    }

    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Store deleted successfully',
      uninstallSuccess,
      warning: !uninstallSuccess
        ? 'Store removed from database, but automatic app uninstall failed. Please uninstall the app manually from your Shopify admin.'
        : undefined,
    });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}