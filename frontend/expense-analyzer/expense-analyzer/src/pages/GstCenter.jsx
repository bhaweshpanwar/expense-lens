import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Search,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Calendar,
  Filter,
  Receipt,
  CheckCircle2,
  Info
} from 'lucide-react';
import { fetchGstSummary, downloadGstr2bCsv } from '../services/api';

export default function GstCenter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [searchQuery, setSearchQuery] = useState('');

  const datePresets = {
    thisMonth: { label: t('analysis.presets.thisMonth'), from: getFirstDayOfMonth(), to: new Date().toISOString().split('T')[0] },
    lastMonth: { label: t('analysis.presets.lastMonth'), from: getLastMonthStart(), to: getLastMonthEnd() },
    custom: { label: t('analysis.presets.custom'), from: '', to: '' },
  };

  useEffect(() => {
    loadGstData();
  }, [dateRange]);

  async function loadGstData() {
    setLoading(true);
    setError(null);
    try {
      const range = datePresets[dateRange];
      const data = await fetchGstSummary({ from: range.from, to: range.to });
      setSummary(data);
    } catch (err) {
      setError('Failed to load GST summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const range = datePresets[dateRange];
      await downloadGstr2bCsv({ from: range.from, to: range.to });
    } catch (err) {
      alert('Export failed. Please check your connection.');
    }
  }

  const filteredVendors = useMemo(() => {
    if (!summary?.vendor_summary) return [];
    return summary.vendor_summary.filter(v =>
      v.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vendor_gstin.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [summary, searchQuery]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-[var(--color-bad)] mb-4">{error}</p>
      <button onClick={loadGstData} className="px-4 py-2 bg-[var(--color-brand)] text-white rounded-md">Retry</button>
    </div>
  );

  const { metrics, rate_breakdown, vendor_summary } = summary || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">
            {t('meta.taxCenterTitle')}
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {t('meta.taxCenterSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md p-1">
            {Object.entries(datePresets).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className={`px-3 py-1 text-xs rounded-sm transition-all ${
                  dateRange === key
                  ? 'bg-white text-[var(--color-brand)] shadow-sm font-medium'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white rounded-md text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors shadow-sm"
          >
            <Download size={16} />
            Export GSTR-2B
          </button>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Eligible ITC"
          value={metrics?.eligible_itc}
          icon={<ShieldCheck className="text-green-600" />}
          hint="Can be offset against sales GST liability"
          color="green"
        />
        <MetricCard
          title="Total GST Paid"
          value={metrics?.total_gst_paid}
          icon={<TrendingUp className="text-blue-600" />}
          hint="Sum of all CGST, SGST, and IGST"
          color="blue"
        />
        <MetricCard
          title="Blocked ITC"
          value={metrics?.blocked_itc}
          icon={<ShieldAlert className="text-amber-600" />}
          hint="Expenses blocked under Section 17(5)"
          color="amber"
        />
        <MetricCard
          title="Registered Spend"
          value={`${((metrics?.gst_registered_spend / (metrics?.total_expenses || 1)) * 100).toFixed(1)}%`}
          icon={<Receipt className="text-purple-600" />}
          hint="Procured from GST-registered vendors"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rate Slabs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider mb-4">GST Rate Slabs</h3>
            <div className="space-y-3">
              {rate_breakdown?.map(({ rate, count, taxable_amount, total_tax }) => (
                <div key={rate} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-line)]">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-[var(--color-brand)] text-white text-[10px] font-bold rounded-full">{rate}</span>
                    <span className="text-xs text-[var(--color-ink-soft)]">{count} Invoices</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[var(--color-ink)]">₹{total_tax?.toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--color-ink-soft)]">Taxable: ₹{taxable_amount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor Audit Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-wider">Vendor Tax Audit</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2 text-[var(--color-ink-soft)]" size={14} />
                <input
                  type="text"
                  placeholder="Filter vendor or GSTIN..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-[var(--color-line)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-[var(--color-ink-soft)] text-xs">
                    <th className="pb-2 font-medium">Vendor / Payee</th>
                    <th className="pb-2 font-medium">GSTIN</th>
                    <th className="pb-2 font-medium text-right">Taxable (₹)</th>
                    <th className="pb-2 font-medium text-right">Tax (₹)</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {filteredVendors.length > 0 ? filteredVendors.map((v, i) => (
                    <tr key={i} className="hover:bg-[var(--color-paper)] transition-colors">
                      <td className="py-3 font-medium text-[var(--color-ink)]">{v.vendor_name}</td>
                      <td className="py-3 text-xs font-mono text-[var(--color-ink-soft)]">{v.vendor_gstin}</td>
                      <td className="py-3 text-right">{v.taxable_value?.toLocaleString()}</td>
                      <td className="py-3 text-right font-medium">{v.tax_paid?.toLocaleString()}</td>
                      <td className="py-3 text-center">
                        <StatusBadge status={v.itc_status} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-sm text-[var(--color-ink-soft)] italic">
                        No GST expenses found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, hint, color }) {
  const colors = {
    green: 'bg-green-50 border-green-100 text-green-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]} shadow-sm transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{title}</span>
        <div className="p-2 rounded-lg bg-white/50 shadow-sm">{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-1">
        {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
      </div>
      <p className="text-[10px] opacity-70 leading-relaxed">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Eligible: { class: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={10} />, label: 'Eligible' },
    Blocked: { class: 'bg-amber-100 text-amber-700 border-amber-200', icon: <ShieldAlert size={10} />, label: 'Blocked' },
    Unregistered: { class: 'bg-gray-100 text-gray-600 border-gray-200', icon: <XCircle size={10} />, label: 'Unreg' },
    Mixed: { class: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info size={10} />, label: 'Mixed' },
  };
  const current = config[status] || config.Unregistered;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${current.class}`}>
      {current.icon} {current.label}
    </span>
  );
}

// Helpers for date range (usually these would be in a utility file)
function getFirstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getLastMonthStart() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function getLastMonthEnd() {
  const d = new Date();
  d.setMonth(d.getMonth(), 0);
  return d.toISOString().split('T')[0];
}
