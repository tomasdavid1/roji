import { ExternalLink, Gift, Lock, UserX } from "lucide-react";

const SIGNALS = [
  { Icon: UserX, label: "No signup required" },
  { Icon: Gift, label: "100% free" },
  { Icon: Lock, label: "Data stays in your browser" },
  { Icon: ExternalLink, label: "Open-source references" },
] as const;

/**
 * Trust signal row beneath the tool grid.
 * Subtle by design — small text, muted colors, no hover states.
 */
export function TrustSignals() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-between">
      {SIGNALS.map(({ Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-2 text-[13px] text-roji-muted"
        >
          <Icon
            size={16}
            strokeWidth={1.5}
            className="text-roji-dim"
            aria-hidden="true"
          />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
