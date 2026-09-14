-- Rename Role enum values to Owner roles
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DELIVERY_OWNER', 'ACCOUNT_OWNER');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE
    WHEN "role"::text = 'DELIVERY_MANAGER' THEN 'DELIVERY_OWNER'::"Role_new"
    WHEN "role"::text = 'ACCOUNT_MANAGER' THEN 'ACCOUNT_OWNER'::"Role_new"
    ELSE "role"::text::"Role_new"
  END
);

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Client ownership (many-to-many for Delivery Owner and Account Owner)
CREATE TYPE "ClientOwnershipRole" AS ENUM ('DELIVERY_OWNER', 'ACCOUNT_OWNER');

CREATE TABLE "client_ownerships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ownership_role" "ClientOwnershipRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_ownerships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_ownerships_client_id_user_id_ownership_role_key" ON "client_ownerships"("client_id", "user_id", "ownership_role");
CREATE INDEX "client_ownerships_organization_id_user_id_idx" ON "client_ownerships"("organization_id", "user_id");
CREATE INDEX "client_ownerships_client_id_ownership_role_idx" ON "client_ownerships"("client_id", "ownership_role");

ALTER TABLE "client_ownerships" ADD CONSTRAINT "client_ownerships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_ownerships" ADD CONSTRAINT "client_ownerships_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_ownerships" ADD CONSTRAINT "client_ownerships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
