import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  BookOpen,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  X,
  Receipt,
  Layers,
} from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { analyzeReceiptImage, analyzeLedgerImage } from '../services/api';
import { categories } from '../data/categories';
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

  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [isScanningLedger, setIsScanningLedger] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // { type: 'success' | 'info' | 'error', message: '' }
  const [csvNotice, setCsvNotice] = useState(null);

  // Multi-item ledger state
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [isImportingBatch, setIsImportingBatch] = useState(false);
  const [batchNotice, setBatchNotice] = useState(null);

  const receiptInputRef = useRef(null);
  const ledgerInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const handleReceiptClick = () => {
    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
      receiptInputRef.current.click();
    }
  };

  const handleLedgerClick = () => {
    if (ledgerInputRef.current) {
      ledgerInputRef.current.value = '';
      ledgerInputRef.current.click();
    }
  };

  const handleCsvClick = () => {
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
      csvInputRef.current.click();
    }
  };

  const handleReceiptSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningReceipt(true);
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
          message: `AI extracted details from "${file.name}". Single expense form fields below are filled for review!`,
        });
      } else {
        setAiStatus({
          type: 'info',
          message: `Uploaded "${file.name}". AI could not read all fields clearly; please review and fill in missing fields.`,
        });
      }
    } catch (err) {
      console.error('Receipt scan failed', err);
      setAiStatus({
        type: 'error',
        message: 'Could not connect to AI service. You can still enter details manually.',
      });
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleLedgerSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningLedger(true);
    setAiStatus(null);
    setCsvNotice(null);
    setBatchNotice(null);

    try {
      const res = await analyzeLedgerImage(file);
      if (res.success && res.transactions?.length > 0) {
        const mapped = res.transactions.map((t, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          selected: true,
          vendor: t.vendor || '',
          amount: t.amount || '',
          category: t.category || 'Other',
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || '',
        }));
        setLedgerTransactions(mapped);
        setAiStatus({
          type: 'success',
          message: `AI Vision recognized ${mapped.length} transactions from ledger "${file.name}"! Review each item in the table below and click "Batch Import".`,
        });
      } else {
        setAiStatus({
          type: 'info',
          message: `Uploaded "${file.name}". Could not detect structured ledger lines. Please try a well-lit photo of the ledger page.`,
        });
      }
    } catch (err) {
      console.error('Ledger scan failed', err);
      setAiStatus({
        type: 'error',
        message: 'Could not connect to AI service for ledger scanning. Please check your network or try again.',
      });
    } finally {
      setIsScanningLedger(false);
    }
  };

  const handleCsvSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiStatus(null);
    setCsvNotice(`Selected CSV: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). CSV batch parsing pipeline ready.`);
  };

  // Ledger Table Row Handlers
  const handleRowChange = (id, field, value) => {
    setLedgerTransactions((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleToggleRow = (id) => {
    setLedgerTransactions((prev) =>
      prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row))
    );
  };

  const allSelected = useMemo(
    () => ledgerTransactions.length > 0 && ledgerTransactions.every((r) => r.selected),
    [ledgerTransactions]
  );

  const handleToggleSelectAll = () => {
    const nextVal = !allSelected;
    setLedgerTransactions((prev) => prev.map((r) => ({ ...r, selected: nextVal })));
  };

  const handleDeleteRow = (id) => {
    setLedgerTransactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddBlankRow = () => {
    setLedgerTransactions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        selected: true,
        vendor: '',
        amount: '',
        category: 'Raw Materials',
        date: new Date().toISOString().split('T')[0],
        description: '',
      },
    ]);
  };

  const selectedTransactions = useMemo(
    () => ledgerTransactions.filter((r) => r.selected && Number(r.amount) > 0),
    [ledgerTransactions]
  );

  const totalSelectedAmount = useMemo(
    () => selectedTransactions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [selectedTransactions]
  );

  const handleBatchImport = async () => {
    if (selectedTransactions.length === 0) return;

    setIsImportingBatch(true);
    setBatchNotice(null);
    let successCount = 0;

    try {
      for (const item of selectedTransactions) {
        await addExpense({
          amount: Number(item.amount),
          category: item.category || 'Other',
          vendor: item.vendor || 'Unknown Payee',
          date: item.date,
          notes: item.description ? `Ledger note: ${item.description}` : 'Imported from Daily Ledger',
        });
        successCount++;
      }

      setBatchNotice(`Successfully imported ${successCount} transactions to your business expenses!`);
      setLedgerTransactions((prev) => prev.filter((r) => !r.selected));

      setTimeout(() => {
        navigate('/expenses');
      }, 1500);
    } catch (err) {
      console.error('Batch import failed', err);
      setBatchNotice(`Saved ${successCount} transactions, but encountered an issue with the remaining.`);
    } finally {
      setIsImportingBatch(false);
    }
  };

  const handleSubmit = async (values) => {
    await addExpense(values);
    navigate('/expenses');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Hidden File Inputs */}
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleReceiptSelected}
      />
      <input
        ref={ledgerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleLedgerSelected}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvSelected}
      />

      {/* Quick Action Top Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[var(--color-line)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
              <span>Quick Import & AI OCR Hub</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
                MSME Powered
              </span>
            </h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
              Upload single receipts, snap your handwritten daily ledger diary, or import CSV files.
            </p>
          </div>
          <span className="text-xs text-[var(--color-brand)] font-medium flex items-center gap-1 self-start sm:self-auto">
            <Sparkles size={14} /> NVIDIA Vision AI Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Single Receipt */}
          <button
            type="button"
            onClick={handleReceiptClick}
            disabled={isScanningReceipt || isScanningLedger}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 text-xs font-semibold text-[var(--color-ink)] transition-colors disabled:opacity-50"
          >
            {isScanningReceipt ? (
              <Loader2 size={16} className="animate-spin text-[var(--color-brand)]" />
            ) : (
              <Camera size={16} className="text-[var(--color-brand)]" />
            )}
            <span>{isScanningReceipt ? 'Reading Receipt...' : 'Upload Single Receipt (AI)'}</span>
          </button>

          {/* 2. Multi-Item Ledger */}
          <button
            type="button"
            onClick={handleLedgerClick}
            disabled={isScanningReceipt || isScanningLedger}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-[var(--color-brand)] bg-[var(--color-brand)]/10 hover:bg-[var(--color-brand)]/15 text-xs font-bold text-[var(--color-brand)] transition-colors disabled:opacity-50 shadow-xs"
          >
            {isScanningLedger ? (
              <Loader2 size={16} className="animate-spin text-[var(--color-brand)]" />
            ) : (
              <BookOpen size={16} className="text-[var(--color-brand)]" />
            )}
            <span>{isScanningLedger ? 'Scanning Ledger Diary...' : 'Scan Daily Ledger / Diary (AI)'}</span>
          </button>

          {/* 3. CSV Import */}
          <button
            type="button"
            onClick={handleCsvClick}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-brand)] hover:bg-[var(--color-line-soft)] text-xs font-semibold text-[var(--color-ink)] transition-colors"
          >
            <FileSpreadsheet size={16} className="text-[var(--color-ink-soft)]" />
            <span>Import CSV Records</span>
          </button>
        </div>

        {/* AI Status Banner */}
        {aiStatus && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
              aiStatus.type === 'success'
                ? 'bg-[var(--color-good-light)] text-[var(--color-good)] border border-[var(--color-good)]/30'
                : aiStatus.type === 'error'
                ? 'bg-[var(--color-bad-light)] text-[var(--color-bad)] border border-[var(--color-bad)]/30'
                : 'bg-[var(--color-amber-light)] text-[var(--color-amber)] border border-[var(--color-amber)]/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {aiStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{aiStatus.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiStatus(null)}
              className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* CSV Notice */}
        {csvNotice && (
          <div className="mt-3 p-3 rounded-lg text-xs flex items-center gap-2 bg-[var(--color-line-soft)] border border-[var(--color-line)] text-[var(--color-ink)]">
            <FileSpreadsheet size={16} className="text-[var(--color-brand)] shrink-0" />
            <span>{csvNotice}</span>
          </div>
        )}
      </div>

      {/* BATCH LEDGER REVIEW & IMPORT TABLE */}
      {ledgerTransactions.length > 0 && (
        <section className="bg-[var(--color-surface)] border-2 border-[var(--color-brand)] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center shrink-0">
                <Layers size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--color-ink)]">
                    Scanned Ledger Review ({ledgerTransactions.length} items detected)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-good-light)] text-[var(--color-good)] border border-[var(--color-good)]/30">
                    Ready to Import
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Review and edit any row before batch-saving to your database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-line-soft)] text-xs font-semibold text-[var(--color-ink)] transition-colors"
              >
                <Plus size={14} /> Add Row
              </button>
              <button
                type="button"
                onClick={() => setLedgerTransactions([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-bad-light)] hover:text-[var(--color-bad)] text-xs font-semibold text-[var(--color-ink-soft)] transition-colors"
              >
                <X size={14} /> Discard All
              </button>
              <button
                type="button"
                onClick={handleBatchImport}
                disabled={isImportingBatch || selectedTransactions.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--color-good)] hover:opacity-90 text-white text-xs font-bold transition-opacity disabled:opacity-50 shadow-xs"
              >
                {isImportingBatch ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Importing to Expenses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Batch Import {selectedTransactions.length} Expenses (₹{totalSelectedAmount.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Batch Status Notice */}
          {batchNotice && (
            <div className="p-3 rounded-lg bg-[var(--color-good-light)] text-[var(--color-good)] border border-[var(--color-good)]/30 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{batchNotice}</span>
            </div>
          )}

          {/* Interactive Ledger Table */}
          <div className="overflow-x-auto rounded-lg border border-[var(--color-line)]">
            <table className="w-full text-left text-xs text-[var(--color-ink)] border-collapse">
              <thead className="bg-[var(--color-line-soft)] text-[var(--color-ink-soft)] uppercase text-[11px] font-semibold border-b border-[var(--color-line)]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-[var(--color-line)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-36">Date</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Payee / Vendor</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Category</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Description / Note</th>
                  <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] bg-[var(--color-surface)]">
                {ledgerTransactions.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-[var(--color-line-soft)]/50 ${
                      !row.selected ? 'opacity-50 bg-[var(--color-line-soft)]/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleToggleRow(row.id)}
                        className="rounded border-[var(--color-line)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                        className="w-full py-1 px-2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.vendor}
                        placeholder="Vendor name"
                        onChange={(e) => handleRowChange(row.id, 'vendor', e.target.value)}
                        className="w-full py-1 px-2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-ink)]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={row.category}
                        onChange={(e) => handleRowChange(row.id, 'category', e.target.value)}
                        className="w-full py-1 px-2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {t(`categoryNames.${c.name}`, c.name)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.description}
                        placeholder="Item details / note"
                        onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                        className="w-full py-1 px-2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-soft)]">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.amount}
                          onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                          className="w-full py-1 pl-5 pr-2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-ink)] text-right"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-[var(--color-ink-soft)] hover:text-[var(--color-bad)] p-1 transition-colors"
                        title="Delete line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--color-line-soft)] font-bold text-xs border-t border-[var(--color-line)]">
                <tr>
                  <td colSpan="5" className="py-3 px-4 text-right text-[var(--color-ink)]">
                    Total Selected ({selectedTransactions.length} of {ledgerTransactions.length} items):
                  </td>
                  <td className="py-3 px-3 text-right text-[var(--color-brand)] font-extrabold text-sm">
                    ₹{totalSelectedAmount.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Main Manual Single Expense Form */}
        <div className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-line)]">
            <div>
              <h2 className="text-base font-bold text-[var(--color-ink)]">{t('addExpense.newExpense')}</h2>
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                Record single cash or bank transactions with instant category assignment.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">
              Manual Form
            </span>
          </div>

          <ExpenseForm
            initialValues={initialFormValues}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/expenses')}
            submitLabel={t('common.addExpense')}
          />
        </div>

        {/* Right Column (5 cols): AI Assistant & Tips */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Ledger Action Card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-ink)]">Daily Ledger & Diary OCR</h3>
                <p className="text-xs text-[var(--color-ink-soft)]">Designed for Indian Shopkeepers & MSMEs</p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed mb-4">
              Don't spend hours typing receipts one by one. Take a photo of your shopkeeper diary or daily khatabook log.
              ExpenseLens Vision AI extracts all payees, amounts, categories, and items in seconds!
            </p>
            <button
              type="button"
              onClick={handleLedgerClick}
              disabled={isScanningLedger}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[var(--color-brand)] text-white text-xs font-bold hover:bg-[var(--color-brand-dark)] transition-colors shadow-xs"
            >
              <Camera size={15} />
              <span>{isScanningLedger ? 'Scanning Ledger...' : 'Scan Daily Ledger Now'}</span>
            </button>
          </div>

          {/* Single Receipt Quick Card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-amber-light)] text-[var(--color-amber)] flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-ink)]">Single Bill / Invoice OCR</h3>
                <p className="text-xs text-[var(--color-ink-soft)]">Thermal slips, GST bills & handwritten slips</p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed mb-4">
              Upload a single invoice or thermal receipt to auto-fill the form on the left, including vendor name, total amount, and category.
            </p>
            <button
              type="button"
              onClick={handleReceiptClick}
              disabled={isScanningReceipt}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-brand)] hover:bg-[var(--color-line-soft)] text-xs font-semibold text-[var(--color-ink)] transition-colors"
            >
              <Camera size={15} />
              <span>{isScanningReceipt ? 'Reading Receipt...' : 'Upload Single Receipt'}</span>
            </button>
          </div>

          {/* Best Practices */}
          <div className="bg-[var(--color-line-soft)]/50 border border-[var(--color-line)] rounded-xl p-4 text-xs space-y-2">
            <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[var(--color-brand)]" /> OCR Tips for Best Results
            </span>
            <ul className="space-y-1.5 text-[var(--color-ink-soft)] list-disc pl-4">
              <li>Ensure good lighting and avoid shadows across numbers.</li>
              <li>Keep handwritten amounts clearly spaced next to the vendor name.</li>
              <li>Supports English, Hindi transliterated vendor names, and ₹ currency signs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


