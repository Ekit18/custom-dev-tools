import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runMockGeneration } from "@/lib/mock-packs/shopifySeed";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id: storeId } = await params;
    const body = (await request.json()) as {
      packId?: string;
      productCount?: number;
    };

    if (!body.packId || typeof body.productCount !== "number") {
      return NextResponse.json(
        { error: "packId and productCount are required" },
        { status: 400 },
      );
    }

    if (body.productCount < 1 || body.productCount > 500) {
      return NextResponse.json(
        { error: "productCount must be between 1 and 500" },
        { status: 400 },
      );
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId: decoded.userId },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const pack = await prisma.mockDataPack.findFirst({
      where: { id: body.packId, status: "ACTIVE" },
    });
    if (!pack) {
      return NextResponse.json(
        { error: "Mock pack not found or not active" },
        { status: 404 },
      );
    }

    const blocking = await prisma.mockGenerationJob.findFirst({
      where: {
        storeId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });
    if (blocking) {
      return NextResponse.json(
        {
          error: "A generation job is already in progress for this store",
          jobId: blocking.id,
        },
        { status: 409 },
      );
    }

    const job = await prisma.mockGenerationJob.create({
      data: {
        storeId,
        packId: pack.id,
        requestedProductCount: body.productCount,
        status: "QUEUED",
      },
    });

    try {
      await runMockGeneration(job.id);
    } catch (e) {
      await prisma.mockGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage:
            e instanceof Error ? e.message : "Generation failed unexpectedly",
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Generation failed" },
        { status: 500 },
      );
    }

    const updated = await prisma.mockGenerationJob.findUnique({
      where: { id: job.id },
    });

    return NextResponse.json({ job: updated });
  } catch (e) {
    console.error("POST mock-generate", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
