-- AlterTable
ALTER TABLE "scraper"."users" ADD COLUMN     "company_id" TEXT;

-- CreateTable
CREATE TABLE "scraper"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "website" TEXT,
    "ai_context" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."prospect_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."prospect_list_items" (
    "id" SERIAL NOT NULL,
    "list_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "rank" INTEGER,
    "reason" TEXT,

    CONSTRAINT "prospect_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospect_list_items_list_id_place_id_key" ON "scraper"."prospect_list_items"("list_id", "place_id");

-- AddForeignKey
ALTER TABLE "scraper"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "scraper"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."prospect_lists" ADD CONSTRAINT "prospect_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "scraper"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."prospect_list_items" ADD CONSTRAINT "prospect_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "scraper"."prospect_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."prospect_list_items" ADD CONSTRAINT "prospect_list_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "scraper"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
