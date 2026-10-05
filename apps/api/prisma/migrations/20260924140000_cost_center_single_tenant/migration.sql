-- Cost Center + merge Agyom tenant into BrickRed company org

-- 1) Add nullable columns
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cost_center" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "cost_center" TEXT;

-- 2) Backfill from organization slug
UPDATE "clients" c
SET "cost_center" = UPPER(o."slug")
FROM "organizations" o
WHERE c."organization_id" = o."id" AND c."cost_center" IS NULL;

UPDATE "candidates" cand
SET "cost_center" = UPPER(o."slug")
FROM "organizations" o
WHERE cand."organization_id" = o."id" AND cand."cost_center" IS NULL;

UPDATE "clients" SET "cost_center" = 'BRICKRED' WHERE "cost_center" IS NULL;
UPDATE "candidates" SET "cost_center" = 'BRICKRED' WHERE "cost_center" IS NULL;

-- 3) Merge Agyom → BrickRed
-- BrickRed: 11111111-1111-1111-1111-111111111111
-- Agyom:    22222222-2222-2222-2222-222222222222

-- Remap FKs from duplicate Agyom users → BrickRed users (same email), then delete Agyom dupes
UPDATE "candidates" c
SET "released_by_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE c."released_by_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "candidates" c
SET "account_manager_user_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE c."account_manager_user_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "leaves" l
SET "requested_by_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE l."requested_by_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "leaves" l
SET "approver_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE l."approver_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "timesheets" t
SET "approved_by_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE t."approved_by_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "invoices" i
SET "generated_by_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE i."generated_by_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "invoices" i
SET "reviewed_by_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE i."reviewed_by_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "delivery_reviews" d
SET "reviewer_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE d."reviewer_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

UPDATE "audit_logs" al
SET "actor_user_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE al."actor_user_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

-- Drop Agyom ownerships that would collide after user remap; then remap remaining
DELETE FROM "client_ownerships" co
USING "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE co."user_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
  AND EXISTS (
    SELECT 1 FROM "client_ownerships" x
    WHERE x."client_id" = co."client_id"
      AND x."user_id" = b."id"
      AND x."ownership_role" = co."ownership_role"
  );

UPDATE "client_ownerships" co
SET "user_id" = b."id"
FROM "users" a
JOIN "users" b ON lower(a."email") = lower(b."email")
WHERE co."user_id" = a."id"
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

DELETE FROM "refresh_tokens"
WHERE "user_id" IN (
  SELECT a."id" FROM "users" a
  INNER JOIN "users" b ON lower(a."email") = lower(b."email")
  WHERE a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
    AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
);

DELETE FROM "users" a
USING "users" b
WHERE lower(a."email") = lower(b."email")
  AND a."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid;

-- Suffix colliding public IDs / client identifiers before reassignment
UPDATE "candidates" c
SET "public_id" = c."public_id" || '-AG'
WHERE c."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "candidates" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."public_id" = c."public_id"
  );

UPDATE "leaves" l
SET "public_id" = l."public_id" || '-AG'
WHERE l."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "leaves" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."public_id" = l."public_id"
  );

UPDATE "timesheets" t
SET "public_id" = t."public_id" || '-AG'
WHERE t."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "timesheets" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."public_id" = t."public_id"
  );

UPDATE "invoices" i
SET "public_id" = i."public_id" || '-AG'
WHERE i."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "invoices" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."public_id" = i."public_id"
  );

UPDATE "delivery_reviews" d
SET "public_id" = d."public_id" || '-AG'
WHERE d."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "delivery_reviews" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."public_id" = d."public_id"
  );

UPDATE "clients" c
SET "code" = COALESCE(c."code", 'CL') || '-AG'
WHERE c."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND c."code" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "clients" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."code" = c."code"
  );

UPDATE "clients" c
SET "name_normalized" = c."name_normalized" || '-ag',
    "name" = c."name" || ' (Agyom)'
WHERE c."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND EXISTS (
    SELECT 1 FROM "clients" b
    WHERE b."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
      AND b."name_normalized" = c."name_normalized"
  );

UPDATE "users" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "clients" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "client_ownerships" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "candidates" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "leaves" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "timesheets" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "invoices" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "delivery_reviews" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "audit_logs" SET "organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

UPDATE "id_sequences" br
SET "next_value" = GREATEST(br."next_value", ag."next_value")
FROM "id_sequences" ag
WHERE br."organization_id" = '11111111-1111-1111-1111-111111111111'::uuid
  AND ag."organization_id" = '22222222-2222-2222-2222-222222222222'::uuid
  AND br."prefix" = ag."prefix";

DELETE FROM "id_sequences"
WHERE "organization_id" = '22222222-2222-2222-2222-222222222222'::uuid;

DELETE FROM "organizations"
WHERE "id" = '22222222-2222-2222-2222-222222222222'::uuid;

ALTER TABLE "clients" ALTER COLUMN "cost_center" SET NOT NULL;
ALTER TABLE "candidates" ALTER COLUMN "cost_center" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "clients_organization_id_cost_center_idx"
  ON "clients"("organization_id", "cost_center");
CREATE INDEX IF NOT EXISTS "candidates_organization_id_cost_center_idx"
  ON "candidates"("organization_id", "cost_center");
