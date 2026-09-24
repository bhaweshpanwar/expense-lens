import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, PiggyBank, ArrowDownRight, CheckCircle2, Loader2, Target, AlertCircle } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { getSavingsSuggestion, createSavingsGoal } from '../services/api';
import CategoryChart from '../components/CategoryChart';
import VendorChart from '../components/VendorChart';
import MonthlyExpenseChart from '../components/MonthlyExpenseChart';
import StatCard from '../components/StatCard';
import {
  formatCurrency,
  getCategoryBreakdown,
  getDateRangeForPreset,
  getMonthlyTrend,
  getTopVendors,
  getTotalSpent,
  isWithinRange,
} from '../utils/expenseCalculations';

const presets = [
  { id: 'this-month', key: 'analysis.presets.thisMonth' },
  { id: 'last-month', key: 'analysis.presets.lastMonth' },
  { id: 'last-3-months', key: 'analysis.presets.last3Months' },
  { id: 'custom', key: 'analysis.presets.custom' },
];

export default function ExpenseAnalysis() {
  const { expenses, isLoading } = useExpenses();
  const { t, i18n } = useTranslation();
  const [preset, setPreset] = useState('last-3-months');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // "Save Money" AI Advisor State
  const [targetSaveAmount, setTargetSaveAmount] = useState('10000');
  const [isAnalyzingSavings, setIsAnalyzingSavings] = useState(false);
  const [savingsPlan, setSavingsPlan] = useState(null);
  const [savingsError, setSavingsError] = useState(null);
  const [goalSavedNotice, setGoalSavedNotice] = useState(null);

  const handleAnalyzeSavings = async () => {
    const num = Number(targetSaveAmount);
    if (!num || num <= 0) return;
    setIsAnalyzingSavings(true);
    setGoalSavedNotice(null);
    setSavingsError(null);
    try {
      const plan = await getSavingsSuggestion(num);
      if (plan && plan.success !== false) {
        setSavingsPlan(plan);
      } else {
        setSavingsError(plan?.error || 'Unable to generate savings advice. Please ensure you have recorded expenses.');
      }
    } catch (err) {
      console.error('Failed to get savings suggestions', err);
      setSavingsError(err.response?.data?.error || 'AI savings analysis encountered an error. Please try again.');
    } finally {
      setIsAnalyzingSavings(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!savingsPlan) return;
    try {
      await createSavingsGoal({
        target_amount: savingsPlan.target_monthly_save * 6,
        monthly_save_amount: savingsPlan.target_monthly_save,
      });
      setGoalSavedNotice(
        `Savings goal saved to database! Target: ₹${savingsPlan.target_monthly_save.toLocaleString('en-IN')}/month.`
      );
      setTimeout(() => setGoalSavedNotice(null), 5000);
    } catch (err) {
      console.error('Failed to save goal', err);
    }
  };

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';

  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  };

  const range = useMemo(() => {
    if (preset === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    return getDateRangeForPreset(preset === 'custom' ? 'all' : preset);
  }, [preset, customStart, customEnd]);

  const filtered = useMemo(
    () => expenses.filter((e) => isWithinRange(e.date, range.start, range.end)),
    [expenses, range]
  );

  if (isLoading) return <p className="text-sm text-[var(--color-ink-soft)]">{t('analysis.loading')}</p>;

  const totalSpent = getTotalSpent(filtered);
  const categoryBreakdown = getCategoryBreakdown(filtered);
  const topVendors = getTopVendors(filtered, 6);
  const trend = getMonthlyTrend(filtered).map((tr) => ({
    ...tr,
    month: formatMonth(tr.key),
  }));

  const topCategoryName = categoryBreakdown[0]?.category;
  const translatedTopCategory = topCategoryName
    ? t(`categoryNames.${topCategoryName}`, topCategoryName)
    : '—';

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${preset === p.id
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-line-soft)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]'
                }`}
            >
              {t(p.key)}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-sm"
              />
              <span className="text-[var(--color-ink-soft)] text-sm">{t('analysis.to')}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('analysis.totalSpentRange')} value={formatCurrency(totalSpent)} />
        <StatCard label={t('analysis.transactions')} value={filtered.length} />
        <StatCard
          label={t('analysis.topCategory')}
          value={translatedTopCategory}
          hint={categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0].total) : ''}
        />
      </div>

      {/* Save Money — AI Expense Advisor */}
      <section className="bg-[var(--color-surface)] border-2 border-[var(--color-brand)]/40 rounded-xl p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--color-line)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center shrink-0">
              <PiggyBank size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-ink)]">Save Money — AI Expense Advisor</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[var(--color-amber-light)] text-[var(--color-amber)] border border-[var(--color-amber)]/30">
                  <Sparkles size={11} /> Nemotron AI
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                Set how much you want to save this month. AI analyzes your past transactions to recommend exact category cuts and actions.
              </p>
            </div>
          </div>
        </div>

        {/* Input & Target Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-ink-soft)]">₹</span>
            <input
              type="number"
              min="500"
              step="500"
              value={targetSaveAmount}
              onChange={(e) => setTargetSaveAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full pl-7 pr-3 py-2 text-sm font-semibold rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['5000', '10000', '15000', '25000'].map((presetVal) => (
              <button
                key={presetVal}
                type="button"
                onClick={() => setTargetSaveAmount(presetVal)}
                className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                  targetSaveAmount === presetVal
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)] font-medium'
                    : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
                }`}
              >
                ₹{Number(presetVal).toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAnalyzeSavings}
            disabled={isAnalyzingSavings}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors disabled:opacity-50 shrink-0"
          >
            {isAnalyzingSavings ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Analyzing with Nemotron...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Analyze Savings (AI)</span>
              </>
            )}
          </button>
        </div>

        {/* AI Error Alert */}
        {savingsError && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--color-bad-light)] text-[var(--color-bad)] border border-[var(--color-bad)]/30 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{savingsError}</span>
          </div>
        )}

        {/* AI Recommendations Display */}
        {savingsPlan && (
          <div className="mt-4 pt-4 border-t border-[var(--color-line)] space-y-4">
            {/* Feasibility & Assessment Banner */}
            <div className="p-3.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider">Feasibility:</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${
                      savingsPlan.feasibility === 'easy'
                        ? 'bg-[var(--color-good-light)] text-[var(--color-good)]'
                        : savingsPlan.feasibility === 'moderate'
                        ? 'bg-[var(--color-amber-light)] text-[var(--color-amber)]'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    }`}
                  >
                    {savingsPlan.feasibility}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">{savingsPlan.summary}</p>
              </div>

              <button
                type="button"
                onClick={handleSaveGoal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-good)] text-white text-xs font-semibold hover:opacity-90 shrink-0 transition-opacity"
              >
                <Target size={14} /> Save as Active Goal
              </button>
            </div>

            {/* Goal saved feedback */}
            {goalSavedNotice && (
              <div className="p-2.5 rounded-md bg-[var(--color-good-light)] text-[var(--color-good)] border border-[var(--color-good)]/30 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{goalSavedNotice}</span>
              </div>
            )}

            {/* Category Cuts Breakdown */}
            {savingsPlan.suggestions && savingsPlan.suggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider mb-2">
                  Recommended Category Reductions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savingsPlan.suggestions.map((s, idx) => (
                    <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[var(--color-ink)]">
                          {t(`categoryNames.${s.category}`, s.category)}
                        </span>
                        <span className="text-xs font-bold text-[var(--color-good)] flex items-center">
                          <ArrowDownRight size={13} /> -₹{Math.round(s.suggested_cut).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-soft)] mb-2">
                        Avg monthly spend: ₹{Math.round(s.current_monthly_avg || 0).toLocaleString('en-IN')}
                      </p>
                      {s.tip && (
                        <p className="text-[11px] text-[var(--color-ink)] bg-[var(--color-line-soft)] p-1.5 rounded">
                          💡 {s.tip}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Action Plan */}
            {savingsPlan.action_plan && savingsPlan.action_plan.length > 0 && (
              <div className="bg-[var(--color-paper)] p-3.5 rounded-lg border border-[var(--color-line)]">
                <h3 className="text-xs font-semibold text-[var(--color-brand)] uppercase tracking-wider mb-2">
                  Tactical Action Plan
                </h3>
                <ul className="space-y-1.5">
                  {savingsPlan.action_plan.map((act, i) => (
                    <li key={i} className="text-xs text-[var(--color-ink)] flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-[var(--color-good)] shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('analysis.categoryAnalysis')}</h2>
        <p className="text-xs text-[var(--color-ink-soft)] mb-3">{t('analysis.categoryAnalysisDesc')}</p>
        <CategoryChart
          data={categoryBreakdown.map((c) => ({
            category: t(`categoryNames.${c.category}`, c.category),
            total: c.total,
          }))}
        />
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('analysis.vendorAnalysis')}</h2>
        <p className="text-xs text-[var(--color-ink-soft)] mb-3">{t('analysis.vendorAnalysisDesc')}</p>
        <VendorChart data={topVendors.map((v) => ({ vendor: v.vendor, total: v.total }))} />
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">{t('analysis.monthlySpendingTrend')}</h2>
        <MonthlyExpenseChart data={trend} />
      </section>
    </div>
  );
}

