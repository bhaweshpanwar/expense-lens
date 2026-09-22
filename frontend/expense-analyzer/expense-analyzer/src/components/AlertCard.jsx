import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const variants = {
  danger: {
    bg: 'bg-[var(--color-bad-light)]',
    border: 'border-[var(--color-bad)]/30',
    text: 'text-[var(--color-bad)]',
    Icon: AlertTriangle,
  },
  good: {
    bg: 'bg-[var(--color-good-light)]',
    border: 'border-[var(--color-good)]/30',
    text: 'text-[var(--color-good)]',
    Icon: CheckCircle2,
  },
  info: {
    bg: 'bg-[var(--color-amber-light)]',
    border: 'border-[var(--color-amber)]/30',
    text: 'text-[var(--color-amber)]',
    Icon: Info,
  },
};

export default function AlertCard({ variant = 'info', title, message }) {
  const { bg, border, text, Icon } = variants[variant];

  return (
    <div className={`flex items-start gap-3 rounded-lg border ${border} ${bg} p-4`}>
      <Icon size={19} className={`${text} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-sm font-semibold ${text}`}>{title}</p>
        {message && <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">{message}</p>}
      </div>
    </div>
  );
}
