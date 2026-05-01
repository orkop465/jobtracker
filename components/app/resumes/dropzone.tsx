"use client";

import { useRef, useState } from "react";

interface Props {
  /** Called with a file once the user has chosen / dropped one. */
  onFile: (file: File) => void;
  /** Optional label override; the user may want to edit before upload starts. */
  defaultLabel?: string;
  /** Inline error to display under the controls. */
  error?: string | null;
}

export function DropZone({ onFile, error }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`res-dropzone ${dragOver ? "is-drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <div className="res-dropzone-inner">
        <div className="res-dropzone-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect
              x="14"
              y="6"
              width="28"
              height="44"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M20 18h16M20 24h16M20 30h12M20 36h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="42"
              cy="42"
              r="9"
              fill="var(--bg-2)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M42 38v8M38 42h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="res-dropzone-title">Drop a resume to get started.</h2>
        <p className="res-dropzone-sub">
          We&apos;ll save it to your library so you can attach it to applications and
          track which variant landed which interview.
        </p>
        <div className="res-dropzone-actions">
          <button
            type="button"
            className="res-toolbar-action primary"
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {error ? <p className="res-dropzone-error">{error}</p> : null}
        <div className="res-dropzone-formats">PDF only — up to 2 MB</div>
      </div>
    </div>
  );
}
