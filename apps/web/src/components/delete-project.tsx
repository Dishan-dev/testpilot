"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";

export function DeleteProject({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function remove() {
    setBusy(true);
    try { await request(`/api/projects/${id}`, { method: "DELETE" }); router.push("/projects"); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Deletion failed."); setBusy(false); }
  }
  return <section className="panel mt-8 max-w-2xl p-6"><h2 className="font-semibold">Delete project</h2><p className="my-3 text-sm text-slate-400">Only projects without test history can be deleted. Saved evidence is protected.</p>{confirm ? <div className="flex gap-3"><button disabled={busy} className="secondary-button" onClick={remove}>{busy ? "Deleting…" : "Confirm deletion"}</button><button className="secondary-button" onClick={() => setConfirm(false)}>Keep project</button></div> : <button className="secondary-button" onClick={() => setConfirm(true)}>Delete project</button>}{error && <p className="error-notice mt-3" role="alert">{error}</p>}</section>;
}
