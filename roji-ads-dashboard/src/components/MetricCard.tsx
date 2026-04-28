interface Props {
  label: string;
  value: string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="roji-card">
      <div className="font-mono text-[10px] uppercase tracking-widest text-roji-dim mb-2">
        {label}
      </div>
      <div className="font-mono text-2xl text-roji-text">{value}</div>
      {hint && <div className="text-xs text-roji-muted mt-1">{hint}</div>}
    </div>
  );
}
