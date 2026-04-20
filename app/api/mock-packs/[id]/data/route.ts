import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMockPackPayload } from "@/lib/mock-packs/mongoPayload";

function authUser(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = authUser(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const pack = await prisma.mockDataPack.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true },
    });
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    const payload = await getMockPackPayload(id);
    if (!payload) {
      return NextResponse.json(
        { error: "Mock CSV payload not found in MongoDB" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      pack: { id: pack.id, slug: pack.slug, name: pack.name },
      data: {
        productsCsv: payload.productsCsv,
        collectionsCsv: payload.collectionsCsv,
        customersCsv: payload.customersCsv,
      },
    });
  } catch (e) {
    console.error("GET /api/mock-packs/[id]/data", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
