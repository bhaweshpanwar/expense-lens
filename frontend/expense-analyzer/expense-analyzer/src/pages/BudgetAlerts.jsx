import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Edit3, Check, Loader2, AlertTriangle, ArrowRight, PlusCircle, X } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import {
  recommendBudgetLimits,
  fetchUnusualExpenses,
  fetchBudgets,
  fetchCategories,
  saveBudgetLimit,
} from '../services/api';
import StatCard from '../components/StatCard';
import BudgetProgress from '../components/BudgetProgress';
import AlertCard from '../components/AlertCard';
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
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const [dbBudgets, setDbBudgets] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryBudgetInput, setCategoryBudgetInput] = useState('');
  const [isSavingCategoryBudget, setIsSavingCategoryBudget] = useState(false);

  const [isRecommending, setIsRecommending] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [unusualList, setUnusualList] = useState([]);

  useEffect(() => {
    if (monthlyBudget > 0) {
      setBudgetInput(String(monthlyBudget));
    } else {
      setBudgetInput('');
    }
  }, [monthlyBudget]);

  const loadData = useCallback(async () => {
    try {
      const [budgetsData, catsData, unusualData] = await Promise.all([
        fetchBudgets(),
        fetchCategories(),
        fetchUnusualExpenses().catch(() => []),
      ]);
      setDbBudgets(budgetsData || []);
      setDbCategories(catsData || []);
      setUnusualList(unusualData || []);
    } catch (err) {
      console.warn('Failed to load user budget data', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, expenses]);

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  };

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
      await loadData();
      setIsEditingBudget(false);
    } catch (err) {
      console.error('Failed to update overall budget limit', err);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSaveCategoryLimit = async (categoryName, currentCategoryId) => {
    const num = Number(categoryBudgetInput);
    if (isNaN(num) || num <= 0) return;
    setIsSavingCategoryBudget(true);
    try {
      let targetCatId = currentCategoryId;
      if (!targetCatId) {
        const found = dbCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (found) targetCatId = found.id;
      }
      await saveBudgetLimit({ category_id: targetCatId, limit_amount: num });
      await loadData();
      setEditingCategory(null);
      setCategoryBudgetInput('');
    } catch (err) {
      console.error('Failed to save category limit', err);
    } finally {
      setIsSavingCategoryBudget(false);
    }
  };

  const handleApplyAiLimit = async (categoryName, recommendedLimit) => {
    const num = Number(recommendedLimit);
    if (!num || num <= 0) return;
    try {
      const found = dbCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      await saveBudgetLimit({
        category_id: found ? found.id : null,
        limit_amount: num,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to apply AI limit', err);
    }
  };

  const handleRecommendLimits = async () => {
    setIsRecommending(true);
    try {
      // Send ONLY real user spending
      const breakdown = Object.entries(categoryTotals).map(([catName, spent]) => ({
        category: catName,
        total: spent,
      }));

      // If current month has no spend, check historical expenses for this user
      if (breakdown.length === 0 && expenses.length > 0) {
        const hist = {};
        expenses.forEach((e) => {
          if (e.category) {
            hist[e.category] = (hist[e.category] || 0) + Number(e.amount || 0);
          }
        });
        Object.entries(hist).forEach(([catName, total]) => {
          breakdown.push({ category: catName, total: Math.round(total / 3) || total });
        });
      }

      if (breakdown.length === 0) {
        setAiRecommendation({
          advice: 'No transaction data found for your account yet. Record or import expenses to receive tailored AI budget recommendations.',
          limits: [],
        });
        return;
      }

      const sumPast = breakdown.reduce((acc, c) => acc + (Number(c.total) || 0), 0);
      const effectiveBudget = monthlyBudget > 0 ? monthlyBudget : totalSpent > 0 ? totalSpent : sumPast;
      const rec = await recommendBudgetLimits(breakdown, effectiveBudget);
      setAiRecommendation(rec);
    } catch (err) {
      console.error('Failed to get AI recommendation', err);
    } finally {
      setIsRecommending(false);
    }
  };

  const categoryAlerts = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Categories where user has actual spend this month
    Object.entries(categoryTotals).forEach(([catName, spent]) => {
      seen.add(catName.toLowerCase());
      const budgetEntry = dbBudgets.find(
        (b) => b.category_name && b.category_name.toLowerCase() === catName.toLowerCase()
      );
      const limit = budgetEntry ? budgetEntry.limit_amount : 0;
      const overBy = limit > 0 ? spent - limit : 0;
      list.push({
        id: budgetEntry?.id || catName,
        categoryId: budgetEntry?.category_id || null,
        name: catName,
        spent,
        limit,
        hasLimit: limit > 0,
        isOver: limit > 0 && spent > limit,
        overBy: Math.max(0, overBy),
        percentUsed: limit > 0 ? (spent / limit) * 100 : 0,
      });
    });

    // 2. Categories with active budget configured in DB even if spent is 0
    dbBudgets
      .filter((b) => b.category_id && !seen.has(b.category_name?.toLowerCase()))
      .forEach((b) => {
        list.push({
          id: b.id,
          categoryId: b.category_id,
          name: b.category_name,
          spent: 0,
          limit: b.limit_amount,
          hasLimit: true,
          isOver: false,
          overBy: 0,
          percentUsed: 0,
        });
      });

    return list.sort((a, b) => b.spent - a.spent);
  }, [categoryTotals, dbBudgets]);

  const exceededCategories = categoryAlerts.filter((c) => c.isOver);

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('budgetAlerts.loading')}</p>;

  return (
    <div className="space-y-6">
      {/* Overall Budget Header & Controls */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              {t('budgetAlerts.overallTitle', { month: currentMonthName })}
            </h2>
            {monthlyBudget <= 0 && (
              <p className="text-xs text-[var(--color-amber)] mt-0.5">
                No monthly budget set for your account yet. Set a budget limit to track progress.
              </p>
            )}
          </div>

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
                  placeholder="e.g. 50000"
                  className="w-28 px-2 py-1 text-xs font-semibold rounded border border-[var(--color-brand)] bg-[var(--color-surface)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveBudgetLimit}
                  disabled={isSavingBudget}
                  className="px-2.5 py-1 rounded bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)] flex items-center gap-1"
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
                {monthlyBudget > 0 ? (
                  <>
                    <Edit3 size={13} /> Change Monthly Limit
                  </>
                ) : (
                  <>
                    <PlusCircle size={13} /> Set Monthly Limit
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <StatCard
            label={t('dashboard.monthlyBudget')}
            value={monthlyBudget > 0 ? formatCurrency(budget.budget) : 'Not Set'}
          />
          <StatCard
            label={t('budgetAlerts.currentSpending')}
            value={formatCurrency(budget.totalSpent)}
            tone={monthlyBudget > 0 && budget.isExceeded ? 'bad' : 'default'}
          />
          <StatCard
            label={monthlyBudget > 0 && budget.isExceeded ? t('budgetAlerts.exceeded') : t('dashboard.remaining')}
            value={
              monthlyBudget > 0
                ? formatCurrency(budget.isExceeded ? budget.exceededBy : budget.remaining)
                : '—'
            }
            tone={monthlyBudget > 0 && budget.isExceeded ? 'bad' : 'good'}
          />
        </div>

        {monthlyBudget > 0 ? (
          <>
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
          </>
        ) : (
          <div className="p-3 rounded-md bg-[var(--color-line-soft)] text-xs text-[var(--color-ink-soft)]">
            Click <strong>Set Monthly Limit</strong> above to establish an overall budget ceiling for your business.
          </div>
        )}

        {/* AI Recommendations Card (Nemotron) */}
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

            {aiRecommendation.limits && aiRecommendation.limits.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--color-line)]">
                {aiRecommendation.limits.map((lim, idx) => (
                  <div key={idx} className="bg-[var(--color-surface)] p-2.5 rounded border border-[var(--color-line)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-[var(--color-ink)]">{lim.category}</p>
                        <button
                          type="button"
                          onClick={() => handleApplyAiLimit(lim.category, lim.recommended_limit)}
                          className="text-[10px] font-semibold text-[var(--color-brand)] hover:underline"
                          title="Apply this limit to category in database"
                        >
                          Apply Limit
                        </button>
                      </div>
                      <p className="text-xs font-bold text-[var(--color-brand)] mt-0.5">
                        ₹{Number(lim.recommended_limit).toLocaleString('en-IN')}
                      </p>
                      {lim.rationale && (
                        <p className="text-[10px] text-[var(--color-ink-soft)] mt-0.5 leading-snug">{lim.rationale}</p>
                      )}
                    </div>
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
                  {unusualList.length} Unusual Transactions Flagged for Your Account
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

      {/* Category Level Budgets */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-1">{t('budgetAlerts.categoryLevelBudgets')}</h2>
        <p className="text-xs text-[var(--color-ink-soft)] mb-4">
          {categoryAlerts.length === 0
            ? 'No category spending recorded for this month yet. Add expenses or configure category limits to view budget tracking.'
            : exceededCategories.length === 1
            ? t('budgetAlerts.overNoticeSingle')
            : exceededCategories.length > 1
            ? t('budgetAlerts.overNoticeMultiple', { count: exceededCategories.length })
            : t('budgetAlerts.allBudgetsNormal')}
        </p>

        {categoryAlerts.length === 0 ? (
          <div className="p-4 rounded-md border border-[var(--color-line)] text-center text-xs text-[var(--color-ink-soft)] bg-[var(--color-paper)]">
            No expenses recorded this month yet. Once you record transactions, categories will appear here automatically.
          </div>
        ) : (
          <div className="space-y-3">
            {categoryAlerts.map((c) => {
              const catName = t(`categoryNames.${c.name}`, c.name);
              const isCurrentlyEditing = editingCategory === c.name;

              return (
                <div key={c.id} className="border border-[var(--color-line)] rounded-lg p-4 bg-[var(--color-surface)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {catName}
                    </span>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-ink-soft)]">
                        {c.hasLimit
                          ? `${formatCurrency(c.spent)} / ${formatCurrency(c.limit)}`
                          : `${formatCurrency(c.spent)} (No limit set)`}
                      </span>

                      {isCurrentlyEditing ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[var(--color-ink-soft)]">₹</span>
                          <input
                            type="number"
                            min="500"
                            step="500"
                            value={categoryBudgetInput}
                            onChange={(e) => setCategoryBudgetInput(e.target.value)}
                            placeholder="Limit"
                            className="w-20 px-2 py-0.5 text-xs rounded border border-[var(--color-brand)] bg-[var(--color-surface)]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryLimit(c.name, c.categoryId)}
                            disabled={isSavingCategoryBudget}
                            className="px-2 py-0.5 rounded bg-[var(--color-brand)] text-white text-[11px] font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setCategoryBudgetInput('');
                            }}
                            className="p-0.5 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(c.name);
                            setCategoryBudgetInput(c.limit > 0 ? String(c.limit) : '');
                          }}
                          className="text-[11px] font-medium text-[var(--color-brand)] hover:underline"
                        >
                          {c.hasLimit ? 'Edit Limit' : '+ Set Limit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {c.hasLimit && (
                    <BudgetProgress
                      percentUsed={c.percentUsed}
                      isExceeded={c.isOver}
                    />
                  )}

                  {c.isOver && (
                    <p className="text-xs text-[var(--color-bad)] mt-2">
                      {t('budgetAlerts.categoryOverMsg', { name: catName, amount: formatCurrency(c.overBy) })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
