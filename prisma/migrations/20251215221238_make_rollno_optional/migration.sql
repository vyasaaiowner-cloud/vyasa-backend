-- DropIndex
DROP INDEX "Student_schoolId_sectionId_rollNo_key";

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "rollNo" DROP NOT NULL;
