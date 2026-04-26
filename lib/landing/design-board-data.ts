/* ======================================================================
   Board constants — edit these to change companies, roles, colors,
   stages, tags, salaries, and notes across the entire landing page.
   Shared by desktop demo board, auth mini-board, and mobile card journey.
   ====================================================================== */

/* ── Desktop board templates ── */

export interface BoardTemplate {
  company: string;
  role: string;
  resume: string;
  color: string;
}

export const BOARD_TEMPLATES: readonly BoardTemplate[] = [
  { company: 'Anthropic',  role: 'ML Engineer',             resume: 'resume_ml_v4.pdf',         color: 'oklch(0.55 0.12 35)' },
  { company: 'Figma',      role: 'Staff Product Designer',  resume: 'resume_design_v3.pdf',     color: 'oklch(0.62 0.18 25)' },
  { company: 'Linear',     role: 'Sr. Backend Engineer',    resume: 'resume_backend_v2.pdf',    color: 'oklch(0.45 0.10 280)' },
  { company: 'Stripe',     role: 'Data Scientist',          resume: 'resume_ds_v3.pdf',         color: 'oklch(0.55 0.15 275)' },
  { company: 'Vercel',     role: 'DevEx Engineer',          resume: 'resume_dx_v2.pdf',         color: 'oklch(0.25 0.01 60)' },
  { company: 'Notion',     role: 'Frontend Engineer',       resume: 'resume_frontend_v4.pdf',   color: 'oklch(0.30 0.01 60)' },
  { company: 'Ramp',       role: 'Senior SRE',              resume: 'resume_infra_v3.pdf',      color: 'oklch(0.60 0.15 150)' },
  { company: 'Arc',        role: 'Growth PM',               resume: 'resume_pm_v2.pdf',         color: 'oklch(0.50 0.12 220)' },
  { company: 'Scale AI',   role: 'Design Engineer',         resume: 'resume_design_v2.pdf',     color: 'oklch(0.55 0.14 255)' },
  { company: 'Replit',     role: 'Senior PM',               resume: 'resume_pm_v3.pdf',         color: 'oklch(0.55 0.12 30)' },
  { company: 'Plaid',      role: 'Staff SWE',               resume: 'resume_fullstack_v4.pdf',  color: 'oklch(0.55 0.12 40)' },
  { company: 'Retool',     role: 'DevRel Lead',             resume: 'resume_devrel_v2.pdf',     color: 'oklch(0.50 0.15 265)' },
  { company: 'Monzo',      role: 'Platform Engineer',       resume: 'resume_infra_v2.pdf',      color: 'oklch(0.55 0.14 15)' },
  { company: 'Dagster',    role: 'Data Engineer',           resume: 'resume_data_v3.pdf',       color: 'oklch(0.48 0.12 180)' },
  { company: 'Cursor',     role: 'Full Stack',              resume: 'resume_fullstack_v2.pdf',  color: 'oklch(0.40 0.08 60)' },
  { company: 'Pylon',      role: 'Backend Eng',             resume: 'resume_backend_v4.pdf',    color: 'oklch(0.52 0.10 300)' },
  { company: 'Datadog',    role: 'Infra Eng',               resume: 'resume_infra_v3.pdf',      color: 'oklch(0.55 0.15 280)' },
  { company: 'Supabase',   role: 'Eng',                     resume: 'resume_general_v2.pdf',    color: 'oklch(0.55 0.15 150)' },
];

/** Fallback color when company not in templates */
export const BOARD_DEFAULT_COLOR = 'oklch(0.4 0.05 60)';

/** Build a company → color lookup from BOARD_TEMPLATES */
export const BOARD_COMPANY_COLORS: Record<string, string> = Object.fromEntries(
  BOARD_TEMPLATES.map(t => [t.company, t.color])
);

/* ── Demo board stage definitions ── */

export interface DemoStage {
  id: string;
  label: string;
  hint: string;
  accent: string;
}

