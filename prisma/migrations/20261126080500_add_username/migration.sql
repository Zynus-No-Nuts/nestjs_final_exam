-- AlterTable: add nullable username first to preserve existing users
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing users safely
UPDATE "users"
SET "username" = CASE
  WHEN "email" = 'admin@ecommerce.local' THEN 'admin'
  WHEN "email" = 'customer@ecommerce.local' THEN 'customer'
  ELSE lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_.]', '', 'g')) || '_' || substr("id", 1, 4)
END
WHERE "username" IS NULL;

-- Make username NOT NULL and create unique index
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
