-- Each person can add their own (encrypted) Anthropic key for the AI coach.
ALTER TABLE "User" ADD COLUMN "anthropicApiKey" TEXT;
