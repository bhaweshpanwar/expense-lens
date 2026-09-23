import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpenses } from '../context/ExpenseContext';
import CategoryChart from '../components/CategoryChart';
import { formatCurrency, getCategoryBreakdown } from '../utils/expenseCalculations';
import { fetchBudgets, fetchCategories } from '../services/api';
import { categories as defaultCategories } from '../data/categories';

export default function Categories() {
  const { expenses, isLoading } = useExpenses();
  const { t } = useTranslation();

  const [dbBudgets, setDbBudgets] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchBudgets(), fetchCategories()]).then(([budgets, cats]) => {
      if (isMounted) {
        setDbBudgets(budgets || []);
        setDbCategories(cats || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [expenses]);

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('categories.loading')}</p>;

  const breakdown = getCategoryBreakdown(expenses);
  const byName = Object.fromEntries(breakdown.map((b) => [b.category.toLowerCase(), b]));

  // Combine DB categories + user expense categories
  const categoryMap = new Map();

  const getColor = (name) => {
    const found = defaultCategories.find(
      (dc) => dc.name.toLowerCase() === name.toLowerCase()
    );
    return found?.color || '#23514A';
  };

  dbCategories.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), {
      id: cat.id,
      name: cat.name,
      color: cat.color || getColor(cat.name),
    });
  });

  expenses.forEach((e) => {
    if (e.category) {
      const key = e.category.toLowerCase();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: key,
          name: e.category,
          color: getColor(e.category),
        });
      }
    }
  });

  const allCategories = Array.from(categoryMap.values()).sort((a, b) => {
    const totalA = byName[a.name.toLowerCase()]?.total || 0;
    const totalB = byName[b.name.toLowerCase()]?.total || 0;
    return totalB - totalA;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCategories.length === 0 ? (
          <div className="col-span-full p-8 rounded-lg border border-[var(--color-line)] text-center text-sm text-[var(--color-ink-soft)] bg-[var(--color-surface)]">
            No expense categories recorded for your account yet. Add transactions or import a CSV to begin tracking category spending.
          </div>
        ) : (
          allCategories.map((cat) => {
            const stat = byName[cat.name.toLowerCase()] || { total: 0, percent: 0 };
            const userBudget = dbBudgets.find(
              (b) => b.category_name && b.category_name.toLowerCase() === cat.name.toLowerCase()
            );

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
                {userBudget && userBudget.limit_amount > 0 ? (
                  t('categories.monthlyBudget', { amount: formatCurrency(userBudget.limit_amount) })
                ) : (
                  <span className="text-[var(--color-ink-soft)]/70">No budget limit set</span>
                )}
              </p>
            </div>
          );
        })
      )}
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