export const DEMO_STAGES: readonly DemoStage[] = [
  { id: 'applied', label: 'Applied',      hint: 'Resume sent, waiting',    accent: 'var(--sky)' },
  { id: 'screen',  label: 'Phone Screen', hint: 'Recruiter + intro calls', accent: 'var(--amber)' },
  { id: 'onsite',  label: 'Onsite',       hint: 'Full interview loops',    accent: 'var(--lilac)' },
  { id: 'offer',   label: 'Offer',        hint: 'Negotiating terms',       accent: 'var(--accent)' },
];

/** Tags per stage — randomly picked when generating/adding cards */
export const DEMO_TAGS: Record<string, readonly string[]> = {
  applied: ['Applied', 'Referral', 'Direct'],
  screen:  ['Recruiter', 'Referral', 'Direct'],
  onsite:  ['Referral', 'Applied'],
  offer:   ['Referral'],
};

/** Notes per stage — randomly picked when generating/moving cards.
 *  Actual notes only; blank chance controlled by DEMO_NOTE_BLANK_CHANCE. */
export const DEMO_NOTES: Record<string, readonly string[]> = {
  applied: ['Warm intro', 'Referral from Alex', 'Cold apply', 'Recruiter reached out', 'Found on LinkedIn'],
  screen:  ['Follow up Thursday', 'Recruiter call went well', 'Asked for availability', 'Take-home sent', 'Waiting on scheduling'],
  onsite:  ['System design prep', 'Round 2 scheduled', 'Final round next wk', 'Panel with VP', 'Case study due Mon'],
  offer:   ['Negotiating base', 'Waiting on equity details', 'Verbal offer received', 'Comparing with Stripe', 'Start date TBD'],
};

/** Probability (0–1) that a card gets no note */
export const DEMO_NOTE_BLANK_CHANCE = 0.5;

/** Pick a random note for a stage, or blank based on DEMO_NOTE_BLANK_CHANCE */
export function pickDemoNote(stage: string): string {
  if (Math.random() < DEMO_NOTE_BLANK_CHANCE) return '';
  const notes = DEMO_NOTES[stage];
  if (!notes || notes.length === 0) return '';
  return notes[Math.floor(Math.random() * notes.length)];
}

/** Salary ranges shown on cards */
export const DEMO_SALARIES: readonly string[] = [
  '$180k \u2013 $220k', '$195k \u2013 $240k', '$200k \u2013 $250k',
  '$210k \u2013 $260k', '$220k \u2013 $280k', '$240k \u2013 $320k',
  '$260k \u2013 $340k',
];

/* ── Board types and utilities ── */

export type BoardStage = 'applied' | 'phone' | 'interview' | 'offer';

export interface BoardCard {
  id: number;
  co: string;
  title: string;
  resume: string;
  color: string;
  stage: BoardStage;
  tag: string | null;
}

export function boardShuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomStageDist(): BoardStage[] {
  const stages: BoardStage[] = ['applied', 'phone', 'interview', 'offer'];
  const totalCards = 6 + Math.floor(Math.random() * 5);
  const dist: BoardStage[] = ['applied', 'offer'];
  for (let i = 2; i < totalCards; i++) {
    dist.push(stages[Math.floor(Math.random() * stages.length)]);
  }
  return dist;
}

export function boardRandomTag(stage: BoardStage): string | null {
  if (stage === 'applied') return Math.random() < 0.35 ? (Math.random() < 0.5 ? 'new' : 'referral') : null;
  if (stage === 'interview') return Math.random() < 0.4 ? 'onsite' : null;
  return null;
}

/** Generate a random board — shuffles BOARD_TEMPLATES as whole rows */
export function generateRandomBoard(): BoardCard[] {
  const templates = boardShuffle(BOARD_TEMPLATES);
  const stages = randomStageDist();
  return stages.map((stage, i) => {
    const t = templates[i % templates.length];
    return {
      id: i + 1,
      co: t.company,
      title: t.role,
      resume: t.resume,
      color: t.color,
      stage,
      tag: boardRandomTag(stage),
    };
  });
}

/** Pick a random template — always returns a matched row */
export function boardRandomCard(): { co: string; title: string; resume: string; color: string } {
  const t = BOARD_TEMPLATES[Math.floor(Math.random() * BOARD_TEMPLATES.length)];
  return { co: t.company, title: t.role, resume: t.resume, color: t.color };
}

