import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { categories as defaultCategories } from '../data/categories';
import { fetchVendors, fetchCategories } from '../services/api';
import { useExpenses } from '../context/ExpenseContext';
import { Receipt, CheckCircle2, AlertCircle, Info, CreditCard, CalendarClock, Clock } from 'lucide-react';

const emptyForm = {
  amount: '',
  category: '',
  vendor: '',
  date: '',
  notes: '',
  is_gst_bill: false,
  gst_rate: 18,
  is_inter_state: false,
  is_tax_inclusive: true,
  vendor_gstin: '',
  payment_status: 'paid', // 'paid', 'pending', 'partially_paid'
  credit_terms_days: 0,
  due_date: '',
  amount_paid: ''
};

export default function ExpenseForm({ initialValues, onSubmit, onCancel, submitLabel }) {
  const { t } = useTranslation();
  const { expenses } = useExpenses() || { expenses: [] };
  const [form, setForm] = useState(initialValues || emptyForm);
  const [errors, setErrors] = useState({});
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchVendors(), fetchCategories()]).then(([vData, cData]) => {
      if (isMounted) {
        const set = new Set();
        (vData || []).forEach((v) => { if (v.name) set.add(v.name); });
        (expenses || []).forEach((e) => { if (e.vendor) set.add(e.vendor); });
        setVendorSuggestions(Array.from(set).sort());
        if (Array.isArray(cData)) setDbCategories(cData);
      }
    });
    return () => { isMounted = false; };
  }, [expenses]);

  const categoryOptions = useMemo(() => {
    const map = new Map();
    dbCategories.forEach((c) => {
      if (c.name) map.set(c.name.toLowerCase(), c.name);
    });
    defaultCategories.forEach((c) => {
      if (!map.has(c.name.toLowerCase())) map.set(c.name.toLowerCase(), c.name);
    });
    (expenses || []).forEach((e) => {
      if (e.category) map.set(e.category.toLowerCase(), e.category);
    });
    if (form.category) {
      map.set(form.category.toLowerCase(), form.category);
    }
    return Array.from(map.values()).sort();
  }, [dbCategories, expenses, form.category]);

  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.amount || Number(form.amount) <= 0) {
      next.amount = t('expenseForm.errors.amount');
    }
    if (!form.category) {
      next.category = t('expenseForm.errors.category');
    }
    if (!form.date) {
      next.date = t('expenseForm.errors.date');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, amount: Number(form.amount) });
  };

  const resolvedSubmitLabel = submitLabel || t('common.saveExpense');

  // --- GST Logic ---
  const gstBreakdown = useMemo(() => {
    if (!form.is_gst_bill) return null;

    const amount = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.gst_rate) || 0;

    let taxable, totalTax;
    if (form.is_tax_inclusive) {
      taxable = amount / (1 + rate / 100);
      totalTax = amount - taxable;
    } else {
      taxable = amount;
      totalTax = amount * (rate / 100);
    }

    const cgst = form.is_inter_state ? 0 : totalTax / 2;
    const sgst = form.is_inter_state ? 0 : totalTax / 2;
    const igst = form.is_inter_state ? totalTax : 0;

    const blockedCategories = ['Food & Beverages', 'Personal Care', 'Club Memberships', 'Motor Vehicles (Personal)'];
    const isBlocked = blockedCategories.some(cat => form.category?.toLowerCase().includes(cat.toLowerCase()));

    return {
      taxable: taxable.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      total: (taxable + totalTax).toFixed(2),
      itc_eligible: !isBlocked
    };
  }, [form]);

  const isValidGstin = (gstin) => {
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstin);
  };

  const handleCreditTermSelect = (days) => {
    const baseDate = form.date ? new Date(form.date) : new Date();
    if (days === 0) {
      setForm((p) => ({ ...p, credit_terms_days: 0, due_date: form.date || '' }));
    } else {
      const dueDate = new Date(baseDate.getTime() + days * 86400000);
      setForm((p) => ({
        ...p,
        credit_terms_days: days,
        due_date: dueDate.toISOString().split('T')[0]
      }));
    }
  };

  const remainingOutstanding = useMemo(() => {
    const total = parseFloat(form.amount) || 0;
    if (form.payment_status === 'paid') return 0;
    if (form.payment_status === 'pending') return total;
    const paid = parseFloat(form.amount_paid) || 0;
    return Math.max(0, total - paid);
  }, [form.amount, form.payment_status, form.amount_paid]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
            {t('expenseForm.amountLabel')} <span className="text-[var(--color-bad)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-[var(--color-ink-soft)] font-medium">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange('amount')}
              placeholder={t('expenseForm.amountPlaceholder')}
              className={`w-full pl-7 pr-3 py-2 text-sm rounded-md border bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
                ${errors.amount ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
            />
          </div>
          {errors.amount && <p className="text-xs text-[var(--color-bad)] mt-1">{errors.amount}</p>}
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
            {t('expenseForm.dateLabel')} <span className="text-[var(--color-bad)]">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={handleChange('date')}
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
              ${errors.date ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
          />
          {errors.date && <p className="text-xs text-[var(--color-bad)] mt-1">{errors.date}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
            {t('expenseForm.categoryLabel')} <span className="text-[var(--color-bad)]">*</span>
          </label>
          <select
            value={form.category}
            onChange={handleChange('category')}
            className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
              ${errors.category ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
          >
            <option value="">{t('expenseForm.selectCategory')}</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {t(`categoryNames.${name}`, name)}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-[var(--color-bad)] mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
            {t('expenseForm.vendorLabel')}
          </label>
          <input
            list="vendor-options"
            value={form.vendor}
            onChange={handleChange('vendor')}
            placeholder={t('expenseForm.vendorPlaceholder')}
            className="w-full rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
          />
          <datalist id="vendor-options">
            {vendorSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      {/* GST Toggle Section */}
      <div className="p-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[var(--color-brand)]" />
            <label className="text-sm font-semibold text-[var(--color-ink)]">
              {t('expenseForm.gstInvoiceLabel', 'This is a GST Tax Invoice')}
            </label>
          </div>
          <input
            type="checkbox"
            className="w-4 h-4 accent-[var(--color-brand)]"
            checked={form.is_gst_bill}
            onChange={handleChange('is_gst_bill')}
          />
        </div>

        {form.is_gst_bill && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-line)]">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                  {t('expenseForm.gstRateLabel', 'GST Rate (%)')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[0, 5, 12, 18, 28].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, gst_rate: rate }))}
                      className={`px-3 py-1 text-xs rounded border transition-all ${
                        form.gst_rate === rate
                        ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                        : 'bg-white text-[var(--color-ink)] border-[var(--color-line)] hover:border-[var(--color-brand)]'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-paper)] border border-[var(--color-line)]">
                <span className="text-xs text-[var(--color-ink-soft)]">Inter-State (IGST)</span>
                <input
                  type="checkbox"
                  className="w-3 h-3 accent-[var(--color-brand)]"
                  checked={form.is_inter_state}
                  onChange={handleChange('is_inter_state')}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-paper)] border border-[var(--color-line)]">
                <span className="text-xs text-[var(--color-ink-soft)]">Tax Inclusive</span>
                <input
                  type="checkbox"
                  className="w-3 h-3 accent-[var(--color-brand)]"
                  checked={form.is_tax_inclusive}
                  onChange={handleChange('is_tax_inclusive')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                  {t('expenseForm.vendorGstinLabel', 'Vendor GSTIN')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={15}
                    value={form.vendor_gstin}
                    onChange={(e) => setForm(p => ({ ...p, vendor_gstin: e.target.value.toUpperCase() }))}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full px-3 py-1.5 text-xs rounded border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  {form.vendor_gstin && (
                    <div className={`absolute right-2 top-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                      isValidGstin(form.vendor_gstin)
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {isValidGstin(form.vendor_gstin) ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {isValidGstin(form.vendor_gstin) ? 'Valid' : 'Invalid Format'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-paper)] p-3 rounded-md border border-[var(--color-line)] space-y-2">
              <div className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-2">Tax Breakdown</div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-ink-soft)]">Taxable Value:</span>
                <span className="font-medium">₹{gstBreakdown?.taxable || '0.00'}</span>
              </div>
              {form.is_inter_state ? (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-ink-soft)]">IGST:</span>
                  <span className="font-medium">₹{gstBreakdown?.igst || '0.00'}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-soft)]">CGST:</span>
                    <span className="font-medium">₹{gstBreakdown?.cgst || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-soft)]">SGST:</span>
                    <span className="font-medium">₹{gstBreakdown?.sgst || '0.00'}</span>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-[var(--color-line)] flex justify-between text-sm font-bold">
                <span>Total Value:</span>
                <span>₹{gstBreakdown?.total || '0.00'}</span>
              </div>
              <div className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
                gstBreakdown?.itc_eligible
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {gstBreakdown?.itc_eligible ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{gstBreakdown?.itc_eligible ? 'Eligible for ITC' : 'Blocked ITC Sec 17(5)'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Status & Credit Terms ("Udhaari") Section */}
      <div className="p-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[var(--color-brand)]" />
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block">
                {t('expenseForm.paymentStatusTitle', 'Payment Status & Credit Terms ("Udhaari")')}
              </label>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                {t('expenseForm.paymentStatusSubtitle', 'Specify if this bill was settled upfront or purchased on vendor credit terms.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: 'paid', label: t('payables.status.paid', 'Paid (Immediate)'), icon: CheckCircle2, color: 'text-green-600' },
            { id: 'pending', label: t('payables.status.pending', 'Pending (Credit / Udhaari)'), icon: Clock, color: 'text-amber-600' },
            { id: 'partially_paid', label: t('payables.status.partiallyPaid', 'Partially Paid'), icon: CalendarClock, color: 'text-blue-600' }
          ].map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setForm(p => {
                  const nextStatus = id;
                  let nextAmountPaid = p.amount_paid;
                  if (nextStatus === 'paid') nextAmountPaid = p.amount;
                  if (nextStatus === 'pending') nextAmountPaid = 0;
                  return { ...p, payment_status: nextStatus, amount_paid: nextAmountPaid };
                });
              }}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                form.payment_status === id
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5 ring-1 ring-[var(--color-brand)]'
                  : 'border-[var(--color-line)] bg-white hover:border-[var(--color-brand)]/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold text-[var(--color-ink)]">{label}</span>
              </div>
            </button>
          ))}
        </div>

        {form.payment_status !== 'paid' && (
          <div className="pt-3 border-t border-[var(--color-line)] space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1.5">
                {t('expenseForm.creditTermPresets', 'Quick Credit Terms')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Immediate (0d)', days: 0 },
                  { label: '15 Days', days: 15 },
                  { label: '30 Days', days: 30 },
                  { label: '45 Days', days: 45 },
                  { label: '60 Days', days: 60 }
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleCreditTermSelect(days)}
                    className={`px-3 py-1 text-xs rounded border transition-all ${
                      form.credit_terms_days === days
                        ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                        : 'bg-white text-[var(--color-ink)] border-[var(--color-line)] hover:border-[var(--color-brand)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                  {t('expenseForm.dueDateLabel', 'Invoice Due Date')} <span className="text-[var(--color-bad)]">*</span>
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={handleChange('due_date')}
                  className="w-full px-3 py-1.5 text-xs rounded border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>

              {form.payment_status === 'partially_paid' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
                    {t('expenseForm.amountPaidLabel', 'Amount Paid So Far (₹)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.amount || undefined}
                    step="0.01"
                    value={form.amount_paid}
                    onChange={handleChange('amount_paid')}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-1.5 text-xs rounded border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              )}
            </div>

            {/* Outstanding liability pill */}
            <div className="p-2.5 rounded-md bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-between text-xs">
              <span className="text-[var(--color-ink-soft)] font-medium">
                Outstanding Udhaari Liability:
              </span>
              <span className="font-bold text-[var(--color-bad)] text-sm">
                ₹{remainingOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {t('expenseForm.notesLabel')}
        </label>
        <textarea
          value={form.notes}
          onChange={handleChange('notes')}
          rows={3}
          placeholder={t('expenseForm.notesPlaceholder')}
          className="w-full rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="px-5 py-2.5 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors shadow-xs"
        >
          {resolvedSubmitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-md border border-[var(--color-line)] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-line-soft)] transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
