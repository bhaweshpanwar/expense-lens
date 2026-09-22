// All analytics are derived from the raw transaction list rather than
// hard-coded, so the numbers stay correct as expenses are added/edited/removed.

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const monthKey = (dateStr) => dateStr.slice(0, 7); // "2026-09"

export const monthLabel = (key) => {
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
};

export const getTotalSpent = (expenses) =>
  expenses.reduce((sum, e) => sum + Number(e.amount), 0);

export const getExpensesForMonth = (expenses, key) =>
  expenses.filter((e) => monthKey(e.date) === key);

export const getCurrentMonthKey = () => {
  const now = new Date('2026-09-22'); // fixed "today" for this business's current period
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getPreviousMonthKey = (key) => {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getCategoryTotals = (expenses) => {
  const totals = {};
  expenses.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });
  return totals;
};

export const getVendorTotals = (expenses) => {
  const totals = {};
  expenses.forEach((e) => {
    totals[e.vendor] = (totals[e.vendor] || 0) + Number(e.amount);
  });
  return totals;
};

export const getMonthlyTrend = (expenses) => {
  const totals = {};
  expenses.forEach((e) => {
    const key = monthKey(e.date);
    totals[key] = (totals[key] || 0) + Number(e.amount);
  });
  return Object.keys(totals)
    .sort()
    .map((key) => ({ month: monthLabel(key), key, total: totals[key] }));
};

export const getBudgetSummary = (totalSpent, budget) => {
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;
  return {
    budget,
    totalSpent,
    remaining,
    percentUsed,
    isExceeded: totalSpent > budget,
    exceededBy: totalSpent > budget ? totalSpent - budget : 0,
  };
};

export const getTopVendors = (expenses, limit = 5) => {
  const totals = getVendorTotals(expenses);
  return Object.entries(totals)
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

export const getCategoryBreakdown = (expenses) => {
  const totals = getCategoryTotals(expenses);
  const grandTotal = getTotalSpent(expenses);
  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      total,
      percent: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

// Simple date-range presets used on the Expense Analysis page
export const getDateRangeForPreset = (preset, referenceDateStr = '2026-09-22') => {
  const ref = new Date(referenceDateStr);
  const endOfRef = new Date(ref);

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  switch (preset) {
    case 'this-month':
      return { start: startOfMonth(ref), end: endOfRef };
    case 'last-month': {
      const lastMonthRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
      return { start: startOfMonth(lastMonthRef), end: endOfMonth(lastMonthRef) };
    }
    case 'last-3-months': {
      const start = new Date(ref.getFullYear(), ref.getMonth() - 2, 1);
      return { start, end: endOfRef };
    }
    default:
      return { start: new Date('2000-01-01'), end: endOfRef };
  }
};

export const isWithinRange = (dateStr, start, end) => {
  const d = new Date(dateStr);
  return d >= start && d <= end;
};
