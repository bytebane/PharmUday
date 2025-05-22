/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_userId_key" ON "Supplier"("userId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
