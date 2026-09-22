export default function StatCard({ label, value, tone = 'default', hint }) {
  const toneClasses = {
    default: 'text-[var(--color-ink)]',
    good: 'text-[var(--color-good)]',
    bad: 'text-[var(--color-bad)]',
    amber: 'text-[var(--color-amber)]',
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
      <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-1.5">{label}</p>
      <p className={`text-2xl font-semibold tabular ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--color-ink-soft)] mt-1">{hint}</p>}
    </div>
  );
}
