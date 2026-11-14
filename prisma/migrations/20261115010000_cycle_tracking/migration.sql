-- CreateTable
CREATE TABLE "CyclePeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CyclePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CyclePeriod_userId_startDate_key" ON "CyclePeriod"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "CyclePeriod" ADD CONSTRAINT "CyclePeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

