-- Add per-user workflow state after the shared User and Gig tables exist.
CREATE TABLE "UserGig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "proposal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserGig_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGig_gigId_fkey"
      FOREIGN KEY ("gigId") REFERENCES "Gig"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserGig_userId_gigId_key"
    ON "UserGig"("userId", "gigId");

CREATE INDEX "UserGig_userId_idx"
    ON "UserGig"("userId");

CREATE INDEX "UserGig_gigId_idx"
    ON "UserGig"("gigId");
