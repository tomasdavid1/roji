"use client";

import type { ProtocolRecommendation } from "@/lib/recommend";

interface Props {
  recommendation: ProtocolRecommendation;
  onGetStack: () => void;
}

export function StackCard({ recommendation, onGetStack }: Props) {
  return (
    <div className="roji-card !p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="roji-pill mb-3">Recommended stack</span>
          <h3 className="text-2xl font-semibold mt-2">
            {recommendation.stack_name}
          </h3>
          <p className="text-sm text-roji-muted mt-1">
            {recommendation.cycle_length_weeks}-week research cycle · SKU{" "}
            {recommendation.stack_sku}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-2xl text-roji-text">
            ${recommendation.stack_price.toFixed(2)}
          </div>
          <div className="text-xs text-roji-dim mt-1">USD</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onGetStack}
        className="roji-btn-primary w-full !py-4 mt-2 text-base"
      >
        Get this stack →
      </button>

      <p className="text-[11px] text-roji-dim text-center mt-3 leading-relaxed">
        Redirects to the secure store. Research use only. Must be 21+.
      </p>
    </div>
  );
}
