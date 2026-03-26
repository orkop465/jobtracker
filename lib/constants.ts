import type { ApplicationStatus } from "@prisma/client";

export const STATUS_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "RECRUITER_SCREEN", label: "Recruiter Screen" },
  { value: "OA", label: "OA" },
  { value: "INTERVIEW_ROUND_1", label: "Round 1" },
  { value: "INTERVIEW_ROUND_2", label: "Round 2" },
  { value: "INTERVIEW_ROUND_3", label: "Final Round" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "GHOSTED", label: "Ghosted" },
] as const;

export const SOURCE_OPTIONS = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "INDEED", label: "Indeed" },
  { value: "GLASSDOOR", label: "Glassdoor" },
  { value: "COMPANY_WEBSITE", label: "Company Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "RECRUITER_OUTREACH", label: "Recruiter Outreach" },
  { value: "JOB_BOARD", label: "Job Board" },
  { value: "CAREER_FAIR", label: "Career Fair" },
  { value: "OTHER", label: "Other" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
  { value: "JPY", label: "JPY" },
  { value: "INR", label: "INR" },
] as const;

export function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found?.label ?? status;
}

export function sourceLabel(source: string): string {
  const found = SOURCE_OPTIONS.find((s) => s.value === source);
  return found?.label ?? source;
}

export function priorityLabel(priority: string): string {
  const found = PRIORITY_OPTIONS.find((s) => s.value === priority);
  return found?.label ?? priority;
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return status === "REJECTED" || status === "WITHDRAWN" || status === "GHOSTED";
}

export function isScreenStatus(status: ApplicationStatus): boolean {
  return status === "RECRUITER_SCREEN" || status === "OA";
}

export function isInterviewStatus(status: ApplicationStatus): boolean {
  return (
    status === "INTERVIEW_ROUND_1" ||
    status === "INTERVIEW_ROUND_2" ||
    status === "INTERVIEW_ROUND_3"
  );
}

export function isOfferStatus(status: ApplicationStatus): boolean {
  return status === "OFFER";
}

export function maxStageRank(status: ApplicationStatus): number {
  if (isOfferStatus(status)) return 4;
  if (isInterviewStatus(status)) return 3;
  if (isScreenStatus(status)) return 2;
  return 1;
}
