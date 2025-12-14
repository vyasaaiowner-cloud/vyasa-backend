/*
  Warnings:

  - You are about to drop the column `phone` on the `Otp` table. All the data in the column will be lost.
  - Added the required column `contact` to the `Otp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Otp_phone_idx";

-- AlterTable
ALTER TABLE "Otp" DROP COLUMN "phone",
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Otp_contact_idx" ON "Otp"("contact");
