import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, TrendingUp } from 'lucide-react';
import { fetchUnusualExpenses } from '../services/api';
import { formatCurrency } from '../utils/expenseCalculations';

export default function UnusualExpenses() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  useEffect(() => {
    fetchUnusualExpenses().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('unusual.loading')}</p>;

  return (
    <div className="space-y-6">
      <section className="bg-[var(--color-amber-light)] border border-[var(--color-amber)]/30 rounded-lg p-4 flex items-start gap-3">
        <Sparkles size={19} className="text-[var(--color-amber)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-amber)]">{t('unusual.title')}</p>
          <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">
            {t('unusual.desc')}
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-8 text-center">
          <p className="text-sm text-[var(--color-ink-soft)]">{t('unusual.noItems')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const diff = item.amount - item.historicalAverage;
            const diffPercent = ((diff / item.historicalAverage) * 100).toFixed(0);
            return (
              <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-bad)]/30 rounded-lg overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-[var(--color-bad-light)] border-b border-[var(--color-bad)]/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--color-bad)]" />
                    <span className="text-sm font-semibold text-[var(--color-bad)]">{item.reason}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-bad)]">
                    {t('unusual.vsAverage', { percent: diffPercent })}
                  </span>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[var(--color-ink-soft)] mb-1">{t('common.vendor')}</p>
                      <p className="text-sm font-medium text-[var(--color-ink)]">{item.vendor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-ink-soft)] mb-1">{t('common.category')}</p>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {t(`categoryNames.${item.category}`, item.category)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-ink-soft)] mb-1">{t('common.date')}</p>
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-ink-soft)] mb-1">{t('common.amount')}</p>
                      <p className="text-sm font-semibold tabular text-[var(--color-bad)]">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--color-line)] pt-4">
                    <p className="text-xs font-medium text-[var(--color-ink-soft)] mb-2">{t('unusual.whyFlagged')}</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-[var(--color-line-soft)] rounded-md p-3">
                        <p className="text-[11px] text-[var(--color-ink-soft)]">{t('unusual.currentExpense')}</p>
                        <p className="text-sm font-semibold tabular text-[var(--color-ink)]">{formatCurrency(item.amount)}</p>
                      </div>
                      <div className="bg-[var(--color-line-soft)] rounded-md p-3">
                        <p className="text-[11px] text-[var(--color-ink-soft)]">{t('unusual.historicalAverage')}</p>
                        <p className="text-sm font-semibold tabular text-[var(--color-ink)]">{formatCurrency(item.historicalAverage)}</p>
                      </div>
                      <div className="bg-[var(--color-line-soft)] rounded-md p-3">
                        <p className="text-[11px] text-[var(--color-ink-soft)]">{t('unusual.difference')}</p>
                        <p className="text-sm font-semibold tabular text-[var(--color-bad)]">{formatCurrency(diff)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-ink-soft)]">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

