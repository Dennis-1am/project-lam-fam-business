-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "tagId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("createdAt", "id", "priceCents", "sourceLanguage", "tagId", "updatedAt") SELECT "createdAt", "id", "priceCents", "sourceLanguage", "tagId", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "Product_tagId_idx" ON "Product"("tagId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
