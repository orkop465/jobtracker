type LogLevel = "info" | "warn" | "error";

interface BaseEvent {
  event: string;
  [k: string]: unknown;
}

function emit(level: LogLevel, payload: BaseEvent) {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...payload });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logAdminAction(args: {
  action: "approve" | "reject" | "unpublish" | "feature" | "unfeature";
  adminEmail: string;
  publicResumeId: string;
  reason?: string | null;
  previousStatus: string;
}) {
  emit("info", { event: "admin.marketplace.action", ...args });
}

export function logRasterize(args: {
  userId: string;
  pageCount: number;
  inputBytes: number;
  outputBytes: number;
  durationMs: number;
}) {
  emit("info", { event: "marketplace.rasterize", ...args });
}

export function logRasterizeError(args: { userId: string; message: string }) {
  emit("error", { event: "marketplace.rasterize.error", ...args });
}
