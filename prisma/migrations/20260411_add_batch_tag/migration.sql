-- AlterTable: agregar columna batch_tag a scraper.places
ALTER TABLE "scraper"."places" ADD COLUMN IF NOT EXISTS "batch_tag" TEXT;
