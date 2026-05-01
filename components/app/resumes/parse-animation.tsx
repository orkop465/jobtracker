"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading file",
  "Verifying PDF signature",
  "Uploading to storage",
  "Indexing variant",
  "Done",
];

interface Props {
  filename: string;
  /**
   * Externally controlled "we're done" signal. When it flips to true,
   * the animation displays every step as done and calls onDone after a
   * brief flourish — without writing state inside the effect body.
   */
  finished: boolean;
  onDone: () => void;
}

export function ParseAnimation({ filename, finished, onDone }: Props) {
  const [tickedStep, setTickedStep] = useState(0);

  // While not finished, advance up to second-to-last step on a timer.
  useEffect(() => {
    if (finished) return;
    if (tickedStep >= STEPS.length - 1) return;
    const t = setTimeout(() => setTickedStep((s) => Math.min(s + 1, STEPS.length - 1)), 520);
    return () => clearTimeout(t);
  }, [tickedStep, finished]);

  // Once finished is true, schedule onDone — render computes the "all
  // done" appearance directly from `finished`, no setState needed.
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(onDone, 320);
    return () => clearTimeout(t);
  }, [finished, onDone]);

  const displayStep = finished ? STEPS.length : tickedStep;

  return (
    <div className="res-parse-overlay">
      <div className="res-parse-card">
        <div className="res-parse-eyebrow">Uploading resume</div>
        <h3 className="res-parse-title">{filename || "resume.pdf"}</h3>
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`res-parse-step ${i < displayStep ? "is-done" : ""} ${
              i === displayStep ? "is-active" : ""
            }`}
          >
            <span className="res-parse-step-dot">
              {i < displayStep && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path
                    d="M1.5 4.8l2 2L7.5 2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
