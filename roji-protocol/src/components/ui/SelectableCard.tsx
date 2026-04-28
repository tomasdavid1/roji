"use client";

interface Props {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  meta?: string;
}

/**
 * Wizard step card. No icons by design — text + the right-aligned stack
 * label do all the visual differentiation work, which fits the
 * clinical/research aesthetic.
 *
 * Three visual states:
 *   - resting    : subtle border, transparent bg
 *   - hover      : brighter border + faint indigo halo (responsive feel)
 *   - selected   : solid indigo left rail + tinted bg + ring + "Selected" tag
 */
export function SelectableCard({
  selected,
  onClick,
  title,
  description,
  meta,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative text-left w-full pl-6 pr-5 py-5 rounded-roji border transition-all duration-150",
        selected
          ? "border-roji-accent bg-roji-accent/[0.06] ring-1 ring-roji-accent/40 shadow-[0_0_28px_rgba(79,109,245,0.18)]"
          : "border-roji-border bg-roji-card hover:border-roji-accent/60 hover:bg-roji-card/80 hover:shadow-[0_0_20px_rgba(79,109,245,0.08)]",
      ].join(" ")}
    >
      {/* Selected-state left rail. Sits flush with the rounded corner. */}
      <span
        aria-hidden="true"
        className={[
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-opacity",
          selected
            ? "bg-roji-accent opacity-100 shadow-[0_0_12px_rgba(79,109,245,0.6)]"
            : "bg-roji-accent opacity-0 group-hover:opacity-30",
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3
            className={[
              "text-base font-semibold transition-colors",
              selected ? "text-roji-text" : "text-roji-text",
            ].join(" ")}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 text-sm text-roji-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0 mt-0.5">
          {meta && (
            <span
              className={[
                "text-[11px] uppercase tracking-widest font-mono whitespace-nowrap transition-colors",
                selected ? "text-roji-accent" : "text-roji-muted",
              ].join(" ")}
            >
              {meta}
            </span>
          )}
          {selected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-roji-accent">
              <CheckIcon />
              Selected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 6.2L4.8 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
