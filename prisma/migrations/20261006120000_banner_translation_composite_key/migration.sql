-- Drop the single-language unique index and replace it with one scoped to the
-- banner row, so translations are keyed by (bannerId, language). The banner is
-- a singleton today, but a global unique on `language` would make a second
-- banner impossible and is what the upsert's composite key now matches.
DROP INDEX "SiteBannerTranslation_language_key";

CREATE UNIQUE INDEX "SiteBannerTranslation_bannerId_language_key" ON "SiteBannerTranslation"("bannerId", "language");