export interface BoardColumnType {
  id: string;
  name: string;
  position: number;
  mappedStatus: string | null;
  color: string | null;
  applicationCount: number;
}

export interface KanbanApplication {
  id: string;
  company: string;
  roleTitle: string;
  status: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
  boardColumnId: string | null;
  position: number;
  priority: string | null;
  location: string | null;
  source: string | null;
  jobUrl: string | null;
  resumeId: string | null;
  resume: { id: string; label: string } | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactLinkedIn: string | null;
  notes: string | null;
  jobDescription: string | null;
  nextFollowUp: string | null;
}
