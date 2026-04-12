-- CreateTable
CREATE TABLE "scraper"."place_activities" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "username" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "happened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_activities_place_id_happened_at_idx" ON "scraper"."place_activities"("place_id", "happened_at" DESC);

-- AddForeignKey
ALTER TABLE "scraper"."place_activities" ADD CONSTRAINT "place_activities_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "scraper"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_activities" ADD CONSTRAINT "place_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scraper"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
