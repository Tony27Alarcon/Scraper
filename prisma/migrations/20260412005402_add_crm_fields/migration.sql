-- AlterTable
ALTER TABLE "scraper"."places" ADD COLUMN     "lead_score" INTEGER,
ADD COLUMN     "lead_temperature" TEXT;

-- CreateTable
CREATE TABLE "scraper"."place_favorites" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."place_reactions" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."place_notes" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "username" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_favorites_place_id_user_id_key" ON "scraper"."place_favorites"("place_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_reactions_place_id_user_id_emoji_key" ON "scraper"."place_reactions"("place_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "scraper"."place_favorites" ADD CONSTRAINT "place_favorites_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "scraper"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_favorites" ADD CONSTRAINT "place_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scraper"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_reactions" ADD CONSTRAINT "place_reactions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "scraper"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_reactions" ADD CONSTRAINT "place_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scraper"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_notes" ADD CONSTRAINT "place_notes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "scraper"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."place_notes" ADD CONSTRAINT "place_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scraper"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
