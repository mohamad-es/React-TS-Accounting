-- CreateTable
CREATE TABLE "Accrual" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractVersion" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accrual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accrual_paymentId_contractId_key" ON "Accrual"("paymentId", "contractId");

