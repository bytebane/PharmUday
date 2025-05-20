/*
  Warnings:

  - You are about to drop the column `issuedDate` on the `Invoice` table. All the data in the column will be lost.
  - The `invoiceNumber` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "issuedDate",
DROP COLUMN "invoiceNumber",
ADD COLUMN     "invoiceNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