/* ======================================================================
   CARD JOURNEY — mobile animation constants
   Edit these to change what appears in the mobile card journey component.
   ====================================================================== */

/** Companies paired with roles and resume filenames.
 *  Each entry drives one "episode" in the card journey animation. */
export interface JourneyTemplate {
  company: string;
  role: string;
  resume: string;
}

export const JOURNEY_TEMPLATES: readonly JourneyTemplate[] = [
  { company: 'Linear',      role: 'Product Eng',    resume: 'resume_product_v3.pdf' },
  { company: 'Stripe',      role: 'Infra Eng',      resume: 'resume_infra_v2.pdf' },
  { company: 'Figma',       role: 'Design Eng',     resume: 'resume_design_v4.pdf' },
  { company: 'Vercel',      role: 'DX Eng',         resume: 'resume_dx_v2.pdf' },
  { company: 'Notion',      role: 'Full Stack',     resume: 'resume_fullstack_v3.pdf' },
  { company: 'Raycast',     role: 'iOS Eng',        resume: 'resume_ios_v2.pdf' },
  { company: 'Supabase',    role: 'Backend Eng',    resume: 'resume_backend_v4.pdf' },
  { company: 'Retool',      role: 'Full Stack',     resume: 'resume_fullstack_v3.pdf' },
  { company: 'Resend',      role: 'Eng',            resume: 'resume_general_v2.pdf' },
  { company: 'Sanity',      role: 'Eng',            resume: 'resume_general_v3.pdf' },
  { company: 'Cal.com',     role: 'Frontend Eng',   resume: 'resume_frontend_v4.pdf' },
  { company: 'Clerk',       role: 'Frontend Eng',   resume: 'resume_frontend_v2.pdf' },
  { company: 'Neon',        role: 'Infra Eng',      resume: 'resume_infra_v3.pdf' },
  { company: 'Browser Co',  role: 'Eng',            resume: 'resume_general_v2.pdf' },
  { company: 'Anthropic',   role: 'ML Eng',         resume: 'resume_ml_v4.pdf' },
  { company: 'OpenAI',      role: 'Eng',            resume: 'resume_general_v3.pdf' },
  { company: 'Coinbase',    role: 'Eng',            resume: 'resume_general_v2.pdf' },
  { company: 'Ramp',        role: 'Full Stack',     resume: 'resume_fullstack_v4.pdf' },
  { company: 'Mercury',     role: 'Backend',        resume: 'resume_backend_v3.pdf' },
  { company: 'Datadog',     role: 'Infra Eng',      resume: 'resume_infra_v2.pdf' },
  { company: 'GitHub',      role: 'Eng',            resume: 'resume_general_v4.pdf' },
  { company: 'Plausible',   role: 'Full Stack',     resume: 'resume_fullstack_v2.pdf' },
  { company: 'PostHog',     role: 'Eng',            resume: 'resume_general_v3.pdf' },
  { company: 'Sentry',      role: 'Eng',            resume: 'resume_general_v2.pdf' },
  { company: 'Replicate',   role: 'ML Eng',         resume: 'resume_ml_v3.pdf' },
  { company: 'Modal',       role: 'Infra',          resume: 'resume_infra_v4.pdf' },
  { company: 'Replit',      role: 'Eng',            resume: 'resume_general_v2.pdf' },
  { company: 'Liveblocks',  role: 'Frontend',       resume: 'resume_frontend_v3.pdf' },
  { company: 'Ably',        role: 'Infra',          resume: 'resume_infra_v2.pdf' },
];

/** Interviewer names shown during Screen stage */
export const JOURNEY_INTERVIEWERS = [
  'Priya S., EM', 'Marcus T., Staff', 'Lena K., EM', 'James O., VP',
  'Aisha R., Principal', 'Devon H., EM', 'Sofia M., Director',
  'Noah C., Staff', 'Zara P., EM', 'Kai L., Lead',
];

/** Scheduling dates for Screen/Onsite */
export const JOURNEY_DATES = [
  'Mon Apr 7', 'Tue Apr 8', 'Wed Apr 9', 'Thu Apr 10', 'Fri Apr 11',
  'Mon Apr 14', 'Tue Apr 15', 'Wed Apr 16', 'Thu Apr 17', 'Fri Apr 18',
];

