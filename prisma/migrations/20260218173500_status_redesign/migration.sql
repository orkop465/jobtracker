-- Rename legacy statuses to the new canonical names.
ALTER TYPE "ApplicationStatus" RENAME VALUE 'SCREEN' TO 'RECRUITER_SCREEN';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'INTERVIEW' TO 'INTERVIEW_ROUND_1';

-- Add the new statuses needed by the redesigned recruiting flow.
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'OA';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_ROUND_2';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_ROUND_3';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'GHOSTED';
