import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const token = _request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id: storeId, jobId } = await params;

    const store = await prisma.store.findFirst({
      where: { id: storeId, userId: decoded.userId },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const job = await prisma.mockGenerationJob.findFirst({
      where: { id: jobId, storeId },
      include: { pack: { select: { id: true, name: true, slug: true } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        errorMessage: job.errorMessage,
        requestedProductCount: job.requestedProductCount,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
        pack: job.pack,
      },
    });
  } catch (e) {
    console.error("GET mock-jobs", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
