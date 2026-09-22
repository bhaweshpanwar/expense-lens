import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { categories } from '../data/categories';
import { vendors } from '../data/vendors';

const emptyForm = { amount: '', category: '', vendor: '', date: '', notes: '' };

export default function ExpenseForm({ initialValues, onSubmit, onCancel, submitLabel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initialValues || emptyForm);
  const [errors, setErrors] = useState({});

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
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {t('expenseForm.amountLabel')} <span className="text-[var(--color-bad)]">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={handleChange('amount')}
          placeholder={t('expenseForm.amountPlaceholder')}
          className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
            ${errors.amount ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
        />
        {errors.amount && <p className="text-xs text-[var(--color-bad)] mt-1">{errors.amount}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {t('expenseForm.categoryLabel')} <span className="text-[var(--color-bad)]">*</span>
        </label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
            ${errors.category ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
        >
          <option value="">{t('expenseForm.selectCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {t(`categoryNames.${c.name}`, c.name)}
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
          className="w-full rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
        />
        <datalist id="vendor-options">
          {vendors.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">
          {t('expenseForm.dateLabel')} <span className="text-[var(--color-bad)]">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          onChange={handleChange('date')}
          className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30
            ${errors.date ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'}`}
        />
        {errors.date && <p className="text-xs text-[var(--color-bad)] mt-1">{errors.date}</p>}
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
          className="w-full rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors"
        >
          {resolvedSubmitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-[var(--color-line)] text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-line-soft)] transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

