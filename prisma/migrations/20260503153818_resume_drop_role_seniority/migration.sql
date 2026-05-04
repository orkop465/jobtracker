-- Drop unused tagging columns from Resume.
-- Marketplace submissions collect role + seniority on the marketplace submit
-- form instead, so private resumes don't need these columns.
ALTER TABLE "Resume" DROP COLUMN "roleCategory";
ALTER TABLE "Resume" DROP COLUMN "seniority";
