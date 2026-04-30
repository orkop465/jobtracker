"use client";

import { useEffect, useRef, useState } from "react";

interface InlineAddFormProps {
  onAdd: (data: { roleTitle: string; company: string }) => void | Promise<void>;
  onCancel: () => void;
}

export function InlineAddForm({ onAdd, onCancel }: InlineAddFormProps) {
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTitle.trim() || !company.trim()) return;
    onAdd({ roleTitle: roleTitle.trim(), company: company.trim() });
  }

  return (
    <form
      className="bcard-add-form"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <input
        ref={ref}
        className="role-input"
        placeholder="Role title"
        value={roleTitle}
        onChange={(e) => setRoleTitle(e.target.value)}
      />
      <input
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <div className="bcard-add-actions">
        <button type="submit" className="bcard-add-submit">
          Add
        </button>
        <button type="button" className="bcard-add-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
