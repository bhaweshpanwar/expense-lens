import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpenses } from '../context/ExpenseContext';
import StatCard from '../components/StatCard';
import BudgetProgress from '../components/BudgetProgress';
import AlertCard from '../components/AlertCard';
import CategoryChart from '../components/CategoryChart';
import VendorChart from '../components/VendorChart';
import MonthlyExpenseChart from '../components/MonthlyExpenseChart';
import {
  formatCurrency,
  getBudgetSummary,
  getCategoryBreakdown,
  getCurrentMonthKey,
  getExpensesForMonth,
  getMonthlyTrend,
  getTopVendors,
  getTotalSpent,
} from '../utils/expenseCalculations';

export default function Dashboard() {
  const { expenses, monthlyBudget, isLoading } = useExpenses();
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  };

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('dashboard.loading')}</p>;

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthName = formatMonth(currentMonthKey);
  const monthExpenses = getExpensesForMonth(expenses, currentMonthKey);
  const totalSpent = getTotalSpent(monthExpenses);
  const budget = getBudgetSummary(totalSpent, monthlyBudget);
  const categoryData = getCategoryBreakdown(monthExpenses).map((c) => ({
    category: t(`categoryNames.${c.category}`, c.category),
    total: c.total,
  }));
  const topVendors = getTopVendors(monthExpenses, 5);
  const trend = getMonthlyTrend(expenses).map((tr) => ({
    ...tr,
    month: formatMonth(tr.key),
  }));
  const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Budget summary */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            {t('dashboard.monthlyBudgetSummary', { month: currentMonthName })}
          </h2>
          <Link to="/expenses/new" className="text-xs font-medium text-[var(--color-brand)] hover:underline">
            {t('dashboard.addExpense')}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label={t('dashboard.monthlyBudget')} value={formatCurrency(budget.budget)} />
          <StatCard label={t('dashboard.totalSpent')} value={formatCurrency(budget.totalSpent)} tone={budget.isExceeded ? 'bad' : 'default'} />
          <StatCard
            label={budget.isExceeded ? t('dashboard.overBudgetBy') : t('dashboard.remaining')}
            value={formatCurrency(budget.isExceeded ? budget.exceededBy : budget.remaining)}
            tone={budget.isExceeded ? 'bad' : 'good'}
          />
          <StatCard label={t('dashboard.budgetUsed')} value={`${budget.percentUsed.toFixed(1)}%`} tone={budget.isExceeded ? 'bad' : 'default'} />
        </div>

        <BudgetProgress percentUsed={budget.percentUsed} isExceeded={budget.isExceeded} />

        <div className="mt-4">
          {budget.isExceeded ? (
            <AlertCard
              variant="danger"
              title={t('dashboard.budgetExceededTitle')}
              message={t('dashboard.budgetExceededMsg', { month: currentMonthName, amount: formatCurrency(budget.exceededBy) })}
            />
          ) : (
            <AlertCard
              variant="good"
              title={t('dashboard.withinBudgetTitle')}
              message={t('dashboard.withinBudgetMsg', { amount: formatCurrency(budget.remaining) })}
            />
          )}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('dashboard.expenseBySector')}</h2>
          <CategoryChart data={categoryData} />
        </section>

        <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('dashboard.topVendors')}</h2>
          <VendorChart data={topVendors.map((v) => ({ vendor: v.vendor, total: v.total }))} />
        </section>
      </div>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('dashboard.monthlyExpenseTrend')}</h2>
        <MonthlyExpenseChart data={trend} />
      </section>

      {/* Recent expenses */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t('dashboard.recentExpenses')}</h2>
          <Link to="/expenses" className="text-xs font-medium text-[var(--color-brand)] hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left">
                <th className="py-2 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.date')}</th>
                <th className="py-2 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.vendor')}</th>
                <th className="py-2 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.category')}</th>
                <th className="py-2 px-3 font-medium text-[var(--color-ink-soft)] text-right">{t('common.amount')}</th>
                <th className="py-2 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-line-soft)]">
                  <td className="py-2 px-3 text-[var(--color-ink-soft)] whitespace-nowrap">
                    {new Date(e.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2 px-3 font-medium text-[var(--color-ink)]">{e.vendor}</td>
                  <td className="py-2 px-3 text-[var(--color-ink-soft)]">{t(`categoryNames.${e.category}`, e.category)}</td>
                  <td className="py-2 px-3 text-right tabular font-medium text-[var(--color-ink)]">{formatCurrency(e.amount)}</td>
                  <td className="py-2 px-3 text-[var(--color-ink-soft)] max-w-[220px] truncate">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

