-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scraper";

-- CreateTable
CREATE TABLE "scraper"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."places" (
    "id" TEXT NOT NULL,
    "input_id" TEXT,
    "link" TEXT,
    "title" TEXT,
    "category" TEXT,
    "address" TEXT,
    "open_hours" JSONB,
    "popular_times" JSONB,
    "website" TEXT,
    "phone" TEXT,
    "plus_code" TEXT,
    "review_count" INTEGER,
    "review_rating" DECIMAL(3,1),
    "reviews_per_rating" JSONB,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "cid" TEXT,
    "status" TEXT,
    "descriptions" TEXT,
    "reviews_link" TEXT,
    "thumbnail" TEXT,
    "timezone" TEXT,
    "price_range" TEXT,
    "data_id" TEXT,
    "place_id" TEXT,
    "images" JSONB,
    "reservations" JSONB,
    "order_online" JSONB,
    "menu" JSONB,
    "owner" JSONB,
    "complete_address" JSONB,
    "about" JSONB,
    "user_reviews" JSONB,
    "user_reviews_extended" JSONB,
    "emails" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "scraper"."users"("email");
