-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerReference" TEXT,
ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "dueDate" TEXT,
ADD COLUMN     "html" TEXT,
ADD COLUMN     "supplyDate" TEXT,
ADD COLUMN     "validationReport" TEXT,
ADD COLUMN     "xml" TEXT;

-- CreateTable
CREATE TABLE "SellerSettings" (
    "id" TEXT NOT NULL DEFAULT 'fonitas',
    "details" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("year")
);

