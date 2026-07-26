-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'READY', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "BattleRoom" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "hostId" TEXT NOT NULL,
    "selectedProblemId" TEXT,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleRoomPlayer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleRoomPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleRoom_roomCode_key" ON "BattleRoom"("roomCode");

-- CreateIndex
CREATE INDEX "BattleRoom_hostId_idx" ON "BattleRoom"("hostId");

-- CreateIndex
CREATE INDEX "BattleRoom_selectedProblemId_idx" ON "BattleRoom"("selectedProblemId");

-- CreateIndex
CREATE INDEX "BattleRoomPlayer_roomId_idx" ON "BattleRoomPlayer"("roomId");

-- CreateIndex
CREATE INDEX "BattleRoomPlayer_userId_idx" ON "BattleRoomPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleRoomPlayer_roomId_userId_key" ON "BattleRoomPlayer"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_selectedProblemId_fkey" FOREIGN KEY ("selectedProblemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoomPlayer" ADD CONSTRAINT "BattleRoomPlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BattleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoomPlayer" ADD CONSTRAINT "BattleRoomPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
