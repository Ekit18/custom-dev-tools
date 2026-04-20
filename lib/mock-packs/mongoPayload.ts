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

export async function upsertMockPackPayload(
  packId: string,
  payload: MockPackCsvPayload,
): Promise<void> {
  await prismaMongo.mockPackPayload.upsert({
    where: { packId },
    create: {
      packId,
      productsCsv: payload.productsCsv,
      collectionsCsv: payload.collectionsCsv,
      customersCsv: payload.customersCsv,
    },
    update: {
      productsCsv: payload.productsCsv,
      collectionsCsv: payload.collectionsCsv,
      customersCsv: payload.customersCsv,
    },
  });
}
