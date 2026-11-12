-- Billable employees store a Delivery Owner selected from the client's owners.
ALTER TABLE "candidates" ADD COLUMN "delivery_owner_user_id" UUID;

CREATE INDEX "candidates_delivery_owner_user_id_idx" ON "candidates"("delivery_owner_user_id");

ALTER TABLE "candidates"
  ADD CONSTRAINT "candidates_delivery_owner_user_id_fkey"
  FOREIGN KEY ("delivery_owner_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from each billable employee's client Delivery Owners (oldest ownership first).
UPDATE "candidates" AS c
SET "delivery_owner_user_id" = o."user_id"
FROM (
  SELECT DISTINCT ON ("client_id") "client_id", "user_id"
  FROM "client_ownerships"
  WHERE "ownership_role" = 'DELIVERY_OWNER'
  ORDER BY "client_id", "created_at" ASC
) AS o
WHERE c."client_id" = o."client_id"
  AND c."category" = 'BILLABLE'
  AND c."deleted_at" IS NULL
  AND c."delivery_owner_user_id" IS NULL;

-- Also ensure Account Owner is set when missing for billable employees.
UPDATE "candidates" AS c
SET "account_manager_user_id" = o."user_id"
FROM (
  SELECT DISTINCT ON ("client_id") "client_id", "user_id"
  FROM "client_ownerships"
  WHERE "ownership_role" = 'ACCOUNT_OWNER'
  ORDER BY "client_id", "created_at" ASC
) AS o
WHERE c."client_id" = o."client_id"
  AND c."category" = 'BILLABLE'
  AND c."deleted_at" IS NULL
  AND c."account_manager_user_id" IS NULL;
