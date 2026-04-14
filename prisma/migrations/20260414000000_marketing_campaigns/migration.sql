-- Marketing campaigns migration
-- Extends ProspectList into optional campaigns, adds pipeline stage to items,
-- links activities to campaigns, and introduces message templates.

-- ProspectList: campaign fields + updated_at
ALTER TABLE "scraper"."prospect_lists"
  ADD COLUMN "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "is_campaign"      BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "channel"          TEXT,
  ADD COLUMN "status"           TEXT         NOT NULL DEFAULT 'draft',
  ADD COLUMN "goal"             TEXT,
  ADD COLUMN "message_template" JSONB,
  ADD COLUMN "scheduled_at"     TIMESTAMP(3),
  ADD COLUMN "started_at"       TIMESTAMP(3),
  ADD COLUMN "ended_at"         TIMESTAMP(3);

-- Backfill legacy lists as archived non-campaigns
UPDATE "scraper"."prospect_lists"
  SET "status" = 'archived',
      "is_campaign" = false
  WHERE "status" = 'draft';

-- ProspectListItem: pipeline stage tracking
ALTER TABLE "scraper"."prospect_list_items"
  ADD COLUMN "stage"             TEXT NOT NULL DEFAULT 'queued',
  ADD COLUMN "last_contacted_at" TIMESTAMP(3),
  ADD COLUMN "reply_at"          TIMESTAMP(3),
  ADD COLUMN "outcome"           TEXT,
  ADD COLUMN "next_action_at"    TIMESTAMP(3);

CREATE INDEX "prospect_list_items_list_id_stage_idx"
  ON "scraper"."prospect_list_items"("list_id", "stage");

-- PlaceActivity: link to campaign + step index
ALTER TABLE "scraper"."place_activities"
  ADD COLUMN "campaign_id" TEXT,
  ADD COLUMN "step_index"  INTEGER;

CREATE INDEX "place_activities_campaign_id_happened_at_idx"
  ON "scraper"."place_activities"("campaign_id", "happened_at" DESC);

-- MessageTemplate: reusable copy library
CREATE TABLE "scraper"."message_templates" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "channel"     TEXT        NOT NULL,
  "subject"     TEXT,
  "body"        TEXT        NOT NULL,
  "variables"   JSONB,
  "framework"   TEXT,
  "tone"        TEXT,
  "performance" JSONB,
  "owner_id"    INTEGER     NOT NULL,
  "company_id"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_templates_owner_id_idx"   ON "scraper"."message_templates"("owner_id");
CREATE INDEX "message_templates_company_id_idx" ON "scraper"."message_templates"("company_id");
