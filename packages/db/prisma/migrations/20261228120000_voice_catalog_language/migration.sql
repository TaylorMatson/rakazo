-- Additive: older releases never read or write it.
ALTER TABLE "space_voice_preferences" ADD COLUMN "catalogLanguage" TEXT;
ALTER TABLE "user_voice_preferences" ADD COLUMN "catalogLanguage" TEXT;
