import { prismaMongo } from "@/lib/mongo";

export type MockPackCsvPayload = {
  productsCsv: string;
  collectionsCsv: string;
  customersCsv: string;
};

export async function getMockPackPayload(
  packId: string,
): Promise<MockPackCsvPayload | null> {
  return prismaMongo.mockPackPayload.findUnique({
    where: { packId },
  });
}

/**
 * Insert or update CSV payload. Implemented as find + update/create instead of
 * `upsert()` so MongoDB does not need to be a replica set (Prisma maps `upsert`
 * to a transaction on MongoDB).
 */
export async function upsertMockPackPayload(
  packId: string,
  payload: MockPackCsvPayload,
): Promise<void> {
  const existing = await prismaMongo.mockPackPayload.findUnique({
    where: { packId },
  });
  if (existing) {
    await prismaMongo.mockPackPayload.update({
      where: { packId },
      data: {
        productsCsv: payload.productsCsv,
        collectionsCsv: payload.collectionsCsv,
        customersCsv: payload.customersCsv,
      },
    });
    return;
  }
  await prismaMongo.mockPackPayload.create({
    data: {
      packId,
      productsCsv: payload.productsCsv,
      collectionsCsv: payload.collectionsCsv,
      customersCsv: payload.customersCsv,
    },
  });
}
