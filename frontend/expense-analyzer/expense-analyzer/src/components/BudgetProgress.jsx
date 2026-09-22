import { useTranslation } from 'react-i18next';

export default function BudgetProgress({ percentUsed, isExceeded }) {
  const { t } = useTranslation();
  const width = Math.min(percentUsed, 100);

  return (
    <div>
      <div className="h-2.5 w-full bg-[var(--color-line-soft)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isExceeded ? 'bg-[var(--color-bad)]' : 'bg-[var(--color-brand)]'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-[var(--color-ink-soft)]">0%</span>
        <span className={`text-xs font-medium ${isExceeded ? 'text-[var(--color-bad)]' : 'text-[var(--color-ink-soft)]'}`}>
          {t('budgetProgress.used', { percent: percentUsed.toFixed(1) })}
        </span>
        <span className="text-xs text-[var(--color-ink-soft)]">100%</span>
      </div>
    </div>
  );
}

