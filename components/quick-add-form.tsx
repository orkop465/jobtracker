"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SOURCE_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";

interface QuickAddFormProps {
  resumes: { id: string; label: string }[];
  onCreated: () => void;
}

export function QuickAddForm({ resumes, onCreated }: QuickAddFormProps) {
  const { toast } = useToast();
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !roleTitle.trim()) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        company: company.trim(),
        roleTitle: roleTitle.trim(),
      };
      if (source) body.source = source;
      if (priority) body.priority = priority;
      if (resumeId) body.resumeId = resumeId;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create");
      }

      toast(`Added ${company.trim()}`, "success");
      setCompany("");
      setRoleTitle("");
      setSource("");
      setPriority("");
      setResumeId("");
      setShowMore(false);
      onCreated();
    } catch (err: any) {
      toast(err.message ?? "Failed to add", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Role Title"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary" loading={submitting}>
          Add
        </Button>
      </div>

      {showMore && (
        <div className="grid grid-cols-3 gap-3 animate-fade-in">
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={[...SOURCE_OPTIONS]}
            placeholder="Source..."
          />
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[...PRIORITY_OPTIONS]}
            placeholder="Priority..."
          />
          <Select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            options={resumes.map((r) => ({ value: r.id, label: r.label }))}
            placeholder="Resume..."
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        {showMore ? "Less options" : "More options"}
      </button>
    </form>
  );
}
