/**
 * Real company names used as demo data in the landing hero.
 * These are public, already-famous companies — no claim is made about
 * who applied where. Purely illustrative.
 * See spec §5.2.
 */

export interface CompanyTemplate {
  company: string;
  role: string;
}

export const COMPANY_TEMPLATES: readonly CompanyTemplate[] = [
  { company: 'Linear',      role: 'Product Eng' },
  { company: 'Stripe',      role: 'Infra Eng' },
  { company: 'Figma',       role: 'Design Eng' },
  { company: 'Vercel',      role: 'DX Eng' },
  { company: 'Notion',      role: 'Full stack' },
  { company: 'Raycast',     role: 'iOS Eng' },
  { company: 'Supabase',    role: 'Backend Eng' },
  { company: 'Retool',      role: 'Full stack' },
  { company: 'Resend',      role: 'Eng' },
  { company: 'Sanity',      role: 'Eng' },
  { company: 'Cal.com',     role: 'Frontend Eng' },
  { company: 'Clerk',       role: 'Frontend Eng' },
  { company: 'Neon',        role: 'Infra Eng' },
  { company: 'Browser Co',  role: 'Eng' },
  { company: 'Arc',         role: 'iOS Eng' },
  { company: 'Anthropic',   role: 'ML Eng' },
  { company: 'OpenAI',      role: 'Eng' },
  { company: 'Coinbase',    role: 'Eng' },
  { company: 'Ramp',        role: 'Full stack' },
  { company: 'Mercury',     role: 'Backend' },
  { company: 'Datadog',     role: 'Infra Eng' },
  { company: 'GitHub',      role: 'Eng' },
  { company: 'Plausible',   role: 'Full stack' },
  { company: 'PostHog',     role: 'Eng' },
  { company: 'Sentry',      role: 'Eng' },
  { company: 'Replicate',   role: 'ML Eng' },
  { company: 'Modal',       role: 'Infra' },
  { company: 'Replit',      role: 'Eng' },
  { company: 'Liveblocks',  role: 'Frontend' },
  { company: 'Ably',        role: 'Infra' },
] as const;

export type CompanyTemplateIndex = number;
