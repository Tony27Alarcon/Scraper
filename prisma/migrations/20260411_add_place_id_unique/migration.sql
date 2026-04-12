-- AddUniqueConstraint: place_id en scraper.places
CREATE UNIQUE INDEX IF NOT EXISTS "places_place_id_key" ON "scraper"."places"("place_id");
