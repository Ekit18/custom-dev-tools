import type { Prisma } from "@prisma/mongo-client";
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prismaMongo } from "@/lib/mongo";

export const runtime = "nodejs";

const COLLECTION_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_BATCH = 500;

function authUser(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

function validatePipeline(value: unknown): value is Prisma.InputJsonValue[] {
  if (!Array.isArray(value)) return false;
  for (const stage of value) {
    if (stage === null || typeof stage !== "object" || Array.isArray(stage)) {
      return false;
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  const user = authUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Expected JSON object" },
      { status: 400 },
    );
  }

  const { collection, pipeline } = body as {
    collection?: unknown;
    pipeline?: unknown;
  };

  const coll =
    typeof collection === "string" && collection.length > 0
      ? collection
      : "MockPackPayload";

  if (!COLLECTION_RE.test(coll) || coll.length > 120) {
    return NextResponse.json(
      { error: "Invalid collection name" },
      { status: 400 },
    );
  }

  if (!validatePipeline(pipeline)) {
    return NextResponse.json(
      { error: "pipeline must be an array of objects (aggregation stages)" },
      { status: 400 },
    );
  }

  const command: Prisma.InputJsonObject = {
    aggregate: coll,
    pipeline: pipeline as Prisma.InputJsonArray,
    cursor: { batchSize: MAX_BATCH },
  };

  try {
    const raw = await prismaMongo.$runCommandRaw(command);
    return NextResponse.json({ result: raw });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Aggregation failed";
    console.error("POST /api/mongo/aggregate", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
