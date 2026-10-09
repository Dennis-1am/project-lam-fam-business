-- CreateTable
CREATE TABLE "SiteBanner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "cropX" REAL,
    "cropY" REAL,
    "cropWidth" REAL,
    "cropHeight" REAL,
    "cropAspect" REAL,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteBannerTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "language" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteBannerTranslation_language_key" ON "SiteBannerTranslation"("language");
