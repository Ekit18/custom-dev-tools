import { PrismaClient } from "@prisma/mongo-client";

const globalForMongo = globalThis as unknown as {
  prismaMongo: PrismaClient | undefined;
};

export const prismaMongo =
  globalForMongo.prismaMongo ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForMongo.prismaMongo = prismaMongo;
}
