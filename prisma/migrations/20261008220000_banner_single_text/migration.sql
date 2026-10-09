-- Collapse the banner copy to a single optional `text` field and drop the
-- `enabled` flag. SQLite can rename/drop columns in place, so the existing
-- `title` values become `text` (eyebrow copy is intentionally discarded) and
-- every row keeps its data.

-- SiteBanner: drop the show/hide flag, add the machine-translation source.
ALTER TABLE "SiteBanner" DROP COLUMN "enabled";
ALTER TABLE "SiteBanner" ADD COLUMN "sourceLanguage" TEXT NOT NULL DEFAULT 'en';

-- SiteBannerTranslation: `title` becomes `text`, eyebrow is dropped, and the
-- manual/auto flag mirrors ProductTranslation.titleManual.
ALTER TABLE "SiteBannerTranslation" RENAME COLUMN "title" TO "text";
ALTER TABLE "SiteBannerTranslation" DROP COLUMN "eyebrow";
ALTER TABLE "SiteBannerTranslation" ADD COLUMN "textManual" BOOLEAN NOT NULL DEFAULT false;
