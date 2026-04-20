import { prisma } from "@/lib/db";
import { upsertMockPackPayload } from "@/lib/mock-packs/mongoPayload";
import { BUILT_IN_PACKS } from "./builtInPacks";

/**
 * Idempotent bootstrap: ensures built-in mock packs exist in Postgres.
 * Called from GET /api/mock-packs so every environment gains FR-012 without a separate seed step.
 */
export async function ensureBuiltInPacks(): Promise<void> {
  for (const def of BUILT_IN_PACKS) {
    const existing = await prisma.mockDataPack.findUnique({
      where: { slug: def.slug },
    });
    if (existing) {
      await upsertMockPackPayload(existing.id, {
        productsCsv: def.productsCsv,
        collectionsCsv: def.collectionsCsv,
        customersCsv: def.customersCsv,
      });
      continue;
    }

    const created = await prisma.mockDataPack.create({
      data: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        source: "BUILT_IN",
        status: "ACTIVE",
        productRowCount: 2,
        collectionRowCount: 1,
        customerRowCount: 2,
      },
    });

    await upsertMockPackPayload(created.id, {
      productsCsv: def.productsCsv,
      collectionsCsv: def.collectionsCsv,
      customersCsv: def.customersCsv,
    });
  }
}
