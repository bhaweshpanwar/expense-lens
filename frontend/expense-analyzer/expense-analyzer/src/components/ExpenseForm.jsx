import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { categories as defaultCategories } from '../data/categories';
import { fetchVendors, fetchCategories } from '../services/api';
import { useExpenses } from '../context/ExpenseContext';

const emptyForm = { amount: '', category: '', vendor: '', date: '', notes: '' };

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
    // Use DB categories first
    dbCategories.forEach((c) => {
      if (c.name) map.set(c.name.toLowerCase(), c.name);
    });
    // Add default category templates if user has few categories
    defaultCategories.forEach((c) => {
      if (!map.has(c.name.toLowerCase())) map.set(c.name.toLowerCase(), c.name);
    });
    // Add any category from existing expenses or current form
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
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
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

        <div>
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

