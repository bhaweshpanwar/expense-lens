import { useTranslation } from 'react-i18next';
import { useExpenses } from '../context/ExpenseContext';
import CategoryChart from '../components/CategoryChart';
import { formatCurrency, getCategoryBreakdown } from '../utils/expenseCalculations';
import { categories } from '../data/categories';

export default function Categories() {
  const { expenses, isLoading } = useExpenses();
  const { t } = useTranslation();

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('categories.loading')}</p>;

  const breakdown = getCategoryBreakdown(expenses);
  const byName = Object.fromEntries(breakdown.map((b) => [b.category, b]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const stat = byName[cat.name] || { total: 0, percent: 0 };
          return (
            <div key={cat.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t(`categoryNames.${cat.name}`, cat.name)}
                </h3>
              </div>
              <p className="text-xl font-semibold tabular text-[var(--color-ink)]">
                {formatCurrency(stat.total)} {t('categories.spent')}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                {t('categories.percentOfTotal', { percent: stat.percent.toFixed(1) })}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                {t('categories.monthlyBudget', { amount: formatCurrency(cat.monthlyBudget) })}
              </p>
            </div>
          );
        })}
      </div>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('categories.chartTitle')}</h2>
        <CategoryChart
          data={breakdown.map((b) => ({
            category: t(`categoryNames.${b.category}`, b.category),
            total: b.total,
          }))}
          height={320}
        />
      </section>
    </div>
  );
}