/** Scheduling times */
export const JOURNEY_TIMES = [
  '9:00am', '10:30am', '1:00pm', '2:00pm', '3:30pm', '4:00pm',
];

/** Comp bands shown during Applied stage */
export const JOURNEY_COMP_BANDS = [
  '$140k – $180k', '$160k – $210k', '$180k – $230k',
  '$200k – $260k', '$220k – $280k', '$250k – $310k',
];

/** Offer: base salary */
export const JOURNEY_BASES = [
  '$165,000', '$185,000', '$205,000', '$225,000', '$245,000', '$265,000',
];

/** Offer: equity per year */
export const JOURNEY_EQUITIES = [
  '$80k / yr', '$100k / yr', '$120k / yr', '$140k / yr', '$160k / yr',
];

/** Offer: signing bonus */
export const JOURNEY_SIGNINGS = [
  '$15,000', '$20,000', '$25,000', '$30,000', '$40,000', '$50,000',
];

/** Onsite: interview focus areas */
export const JOURNEY_FOCUSES = [
  'SQL, exp. design, case', 'System design, coding',
  'ML, stats, product sense', 'Frontend, API design',
  'Distributed systems', 'Product sense, metrics',
];

/** Onsite: panel composition */
export const JOURNEY_PANELS = [
  'PM, EM, 2 DS, VP', 'EM, 2 SWE, PM', 'CTO, 3 Eng, PM',
  'VP, 2 SWE, Designer', 'EM, 3 SWE, Staff',
];

/** Onsite: round descriptions */
export const JOURNEY_ROUNDS = [
  '4 · half day', '5 · full day loop', '3 · virtual',
  '6 · two-day onsite', '4 · virtual + onsite',
];

/** Screen: followup status */
export const JOURNEY_FOLLOWUPS = [
  'Set for Mon', 'Set for Tue', 'Awaiting reply', 'Confirmed',
];

/** Stage tags — shown as feature pills on each stage */
export const JOURNEY_STAGE_TAGS: Record<string, string[]> = {
  applied:  ['Resume versioning', 'Application timeline', 'Custom tags & filters'],
  screen:   ['Interviewer log', 'Follow-up reminders', 'Take-home tracking'],
  onsite:   ['Round-by-round log', 'Panel notes', 'Thank-you drafts'],
  offer:    ['TC calculator', 'Side-by-side comparison', 'Decision matrix'],
};

/** Stage dot colors — progress indicator for each stage */
export const JOURNEY_DOT_COLORS: Record<string, string> = {
  applied:  'oklch(0.42 0.08 230)',
  screen:   'oklch(0.48 0.10 70)',
  onsite:   'oklch(0.45 0.08 300)',
  offer:    'oklch(0.60 0.10 150)',
};

/** Stage benchmarks — colored metric at bottom of card */
export const JOURNEY_BENCHMARKS: Record<string, string[]> = {
  applied:  ['2.1 min avg. logging time'],
  screen:   ['63% screen → onsite rate'],
  onsite:   ['33% onsite → offer rate'],
  offer:    ['+$18k avg. negotiation uplift'],
};

/** Outcome probabilities — controls rejection/offer distribution.
 *  Values are cumulative thresholds (0–1). Order: applied, screen, onsite, offer.
 *  Everything above the last rejection threshold = offer. */
export const JOURNEY_OUTCOME_THRESHOLDS = {
  rejectedAtApplied: 0.20,  // 0–0.20 = 20% ghosted at applied
  rejectedAtScreen:  0.45,  // 0.20–0.45 = 25% rejected at screen
  rejectedAtOnsite:  0.60,  // 0.45–0.60 = 15% rejected at onsite
  // 0.60–1.0 = 40% reach offer (always green)
};

/** Timing — milliseconds for each phase of the animation */
export const JOURNEY_TIMING = {
  holdMs:             5500,   // time at each non-final stage
  transitionMs:       800,    // crossfade between stages
  finalOfferHoldMs:   5000,   // hold at offer with green glow
  finalRejectHoldMs:  4500,   // hold with rejection banner visible
  betweenMs:          2500,   // loading spinner between episodes
};
