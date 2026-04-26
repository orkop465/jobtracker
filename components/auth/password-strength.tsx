'use client';

const STRENGTH_LABELS = ['Type to begin', 'Too short', 'Getting there', 'Solid', 'Archival-grade'];

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const score = scorePassword(password);

  return (
    <div className="auth-strength">
      <div className="auth-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`auth-strength-bar${i < score ? ` on-${score}` : ''}`}
          />
        ))}
      </div>
      <div className="auth-strength-meta">
        <span className="auth-strength-label">&mdash; Strength</span>
        <span className="auth-strength-value">{STRENGTH_LABELS[score]}</span>
      </div>
    </div>
  );
}
