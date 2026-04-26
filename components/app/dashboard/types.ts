export interface DashboardStats {
  responseRate: number;
  inFlight: number;
  onsites: number;
  offersPending: number;
  totalApplications: number;
}

export interface FollowUpItem {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  urgency: "overdue" | "today" | "soon" | "later";
  applicationId: string;
  company: string;
  roleTitle: string;
}

export interface InterviewItem {
  id: string;
  title: string;
  scheduledAt: string;
  type: string;
  durationMin: number | null;
  location: string | null;
  applicationId: string;
  company: string;
  roleTitle: string;
}

export interface StalledItem {
  id: string;
  company: string;
  roleTitle: string;
  status: string;
  statusLabel: string;
  daysSinceUpdate: number;
}

export interface ActivityItem {
  id: string;
  kind: "move" | "add" | "note" | "reminder";
  company: string;
  roleTitle: string;
  fromStatus: string | null;
  toStatus: string | null;
  occurredAt: string;
  text: string;
}

export interface VelocityPoint {
  weekLabel: string;
  count: number;
}

export interface MonthlyActivityPoint {
  weekLabel: string;
  applied: number;
  responded: number;
}

export interface InsightData {
  type: string;
  message: string;
  cta?: string;
}

export interface DashboardData {
  userName: string | null;
  stats: DashboardStats;
  followUps: FollowUpItem[];
  interviews: InterviewItem[];
  stalledApps: StalledItem[];
  recentActivity: ActivityItem[];
  velocity: VelocityPoint[];
  monthlyActivity: MonthlyActivityPoint[];
  weeklyGoal: number | null;
  thisWeekApplied: number;
  insight: InsightData | null;
}
