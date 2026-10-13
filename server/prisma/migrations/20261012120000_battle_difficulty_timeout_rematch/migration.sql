-- AlterEnum
ALTER TYPE "BattleEndReason" ADD VALUE 'TIMEOUT';

-- AlterTable
ALTER TABLE "BattleRoom" ADD COLUMN     "difficulty" "ProblemDifficulty",
ADD COLUMN     "durationMs" INTEGER NOT NULL DEFAULT 1800000,
ADD COLUMN     "rematchCode" TEXT;
