/*
  Warnings:

  - Added the required column `deviceId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "deviceInfo" JSONB;

-- CreateIndex
CREATE INDEX "RefreshToken_userId_deviceId_idx" ON "RefreshToken"("userId", "deviceId");
