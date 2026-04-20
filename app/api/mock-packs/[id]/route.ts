import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

function authUser(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = authUser(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    if (body.status !== "ARCHIVED" && body.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only status ARCHIVED or ACTIVE is supported" },
        { status: 400 },
      );
    }

    const pack = await prisma.mockDataPack.findUnique({ where: { id } });
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }
    if (pack.source === "BUILT_IN") {
      return NextResponse.json(
        { error: "Built-in packs cannot be archived or unarchived" },
        { status: 400 },
      );
    }

    if (body.status === "ARCHIVED") {
      const running = await prisma.mockGenerationJob.findFirst({
        where: {
          packId: id,
          status: { in: ["QUEUED", "RUNNING"] },
        },
      });
      if (running) {
        return NextResponse.json(
          {
            error:
              "Cannot archive this pack while a generation job is queued or running for it",
          },
          { status: 409 },
        );
      }

      await prisma.mockDataPack.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });

      return NextResponse.json({ ok: true });
    }

    if (pack.status !== "ARCHIVED") {
      return NextResponse.json(
        { error: "Only archived packs can be restored to active" },
        { status: 400 },
      );
    }

    await prisma.mockDataPack.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/mock-packs/[id]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
