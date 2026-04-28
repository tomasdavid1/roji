"use client";

import { useEffect, useState } from "react";

import type { Tool } from "@/lib/tools";

interface ComingSoonModalProps {
  tool: Tool;
  onClose: () => void;
}

/**
 * Email-capture modal for tools that aren't live yet.
 *
 * Posts to /api/notify-me. The endpoint stores leads to a JSON file
 * (matching the dependency-free pattern used elsewhere in this app).
 * If the user closes the modal without submitting, we treat it as a
 * decline; no follow-up.
 */
export function ComingSoonModal({ tool, onClose }: ComingSoonModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/notify-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), toolSlug: tool.slug }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status}`);
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-roji-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-roji-lg border border-roji-border bg-roji-card p-7 shadow-roji-glow">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-8 w-8 rounded-full text-roji-muted hover:text-roji-text hover:bg-white/5 transition-colors"
        >
          ×
        </button>

        {status !== "success" ? (
          <>
            <span className="inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-roji-muted">
              Coming soon
            </span>
            <h2
              id="coming-soon-title"
              className="mt-3 text-xl font-semibold text-roji-text"
            >
              {tool.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-roji-muted">
              This tool is still in the works. Drop your email and we&apos;ll
              let you know the moment it&apos;s live. No newsletter, no
              follow-ups — just one notification.
            </p>
            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="roji-input"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="roji-btn-primary"
              >
                {status === "submitting" ? "Saving…" : "Notify me"}
              </button>
            </form>
            {errorMessage && (
              <p className="mt-3 text-xs text-roji-danger">{errorMessage}</p>
            )}
            <p className="mt-4 text-[11px] text-roji-dim">
              We store your email only to send the launch notification.
              You can opt out at any time.
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-roji-success/15 text-roji-success flex items-center justify-center">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-roji-text">
              You&apos;re on the list.
            </h2>
            <p className="mt-2 text-sm text-roji-muted">
              We&apos;ll email you when{" "}
              <span className="text-roji-text">{tool.name}</span> launches.
            </p>
            <button
              onClick={onClose}
              className="roji-btn mt-5"
              type="button"
            >
              Back to tools
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
