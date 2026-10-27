import { CheckCircle2, CircleAlert, Clock3, LoaderCircle, Ban } from "lucide-react";
import type { RunStatus } from "@/lib/api";

const icons = { QUEUED: Clock3, RUNNING: LoaderCircle, PASSED: CheckCircle2, FAILED: CircleAlert, ERROR: CircleAlert, CANCELLED: Ban };
export function StatusBadge({ status }: { status: RunStatus | null }) {
  if (!status) return <span className="text-sm text-slate-500">No runs yet</span>;
  const Icon = icons[status];
  return <span className={`status status-${status.toLowerCase()}`}><Icon size={14} aria-hidden="true" />{status}</span>;
}
