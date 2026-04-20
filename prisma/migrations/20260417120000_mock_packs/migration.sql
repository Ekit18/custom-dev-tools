-- CreateEnum
CREATE TYPE "MockPackSource" AS ENUM ('UPLOADED', 'BUILT_IN');

-- CreateEnum
CREATE TYPE "MockPackStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MockDriveFileRole" AS ENUM ('PRODUCTS', 'COLLECTIONS', 'CUSTOMERS', 'BUNDLE_ZIP');

-- CreateEnum
CREATE TYPE "MockGenerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "MockDataPack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "MockPackSource" NOT NULL,
    "status" "MockPackStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "productsCsv" TEXT NOT NULL,
    "collectionsCsv" TEXT NOT NULL,
    "customersCsv" TEXT NOT NULL,
    "productRowCount" INTEGER NOT NULL DEFAULT 0,
    "collectionRowCount" INTEGER NOT NULL DEFAULT 0,
    "customerRowCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockDataPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockPackDriveFile" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "role" "MockDriveFileRole" NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockPackDriveFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockGenerationJob" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "requestedProductCount" INTEGER NOT NULL,
    "status" "MockGenerationJobStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MockGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockDataPack_slug_key" ON "MockDataPack"("slug");

-- CreateIndex
CREATE INDEX "MockGenerationJob_storeId_status_idx" ON "MockGenerationJob"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MockPackDriveFile_packId_role_key" ON "MockPackDriveFile"("packId", "role");

-- AddForeignKey
ALTER TABLE "MockDataPack" ADD CONSTRAINT "MockDataPack_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPackDriveFile" ADD CONSTRAINT "MockPackDriveFile_packId_fkey" FOREIGN KEY ("packId") REFERENCES "MockDataPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGenerationJob" ADD CONSTRAINT "MockGenerationJob_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockGenerationJob" ADD CONSTRAINT "MockGenerationJob_packId_fkey" FOREIGN KEY ("packId") REFERENCES "MockDataPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
