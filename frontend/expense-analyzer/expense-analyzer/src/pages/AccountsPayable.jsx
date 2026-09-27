import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarClock,
  Search,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  ChevronRight,
  Filter,
  DollarSign,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { fetchPayablesSummary, fetchPayables, recordPayablePayment } from '../services/api';

export default function AccountsPayable() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payables, setPayables] = useState([]);
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid', 'overdue', 'paid', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('UPI');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sumData, listData] = await Promise.all([
        fetchPayablesSummary(),
        fetchPayables({ status: activeTab })
      ]);
      setSummary(sumData);
      setPayables(listData);
    } catch (err) {
      console.error(err);
      setError(t('payables.loadError', 'Failed to load payables data. Please refresh.'));
    } finally {
      setLoading(false);
    }
  }

  const openPaymentModal = (payable) => {
    setSelectedPayable(payable);
    setPayAmount(payable.outstanding_amount || payable.amount);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('UPI');
    setPayNotes('');
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedPayable(null);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayable || !payAmount || Number(payAmount) <= 0) return;

    setSubmittingPayment(true);
    try {
      await recordPayablePayment(selectedPayable.id, {
        amount_paid_now: Number(payAmount),
        payment_date: payDate,
        payment_method: payMethod,
        notes: payNotes
      });
      closePaymentModal();
      // Reload summary and invoices
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredPayables = useMemo(() => {
    if (!searchQuery) return payables;
    const q = searchQuery.toLowerCase();
    return payables.filter(p =>
      (p.vendor_name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.category_name || '').toLowerCase().includes(q)
    );
  }, [payables, searchQuery]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div>
      </div>
    );
  }

  const metrics = summary?.metrics || {};
  const agingSchedule = summary?.aging_schedule || [];
  const alerts = summary?.alerts || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">
            {t('payables.pageTitle', 'Accounts Payable & Credit Terms ("Udhaari")')}
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            {t('payables.pageSubtitle', 'Track upcoming vendor payments, credit term aging schedules, and due date alerts.')}
          </p>
        </div>
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Total Outstanding Udhaari
            </span>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-950 mb-1">
            ₹{metrics.total_outstanding?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-rose-700">Total liability pending vendor settlement</p>
        </div>

        <div className="p-5 rounded-xl border border-red-200 bg-red-50/50 shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Overdue Liabilities
            </span>
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-950 mb-1">
            ₹{metrics.overdue_amount?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-red-700">Invoices past agreed credit terms</p>
        </div>

        <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Due in Next 7 Days
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-950 mb-1">
            ₹{metrics.due_in_7_days?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-amber-700">Immediate cash outflow required</p>
        </div>

        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Settled This Month
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950 mb-1">
            ₹{metrics.settled_this_month?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-emerald-700">Vendor payments cleared this month</p>
        </div>
      </div>

      {/* Due Date Alerts Banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <ShieldAlert size={18} className="text-amber-600" />
            <span>Urgent Due Date Alerts & Overdue Notices</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert) => {
              const isOverdue = alert.days_diff < 0;
              const overdueDays = Math.abs(alert.days_diff);
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border bg-white shadow-xs flex items-center justify-between ${
                    isOverdue ? 'border-red-200' : 'border-amber-200'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <div className="font-semibold text-xs text-[var(--color-ink)] truncate max-w-[160px]">
                      {alert.vendor_name}
                    </div>
                    <div className="text-xs font-bold text-[var(--color-brand)]">
                      ₹{alert.outstanding?.toLocaleString()}
                    </div>
                    <div className="text-[10px] flex items-center gap-1 font-medium">
                      {isOverdue ? (
                        <span className="text-red-600">🚨 Overdue by {overdueDays}d</span>
                      ) : (
                        <span className="text-amber-700">⚠️ Due in {alert.days_diff}d</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPaymentModal(alert)}
                    className="px-2.5 py-1.5 rounded bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)] transition-colors whitespace-nowrap"
                  >
                    Quick Pay
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aging Schedule (30-60-90 Days) Chart */}
      <div className="p-6 rounded-xl border border-[var(--color-line)] bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Payables Aging Schedule (Liability Horizon)
            </h3>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Upcoming and overdue cash commitments grouped by days to anticipate cash crunches.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingSchedule} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val) => [`₹${val.toLocaleString()}`, 'Liability']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {agingSchedule.map((entry, index) => {
                  let fillColor = '#3b82f6';
                  if (entry.type === 'critical') fillColor = '#dc2626'; // Overdue >60d
                  else if (entry.type === 'warning') fillColor = '#f59e0b'; // Overdue 1-60d
                  else if (entry.type === 'upcoming') fillColor = '#3b82f6'; // Due in 0-30d
                  else fillColor = '#10b981'; // Safe >30d
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payables Ledger & Settlement Table */}
      <div className="p-6 rounded-xl border border-[var(--color-line)] bg-white shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Payables Ledger & Invoices
            </h3>
            <p className="text-xs text-[var(--color-ink-soft)]">
              All credit invoices with outstanding balances and payment workflows.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-[var(--color-paper)] p-1 rounded-lg border border-[var(--color-line)] text-xs font-medium">
              {[
                { id: 'unpaid', label: 'All Unpaid' },
                { id: 'overdue', label: 'Overdue Only' },
                { id: 'paid', label: 'Settled' },
                { id: 'all', label: 'All Invoices' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-[var(--color-brand)] shadow-xs font-semibold'
                      : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 text-[var(--color-ink-soft)]" size={14} />
              <input
                type="text"
                placeholder="Search vendor or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--color-line)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[var(--color-ink-soft)] text-xs">
                <th className="pb-3 font-semibold">Vendor / Payee</th>
                <th className="pb-3 font-semibold">Invoice Date</th>
                <th className="pb-3 font-semibold">Due Date & Terms</th>
                <th className="pb-3 font-semibold text-right">Total Invoice</th>
                <th className="pb-3 font-semibold text-right">Paid So Far</th>
                <th className="pb-3 font-semibold text-right">Outstanding Udhaari</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {filteredPayables.length > 0 ? (
                filteredPayables.map((item) => {
                  const isPaid = item.payment_status === 'paid';
                  const isOverdue = !isPaid && item.due_date && item.days_diff < 0;
                  const overdueDays = item.days_diff ? Math.abs(item.days_diff) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-[var(--color-paper)] transition-colors">
                      <td className="py-3.5 pr-2">
                        <div className="font-semibold text-xs text-[var(--color-ink)]">
                          {item.vendor_name}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {item.category_name}
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-[var(--color-ink)]">
                        {item.txn_date ? item.txn_date.slice(0, 10) : '—'}
                      </td>
                      <td className="py-3.5 text-xs">
                        <div className="font-medium text-[var(--color-ink)]">
                          {item.due_date ? item.due_date.slice(0, 10) : '—'}
                        </div>
                        <div className="text-[10px] text-[var(--color-ink-soft)]">
                          {item.credit_terms_days > 0 ? `${item.credit_terms_days}d credit` : 'Immediate'}
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-medium text-xs">
                        ₹{item.amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right text-xs text-green-700">
                        ₹{item.amount_paid?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3.5 text-right font-bold text-xs text-rose-600">
                        ₹{item.outstanding_amount?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3.5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 size={10} /> Settled
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle size={10} /> Overdue {overdueDays}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock size={10} /> {item.days_diff !== null ? `Due in ${item.days_diff}d` : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-center">
                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(item)}
                            className="px-3 py-1 rounded bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)] transition-colors"
                          >
                            Record Pay
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--color-ink-soft)]">Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-sm text-[var(--color-ink-soft)] italic">
                    No payables match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Settlement Modal */}
      {paymentModalOpen && selectedPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[var(--color-line)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line)]">
              <div>
                <h3 className="font-bold text-base text-[var(--color-ink)]">
                  Record Vendor Payment
                </h3>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Settle full or partial balance for {selectedPayable.vendor_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="p-1 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-line)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-soft)]">Invoice Total:</span>
                <span className="font-semibold text-[var(--color-ink)]">₹{selectedPayable.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-soft)]">Already Settled:</span>
                <span className="font-semibold text-green-700">₹{selectedPayable.amount_paid?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--color-line)]">
                <span className="font-bold text-[var(--color-ink)]">Remaining Balance:</span>
                <span className="font-bold text-rose-600 text-sm">
                  ₹{selectedPayable.outstanding_amount?.toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--color-ink)]">
                    Payment Amount (₹) <span className="text-[var(--color-bad)]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(selectedPayable.outstanding_amount)}
                    className="text-[10px] text-[var(--color-brand)] font-semibold hover:underline"
                  >
                    Pay Full (₹{selectedPayable.outstanding_amount?.toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  min="0.01"
                  max={selectedPayable.outstanding_amount}
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--color-line)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                    Payment Date <span className="text-[var(--color-bad)]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-[var(--color-line)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-[var(--color-line)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] bg-white"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Net Banking / NEFT">Net Banking (IMPS/NEFT)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1">
                  Reference Note / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR 429188491, Cheque #00412"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-[var(--color-line)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)] rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] rounded-md shadow-xs transition-colors disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
