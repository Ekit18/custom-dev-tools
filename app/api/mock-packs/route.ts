import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureBuiltInPacks } from "@/lib/mock-packs/ensureBuiltInPacks";
import { upsertMockPackPayload } from "@/lib/mock-packs/mongoPayload";
import { parseMultipartMockPack } from "@/lib/mock-packs/parseMockPackUpload";
import { validateMockPackCsv } from "@/lib/mock-packs/validateMockPackCsv";
import { slugifyName } from "@/lib/slug";

function authUser(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET() {
  try {
    await ensureBuiltInPacks();
    const packs = await prisma.mockDataPack.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        source: true,
        status: true,
        description: true,
        createdAt: true,
        productRowCount: true,
        collectionRowCount: true,
        customerRowCount: true,
      },
    });

    return NextResponse.json({
      packs: packs.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        source: p.source,
        status: p.status,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
        rowCounts: {
          products: p.productRowCount,
          collections: p.collectionRowCount,
          customers: p.customerRowCount,
        },
      })),
    });
  } catch (e) {
    console.error("GET /api/mock-packs", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authUser(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 },
      );
    }

    const form = await request.formData();
    const nameRaw = form.get("name");
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slugOverride = form.get("slug");
    let slug =
      typeof slugOverride === "string" && slugOverride.trim()
        ? slugifyName(slugOverride.trim())
        : slugifyName(name);

    const existingSlug = await prisma.mockDataPack.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const { productsCsv, collectionsCsv, customersCsv } =
      await parseMultipartMockPack(form);

    const validated = validateMockPackCsv(
      productsCsv,
      collectionsCsv,
      customersCsv,
    );
    if (!validated.ok) {
      return NextResponse.json({ errors: validated.errors }, { status: 400 });
    }

    const { data } = validated;

    const pack = await prisma.mockDataPack.create({
      data: {
        slug,
        name,
        source: "UPLOADED",
        status: "ACTIVE",
        createdByUserId: user.userId,
        productRowCount: data.productRowCount,
        collectionRowCount: data.collectionRowCount,
        customerRowCount: data.customerRowCount,
      },
    });

    try {
      await upsertMockPackPayload(pack.id, {
        productsCsv,
        collectionsCsv,
        customersCsv,
      });
    } catch (e) {
      await prisma.mockDataPack.delete({ where: { id: pack.id } });
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Failed to persist mock pack data to MongoDB",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/mock-packs", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
