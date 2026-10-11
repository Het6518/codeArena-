-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BattleEndReason" AS ENUM ('SOLVED', 'DRAW', 'FORFEIT');

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'INTERNAL_ERROR';

-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'FINISHED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "battleRoomId" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "executionTimeMs" INTEGER,
ADD COLUMN     "memoryKb" INTEGER,
ADD COLUMN     "passedTestCases" INTEGER,
ADD COLUMN     "totalTestCases" INTEGER;

-- AlterTable
ALTER TABLE "BattleRoom" ADD COLUMN     "endReason" "BattleEndReason",
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "winnerId" TEXT;

-- AlterTable
ALTER TABLE "BattleRoomPlayer" ADD COLUMN     "ratingAfter" INTEGER,
ADD COLUMN     "ratingBefore" INTEGER,
ADD COLUMN     "solveTimeMs" INTEGER,
ADD COLUMN     "solvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Submission_battleRoomId_idx" ON "Submission"("battleRoomId");

-- CreateIndex
CREATE INDEX "BattleRoom_winnerId_idx" ON "BattleRoom"("winnerId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_battleRoomId_fkey" FOREIGN KEY ("battleRoomId") REFERENCES "BattleRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
