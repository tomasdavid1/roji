"use client";

import { ReactNode } from "react";

interface Props {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  meta?: string;
}

export function SelectableCard({
  selected,
  onClick,
  title,
  description,
  icon,
  meta,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left w-full p-5 rounded-roji border transition-colors",
        "bg-roji-card hover:border-roji-border-hover",
        selected
          ? "border-roji-accent ring-1 ring-roji-accent/40"
          : "border-roji-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="text-2xl leading-none mt-0.5 select-none">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-roji-text">{title}</h3>
            {meta && (
              <span className="text-[11px] uppercase tracking-widest font-mono text-roji-muted">
                {meta}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-roji-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
