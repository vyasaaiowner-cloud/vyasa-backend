-- CreateTable
CREATE TABLE "SectionAttendanceRecord" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "schoolId" TEXT NOT NULL,
    "markedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionAttendanceRecord_schoolId_date_idx" ON "SectionAttendanceRecord"("schoolId", "date");

-- CreateIndex
CREATE INDEX "SectionAttendanceRecord_sectionId_date_idx" ON "SectionAttendanceRecord"("sectionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SectionAttendanceRecord_sectionId_date_schoolId_key" ON "SectionAttendanceRecord"("sectionId", "date", "schoolId");

-- AddForeignKey
ALTER TABLE "SectionAttendanceRecord" ADD CONSTRAINT "SectionAttendanceRecord_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionAttendanceRecord" ADD CONSTRAINT "SectionAttendanceRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
