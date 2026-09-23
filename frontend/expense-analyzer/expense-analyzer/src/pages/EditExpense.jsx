import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useExpenses } from '../context/ExpenseContext';
import ExpenseForm from '../components/ExpenseForm';

export default function EditExpense() {
  const { id } = useParams();
  const { expenses, editExpense } = useExpenses();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const expense = expenses.find((e) => e.id === id);

  if (!expense) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-6 max-w-lg">
        <p className="text-sm text-[var(--color-ink-soft)]">{t('editExpense.notFound')}</p>
        <button
          onClick={() => navigate('/expenses')}
          className="mt-4 px-4 py-2 rounded-md border border-[var(--color-line)] text-sm font-medium hover:bg-[var(--color-line-soft)]"
        >
          {t('editExpense.backButton')}
        </button>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    await editExpense(id, values);
    navigate('/expenses');
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-5">
          {t('editExpense.title', { vendor: expense.vendor })}
        </h2>
        <ExpenseForm
          initialValues={{
            amount: expense.amount,
            category: expense.category,
            vendor: expense.vendor,
            date: expense.date,
            notes: expense.notes || '',
          }}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/expenses')}
          submitLabel={t('common.saveChanges')}
        />
      </div>
    </div>
  );
}

