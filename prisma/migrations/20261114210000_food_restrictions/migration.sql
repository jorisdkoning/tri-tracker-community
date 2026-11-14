-- Replace the single low-FODMAP switch with a personal list of food restrictions.
ALTER TABLE "User" ADD COLUMN "foodRestrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "User" SET "foodRestrictions" = ARRAY['fodmap'] WHERE "showFodmap" = true;
ALTER TABLE "User" DROP COLUMN "showFodmap";
