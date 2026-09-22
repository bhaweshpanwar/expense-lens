import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import ExpenseTable from '../components/ExpenseTable';
import Modal from '../components/Modal';
import { categories } from '../data/categories';
import { vendors } from '../data/vendors';
import { formatCurrency } from '../utils/expenseCalculations';

export default function Expenses() {
  const { expenses, removeExpense } = useExpenses();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [viewingExpense, setViewingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !search ||
        e.vendor.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        (e.notes || '').toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !categoryFilter || e.category === categoryFilter;
      const matchesVendor = !vendorFilter || e.vendor === vendorFilter;
      const matchesStart = !startDate || e.date >= startDate;
      const matchesEnd = !endDate || e.date <= endDate;

      return matchesSearch && matchesCategory && matchesVendor && matchesStart && matchesEnd;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, search, categoryFilter, vendorFilter, startDate, endDate]);

  const clearFilters = () => {
    setCategoryFilter('');
    setVendorFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await removeExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('expenses.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
          />
        </div>
        <button
          onClick={() => navigate('/expenses/new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors shrink-0"
        >
          <Plus size={16} /> {t('expenses.addExpense')}
        </button>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)]"
          >
            <option value="">{t('common.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {t(`categoryNames.${c.name}`, c.name)}
              </option>
            ))}
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)]"
          >
            <option value="">{t('common.allVendors')}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)]"
            aria-label={t('common.startDate')}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm bg-[var(--color-surface)]"
            aria-label={t('common.endDate')}
          />

          <button
            onClick={clearFilters}
            className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
          >
            {t('common.clearFilters')}
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-2">
        <ExpenseTable
          expenses={filtered}
          onView={setViewingExpense}
          onEdit={(e) => navigate(`/expenses/${e.id}/edit`)}
          onDelete={setDeletingExpense}
        />
      </div>

      {viewingExpense && (
        <Modal title={t('expenses.detailsTitle')} onClose={() => setViewingExpense(null)}>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">{t('common.date')}</dt>
              <dd className="font-medium">{viewingExpense.date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">{t('common.vendor')}</dt>
              <dd className="font-medium">{viewingExpense.vendor}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">{t('common.category')}</dt>
              <dd className="font-medium">{t(`categoryNames.${viewingExpense.category}`, viewingExpense.category)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink-soft)]">{t('common.amount')}</dt>
              <dd className="font-semibold tabular">{formatCurrency(viewingExpense.amount)}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-soft)] mb-1">{t('common.notes')}</dt>
              <dd className="text-[var(--color-ink)]">{viewingExpense.notes || '—'}</dd>
            </div>
          </dl>
        </Modal>
      )}

      {deletingExpense && (
        <Modal
          title={t('expenses.deleteTitle')}
          onClose={() => setDeletingExpense(null)}
          footer={
            <>
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-md border border-[var(--color-line)] text-sm font-medium hover:bg-[var(--color-line-soft)]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-md bg-[var(--color-bad)] text-white text-sm font-medium hover:opacity-90"
              >
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm text-[var(--color-ink-soft)]">
            {t('expenses.deleteConfirm', {
              amount: formatCurrency(deletingExpense.amount),
              vendor: deletingExpense.vendor,
              date: deletingExpense.date,
            })}
          </p>
        </Modal>
      )}
    </div>
  );
}

