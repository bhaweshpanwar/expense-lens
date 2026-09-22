import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Edit3, Check, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { recommendBudgetLimits, fetchUnusualExpenses } from '../services/api';
import StatCard from '../components/StatCard';
import BudgetProgress from '../components/BudgetProgress';
import AlertCard from '../components/AlertCard';
import { categories } from '../data/categories';
import {
  formatCurrency,
  getBudgetSummary,
  getCategoryTotals,
  getCurrentMonthKey,
  getExpensesForMonth,
  getTotalSpent,
} from '../utils/expenseCalculations';

export default function BudgetAlerts() {
  const { expenses, monthlyBudget, updateBudget, isLoading } = useExpenses();
  const { t, i18n } = useTranslation();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget || 100000));
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const [isRecommending, setIsRecommending] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [unusualList, setUnusualList] = useState([]);

  useEffect(() => {
    if (monthlyBudget) setBudgetInput(String(monthlyBudget));
  }, [monthlyBudget]);

  useEffect(() => {
    fetchUnusualExpenses().then(setUnusualList).catch(() => {});
  }, []);

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  };

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('budgetAlerts.loading')}</p>;

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthName = formatMonth(currentMonthKey);
  const monthExpenses = getExpensesForMonth(expenses, currentMonthKey);
  const totalSpent = getTotalSpent(monthExpenses);
  const budget = getBudgetSummary(totalSpent, monthlyBudget);
  const categoryTotals = getCategoryTotals(monthExpenses);

  const handleSaveBudgetLimit = async () => {
    const num = Number(budgetInput);
    if (!num || num <= 0) return;
    setIsSavingBudget(true);
    try {
      await updateBudget(num);
      setIsEditingBudget(false);
    } catch (err) {
      console.error('Failed to update budget limit', err);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleRecommendLimits = async () => {
    setIsRecommending(true);
    try {
      const breakdown = categories.map((c) => ({
        category: c.name,
        total: categoryTotals[c.name] || c.monthlyBudget,
      }));
      const rec = await recommendBudgetLimits(breakdown, monthlyBudget);
      setAiRecommendation(rec);
    } catch (err) {
      console.error('Failed to get AI recommendation', err);
    } finally {
      setIsRecommending(false);
    }
  };

  const categoryAlerts = categories
    .map((cat) => {
      const spent = categoryTotals[cat.name] || 0;
      const overBy = spent - cat.monthlyBudget;
      return { ...cat, spent, overBy, isOver: overBy > 0 };
    })
    .filter((c) => c.spent > 0);

  const exceededCategories = categoryAlerts.filter((c) => c.isOver);

  return (
    <div className="space-y-6">
      {/* Overall Budget Header & Controls */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            {t('budgetAlerts.overallTitle', { month: currentMonthName })}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecommendLimits}
              disabled={isRecommending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/5 text-[var(--color-brand)] text-xs font-medium hover:bg-[var(--color-brand)]/10 transition-colors disabled:opacity-50"
            >
              {isRecommending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              <span>AI Recommend Limits</span>
            </button>

            {isEditingBudget ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-ink-soft)]">₹</span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-24 px-2 py-1 text-xs font-semibold rounded border border-[var(--color-brand)] bg-[var(--color-surface)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveBudgetLimit}
                  disabled={isSavingBudget}
                  className="px-2 py-1 rounded bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)] flex items-center gap-1"
                >
                  <Check size={12} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="px-2 py-1 rounded border border-[var(--color-line)] text-xs hover:bg-[var(--color-line-soft)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingBudget(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
              >
                <Edit3 size={13} /> Change Monthly Limit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <StatCard label={t('dashboard.monthlyBudget')} value={formatCurrency(budget.budget)} />
          <StatCard label={t('budgetAlerts.currentSpending')} value={formatCurrency(budget.totalSpent)} tone={budget.isExceeded ? 'bad' : 'default'} />
          <StatCard
            label={budget.isExceeded ? t('budgetAlerts.exceeded') : t('dashboard.remaining')}
            value={formatCurrency(budget.isExceeded ? budget.exceededBy : budget.remaining)}
            tone={budget.isExceeded ? 'bad' : 'good'}
          />
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
              title={t('budgetAlerts.budgetOnTrack')}
              message={t('dashboard.withinBudgetMsg', { amount: formatCurrency(budget.remaining) })}
            />
          )}
        </div>

        {/* AI Recommendations Card */}
        {aiRecommendation && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--color-paper)] border border-[var(--color-brand)]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-brand)] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={14} /> AI Budget Advice (Nemotron)
              </span>
              <button
                type="button"
                onClick={() => setAiRecommendation(null)}
                className="text-[11px] text-[var(--color-ink-soft)] hover:underline"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed">{aiRecommendation.advice}</p>

            {aiRecommendation.limits && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--color-line)]">
                {aiRecommendation.limits.map((lim, idx) => (
                  <div key={idx} className="bg-[var(--color-surface)] p-2.5 rounded border border-[var(--color-line)]">
                    <p className="text-[11px] font-semibold text-[var(--color-ink)]">{lim.category}</p>
                    <p className="text-xs font-bold text-[var(--color-brand)]">₹{Number(lim.recommended_limit).toLocaleString('en-IN')}</p>
                    {lim.rationale && <p className="text-[10px] text-[var(--color-ink-soft)] mt-0.5">{lim.rationale}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unusual Transactions Alert Banner */}
        {unusualList && unusualList.length > 0 && (
          <div className="mt-4 p-3.5 rounded-lg bg-[var(--color-bad-light)] border border-[var(--color-bad)]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[var(--color-bad)]" />
                <span className="text-xs font-bold text-[var(--color-bad)]">
                  {unusualList.length} Unusual Transactions Driving Spend
                </span>
              </div>
              <Link
                to="/unusual-expenses"
                className="text-[11px] font-semibold text-[var(--color-bad)] hover:underline flex items-center gap-0.5"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-1">
              {unusualList.slice(0, 2).map((u) => (
                <p key={u.id} className="text-xs text-[var(--color-ink)]">
                  • <span className="font-semibold">{u.vendor}</span>: {u.reason || `₹${u.amount} in ${u.category}`}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-1">{t('budgetAlerts.categoryLevelBudgets')}</h2>
        <p className="text-xs text-[var(--color-ink-soft)] mb-4">
          {exceededCategories.length === 1
            ? t('budgetAlerts.overNoticeSingle')
            : exceededCategories.length > 1
            ? t('budgetAlerts.overNoticeMultiple', { count: exceededCategories.length })
            : t('budgetAlerts.allBudgetsNormal')}
        </p>

        <div className="space-y-3">
          {categoryAlerts.map((c) => {
            const catName = t(`categoryNames.${c.name}`, c.name);
            return (
              <div key={c.id} className="border border-[var(--color-line)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--color-ink)]">
                    {t('budgetAlerts.categoryBudgetLabel', { name: catName })}
                  </span>
                  <span className="text-xs text-[var(--color-ink-soft)]">
                    {formatCurrency(c.spent)} / {formatCurrency(c.monthlyBudget)}
                  </span>
                </div>
                <BudgetProgress
                  percentUsed={(c.spent / c.monthlyBudget) * 100}
                  isExceeded={c.isOver}
                />
                {c.isOver && (
                  <p className="text-xs text-[var(--color-bad)] mt-2">
                    {t('budgetAlerts.categoryOverMsg', { name: catName, amount: formatCurrency(c.overBy) })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

