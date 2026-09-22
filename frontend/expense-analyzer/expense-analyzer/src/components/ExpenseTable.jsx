import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/expenseCalculations';

export default function ExpenseTable({ expenses, onView, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

  if (expenses.length === 0) {
    return (
      <div className="text-center py-14 text-sm text-[var(--color-ink-soft)]">
        {t('expenses.noExpenses')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left">
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.date')}</th>
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.vendor')}</th>
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.category')}</th>
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)] text-right">{t('common.amount')}</th>
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)]">{t('common.notes')}</th>
            <th className="py-2.5 px-3 font-medium text-[var(--color-ink-soft)] text-right">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-b border-[var(--color-line-soft)] hover:bg-[var(--color-line-soft)]/50 transition-colors">
              <td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-ink-soft)]">{formatDate(e.date)}</td>
              <td className="py-2.5 px-3 font-medium text-[var(--color-ink)]">{e.vendor}</td>
              <td className="py-2.5 px-3">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-[var(--color-brand-light)] text-[var(--color-brand)]">
                  {t(`categoryNames.${e.category}`, e.category)}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right tabular font-medium text-[var(--color-ink)]">{formatCurrency(e.amount)}</td>
              <td className="py-2.5 px-3 text-[var(--color-ink-soft)] max-w-[200px] truncate">{e.notes}</td>
              <td className="py-2.5 px-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onView(e)}
                    className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-brand)]"
                    aria-label={t('expenses.viewAria', { vendor: e.vendor })}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => onEdit(e)}
                    className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-brand)]"
                    aria-label={t('expenses.editAria', { vendor: e.vendor })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(e)}
                    className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-bad)]"
                    aria-label={t('expenses.deleteAria', { vendor: e.vendor })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

