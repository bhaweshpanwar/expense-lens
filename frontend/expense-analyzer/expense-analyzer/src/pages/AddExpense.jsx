import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, FileSpreadsheet, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { analyzeReceiptImage } from '../services/api';
import ExpenseForm from '../components/ExpenseForm';

export default function AddExpense() {
  const { addExpense } = useExpenses();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [initialFormValues, setInitialFormValues] = useState({
    amount: '',
    category: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [isScanning, setIsScanning] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // { type: 'success' | 'info' | 'error', message: '' }
  const [csvNotice, setCsvNotice] = useState(null);

  const imageInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const handleImageClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
      imageInputRef.current.click();
    }
  };

  const handleCsvClick = () => {
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
      csvInputRef.current.click();
    }
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setAiStatus(null);
    setCsvNotice(null);

    try {
      const extracted = await analyzeReceiptImage(file);
      setInitialFormValues((prev) => ({
        ...prev,
        amount: extracted.amount || prev.amount,
        vendor: extracted.vendor || prev.vendor,
        category: extracted.category || prev.category,
        date: extracted.date || prev.date,
        notes: extracted.raw_text ? `Receipt: ${file.name}` : prev.notes,
      }));

      if (extracted.vendor || extracted.amount) {
        setAiStatus({
          type: 'success',
          message: `AI extracted details from ${file.name}. Please review below!`,
        });
      } else {
        setAiStatus({
          type: 'info',
          message: `Uploaded ${file.name}. AI could not read all fields clearly; please fill in any missing details.`,
        });
      }
    } catch (err) {
      console.error('Receipt scan failed', err);
      setAiStatus({
        type: 'error',
        message: 'Could not connect to AI service. You can still enter details manually.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCsvSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiStatus(null);
    setCsvNotice(`Selected CSV: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). CSV batch parsing pipeline staged for Phase 3.`);
  };

  const handleSubmit = async (values) => {
    await addExpense(values);
    navigate('/expenses');
  };

  return (
    <div className="max-w-lg space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleImageSelected}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvSelected}
      />

      {/* Quick Upload Action Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wider">
            Quick Add & Import
          </span>
          <span className="text-[11px] text-[var(--color-brand)] font-medium flex items-center gap-1">
            <Sparkles size={13} /> AI Assisted
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isScanning}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-[var(--color-line)] hover:border-[var(--color-brand)] hover:bg-[var(--color-line-soft)] text-xs font-medium text-[var(--color-ink)] transition-colors disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 size={16} className="animate-spin text-[var(--color-brand)]" />
            ) : (
              <Camera size={16} className="text-[var(--color-brand)]" />
            )}
            <span>{isScanning ? 'Scanning...' : 'Upload Receipt (AI)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCsvClick}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-[var(--color-line)] hover:border-[var(--color-brand)] hover:bg-[var(--color-line-soft)] text-xs font-medium text-[var(--color-ink)] transition-colors"
          >
            <FileSpreadsheet size={16} className="text-[var(--color-ink-soft)]" />
            <span>Import CSV</span>
          </button>
        </div>

        {/* AI Status Alert */}
        {aiStatus && (
          <div
            className={`mt-3 p-2.5 rounded-md text-xs flex items-center gap-2 ${
              aiStatus.type === 'success'
                ? 'bg-[var(--color-good-light)] text-[var(--color-good)] border border-[var(--color-good)]/30'
                : aiStatus.type === 'error'
                ? 'bg-[var(--color-bad-light)] text-[var(--color-bad)] border border-[var(--color-bad)]/30'
                : 'bg-[var(--color-amber-light)] text-[var(--color-amber)] border border-[var(--color-amber)]/30'
            }`}
          >
            {aiStatus.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            <span>{aiStatus.message}</span>
          </div>
        )}

        {/* CSV Staged Notice */}
        {csvNotice && (
          <div className="mt-3 p-2.5 rounded-md text-xs flex items-center gap-2 bg-[var(--color-line-soft)] border border-[var(--color-line)] text-[var(--color-ink)]">
            <FileSpreadsheet size={15} className="text-[var(--color-brand)] shrink-0" />
            <span>{csvNotice}</span>
          </div>
        )}
      </div>

      {/* Main Expense Form */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-6">
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-5">{t('addExpense.newExpense')}</h2>
        <ExpenseForm
          initialValues={initialFormValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/expenses')}
          submitLabel={t('common.addExpense')}
        />
      </div>
    </div>
  );
}


