-- DropForeignKey
ALTER TABLE "MockPackDriveFile" DROP CONSTRAINT "MockPackDriveFile_packId_fkey";

-- DropTable
DROP TABLE IF EXISTS "MockPackDriveFile";

-- DropEnum
DROP TYPE IF EXISTS "MockDriveFileRole";

-- AlterTable
ALTER TABLE "MockDataPack" DROP COLUMN "productsCsv";
ALTER TABLE "MockDataPack" DROP COLUMN "collectionsCsv";
ALTER TABLE "MockDataPack" DROP COLUMN "customersCsv";
