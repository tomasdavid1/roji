"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/performance", label: "Performance" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/keywords", label: "Keywords" },
];

export function Nav({ live }: { live: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="border-b border-roji-border bg-roji-darker">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/performance" className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-roji-accent">
              Roji
            </span>
            <span className="text-roji-dim">·</span>
            <span className="font-mono text-xs uppercase tracking-widest text-roji-muted">
              Ads
            </span>
          </Link>
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={[
                      "px-3 py-1.5 rounded-roji text-sm transition-colors",
                      active
                        ? "bg-white/[0.04] text-roji-text"
                        : "text-roji-muted hover:text-roji-text",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              live
                ? "roji-pill-success"
                : "roji-pill-warning"
            }
          >
            {live ? "Live API" : "Mock data"}
          </span>
        </div>
      </div>
    </nav>
  );
}
