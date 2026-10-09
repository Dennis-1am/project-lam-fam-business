/*
  Warnings:

  - Added the required column `bannerId` to the `SiteBannerTranslation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteBannerTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bannerId" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiteBannerTranslation_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "SiteBanner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SiteBannerTranslation" ("eyebrow", "id", "language", "title", "updatedAt") SELECT "eyebrow", "id", "language", "title", "updatedAt" FROM "SiteBannerTranslation";
DROP TABLE "SiteBannerTranslation";
ALTER TABLE "new_SiteBannerTranslation" RENAME TO "SiteBannerTranslation";
CREATE INDEX "SiteBannerTranslation_bannerId_idx" ON "SiteBannerTranslation"("bannerId");
CREATE UNIQUE INDEX "SiteBannerTranslation_language_key" ON "SiteBannerTranslation"("language");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
