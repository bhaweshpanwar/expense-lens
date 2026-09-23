import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronRight,
  X,
} from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { analyzeReceiptImage, createExpense } from '../services/api';
import ExpenseForm from '../components/ExpenseForm';

function parseCsvContent(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  let currentField = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[currentField] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentField++;
      row[currentField] = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (row.length > 1 || row[0].trim() !== '') {
        lines.push(row.map((f) => f.trim()));
      }
      row = [''];
      currentField = 0;
    } else {
      row[currentField] += char;
    }
  }
  if (row.length > 1 || row[0].trim() !== '') {
    lines.push(row.map((f) => f.trim()));
  }
  return lines;
}

export default function AddExpense() {
  const { addExpense, refreshExpenses } = useExpenses();
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
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ current: 0, total: 0 });
  const [csvSummary, setCsvSummary] = useState(null);
  const [activeCsvTab, setActiveCsvTab] = useState('skipped');

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
        amount: (extracted.amount !== null && extracted.amount !== undefined && extracted.amount !== '') ? extracted.amount : prev.amount,
        vendor: extracted.vendor || prev.vendor,
        category: extracted.category || prev.category,
        date: extracted.date || prev.date,
        notes: extracted.raw_text ? `Receipt: ${file.name}` : prev.notes,
      }));

      if (extracted.vendor || extracted.amount) {
        setAiStatus({
          type: 'success',
          message: `AI extracted details from ${file.name}. Please review the populated fields in the form on the left!`,
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

  const handleCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiStatus(null);
    setCsvNotice(null);
    setIsProcessingCsv(true);
    setCsvProgress({ current: 0, total: 0 });
    setCsvSummary(null);

    try {
      const text = await file.text();
      const parsedRows = parseCsvContent(text);

      if (parsedRows.length < 2) {
        throw new Error('The CSV file is empty or missing data rows.');
      }

      const headers = parsedRows[0].map((h) =>
        h.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      const dateIdx = headers.findIndex((h) => h.includes('date'));
      const amountIdx = headers.findIndex(
        (h) => h.includes('amount') || h.includes('cost') || h.includes('price')
      );
      const vendorIdx = headers.findIndex(
        (h) => h.includes('vendor') || h.includes('payee') || h.includes('merchant')
      );
      const categoryIdx = headers.findIndex(
        (h) => h.includes('category') || h.includes('sector')
      );
      const notesIdx = headers.findIndex(
        (h) => h.includes('note') || h.includes('desc')
      );
      const typeIdx = headers.findIndex((h) => h.includes('type'));

      if (dateIdx === -1 && amountIdx === -1) {
        throw new Error('CSV headers must include at least "Date" and "Amount" columns.');
      }

      const rawDataRows = parsedRows.slice(1);
      const validRows = [];
      const skippedRows = [];

      rawDataRows.forEach((row, idx) => {
        const rowNumber = idx + 2; // CSV 1-based line number (line 1 is header)
        const rawDate = (dateIdx !== -1 ? row[dateIdx] : '')?.trim();
        const rawAmount = (amountIdx !== -1 ? row[amountIdx] : '')?.trim();
        const rawVendor = (vendorIdx !== -1 ? row[vendorIdx] : '')?.trim();
        const rawCategory = (categoryIdx !== -1 ? row[categoryIdx] : '')?.trim();
        const rawNotes = (notesIdx !== -1 ? row[notesIdx] : '')?.trim();
        const rawType = (typeIdx !== -1 ? row[typeIdx] : 'expense')?.trim().toLowerCase() || 'expense';

        const missing = [];
        if (!rawDate || isNaN(Date.parse(rawDate))) {
          missing.push(rawDate ? 'Invalid Date' : 'Missing Date');
        }

        const numAmount = Number(rawAmount);
        if (rawAmount === '' || rawAmount === undefined || isNaN(numAmount) || numAmount <= 0) {
          missing.push(rawAmount === '' ? 'Missing Amount' : 'Invalid Amount');
        }

        if (!rawCategory) {
          missing.push('Missing Category');
        }

        if (missing.length > 0) {
          skippedRows.push({
            rowNumber,
            missingFields: missing,
            reason: missing.join(', '),
            raw: row.join(', '),
            date: rawDate || '—',
            amount: rawAmount || '—',
            vendor: rawVendor || '—',
            category: rawCategory || '—',
          });
        } else {
          validRows.push({
            rowNumber,
            date: rawDate,
            amount: numAmount,
            vendor: rawVendor || 'General Vendor',
            category: rawCategory,
            notes: rawNotes,
            type: rawType,
          });
        }
      });

      const totalRows = rawDataRows.length;
      setCsvProgress({ current: 0, total: validRows.length });

      const processedRows = [];
      // Import valid rows in parallel batches of 5
      const BATCH_SIZE = 5;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (item) => {
            try {
              await createExpense(item);
              processedRows.push(item);
            } catch (err) {
              skippedRows.push({
                rowNumber: item.rowNumber,
                missingFields: ['API Error'],
                reason: err.message || 'Server rejected transaction',
                raw: `${item.date}, ${item.amount}, ${item.vendor}, ${item.category}`,
                date: item.date,
                amount: item.amount,
                vendor: item.vendor,
                category: item.category,
              });
            }
          })
        );
        setCsvProgress({
          current: Math.min(i + batch.length, validRows.length),
          total: validRows.length,
        });
      }

      if (refreshExpenses) {
        await refreshExpenses();
      }

      setCsvSummary({
        fileName: file.name,
        total: totalRows,
        processedCount: processedRows.length,
        skippedCount: skippedRows.length,
        skippedRows: skippedRows.sort((a, b) => a.rowNumber - b.rowNumber),
        processedRows: processedRows.sort((a, b) => a.rowNumber - b.rowNumber),
      });
      setActiveCsvTab(skippedRows.length > 0 ? 'skipped' : 'processed');
    } catch (err) {
      console.error('CSV import failed', err);
      setCsvNotice(`Error processing CSV: ${err.message}`);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleSubmit = async (values) => {
    await addExpense(values);
    navigate('/expenses');
  };

  return (
    <div className="w-full space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Main Expense Form */}
        <div className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">{t('addExpense.newExpense')}</h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
              Enter expense details manually or auto-populate using AI receipt scan or CSV batch import on the right.
            </p>
          </div>
          <ExpenseForm
            initialValues={initialFormValues}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/expenses')}
            submitLabel={t('common.addExpense')}
          />
        </div>

        {/* Right Column: AI Quick Add & Batch Import */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg p-5">
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

        {/* Helper Link for Sample Test CSV */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-ink-soft)]">
          <span>Test CSV import with sample records:</span>
          <a
            href="/test_expenses_100.csv"
            download="test_expenses_100.csv"
            className="inline-flex items-center gap-1 text-[var(--color-brand)] hover:underline font-medium"
          >
            <Download size={11} />
            test_expenses_100.csv (100 rows)
          </a>
        </div>

        {/* CSV Processing Progress Bar */}
        {isProcessingCsv && (
          <div className="mt-3 p-3 rounded-md bg-[var(--color-paper)] border border-[var(--color-line)] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--color-ink)]">
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin text-[var(--color-brand)]" />
                Importing CSV records into database...
              </span>
              <span className="tabular font-semibold text-[var(--color-brand)]">
                {csvProgress.current} / {csvProgress.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--color-line)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand)] transition-all duration-200"
                style={{
                  width:
                    csvProgress.total > 0
                      ? `${Math.round((csvProgress.current / csvProgress.total) * 100)}%`
                      : '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* CSV Import Results Card */}
        {csvSummary && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--color-paper)] border border-[var(--color-line)] shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-[var(--color-good)]" />
                  <h3 className="text-xs font-semibold text-[var(--color-ink)]">
                    CSV Batch Results: {csvSummary.fileName}
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--color-ink-soft)] mt-0.5">
                  Successfully imported {csvSummary.processedCount} records • {csvSummary.skippedCount} skipped due to missing/invalid fields
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCsvSummary(null)}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-1 rounded hover:bg-[var(--color-line-soft)]"
                title="Dismiss summary"
              >
                <X size={14} />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-line)]">
                <span className="text-[10px] text-[var(--color-ink-soft)] block uppercase tracking-wider font-semibold">Total Rows</span>
                <span className="text-sm font-bold text-[var(--color-ink)]">{csvSummary.total}</span>
              </div>
              <div className="p-2 rounded bg-[var(--color-good-light)]/60 border border-[var(--color-good)]/30">
                <span className="text-[10px] text-[var(--color-good)] block uppercase tracking-wider font-semibold">Processed</span>
                <span className="text-sm font-bold text-[var(--color-good)]">{csvSummary.processedCount}</span>
              </div>
              <div className="p-2 rounded bg-[var(--color-bad-light)]/60 border border-[var(--color-bad)]/30">
                <span className="text-[10px] text-[var(--color-bad)] block uppercase tracking-wider font-semibold">Skipped (Issues)</span>
                <span className="text-sm font-bold text-[var(--color-bad)]">{csvSummary.skippedCount}</span>
              </div>
            </div>

            {/* Tab navigation for Skipped vs Processed */}
            <div className="flex border-b border-[var(--color-line)] text-xs">
              <button
                type="button"
                onClick={() => setActiveCsvTab('skipped')}
                className={`pb-1.5 px-3 font-medium border-b-2 transition-colors ${
                  activeCsvTab === 'skipped'
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                }`}
              >
                Skipped / Missing Fields ({csvSummary.skippedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveCsvTab('processed')}
                className={`pb-1.5 px-3 font-medium border-b-2 transition-colors ${
                  activeCsvTab === 'processed'
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                }`}
              >
                Processed Rows ({csvSummary.processedCount})
              </button>
            </div>

            {/* Tab Content: Skipped Rows */}
            {activeCsvTab === 'skipped' && (
              <div className="max-h-56 overflow-y-auto border border-[var(--color-line)] rounded-md bg-[var(--color-surface)]">
                {csvSummary.skippedRows.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--color-ink-soft)] text-center">
                    All rows had complete data! No skipped records.
                  </p>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[var(--color-line-soft)] sticky top-0 text-[var(--color-ink-soft)]">
                      <tr>
                        <th className="py-1.5 px-2.5 font-medium">Row #</th>
                        <th className="py-1.5 px-2.5 font-medium">Missing / Issue</th>
                        <th className="py-1.5 px-2.5 font-medium">Data Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line-soft)]">
                      {csvSummary.skippedRows.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[var(--color-line-soft)]/40">
                          <td className="py-1.5 px-2.5 font-semibold text-[var(--color-ink)] whitespace-nowrap">
                            Row {r.rowNumber}
                          </td>
                          <td className="py-1.5 px-2.5">
                            <div className="flex flex-wrap gap-1">
                              {r.missingFields.map((f, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded bg-[var(--color-bad-light)] text-[var(--color-bad)] text-[10px] font-medium"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td
                            className="py-1.5 px-2.5 text-[var(--color-ink-soft)] font-mono text-[10px] truncate max-w-[160px]"
                            title={r.raw}
                          >
                            {r.raw}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab Content: Processed Rows */}
            {activeCsvTab === 'processed' && (
              <div className="max-h-56 overflow-y-auto border border-[var(--color-line)] rounded-md bg-[var(--color-surface)]">
                {csvSummary.processedRows.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--color-ink-soft)] text-center">
                    No rows were imported.
                  </p>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[var(--color-line-soft)] sticky top-0 text-[var(--color-ink-soft)]">
                      <tr>
                        <th className="py-1.5 px-2.5 font-medium">Row #</th>
                        <th className="py-1.5 px-2.5 font-medium">Date</th>
                        <th className="py-1.5 px-2.5 font-medium">Vendor</th>
                        <th className="py-1.5 px-2.5 font-medium">Category</th>
                        <th className="py-1.5 px-2.5 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line-soft)]">
                      {csvSummary.processedRows.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[var(--color-line-soft)]/40">
                          <td className="py-1.5 px-2.5 text-[var(--color-ink-soft)]">Row {r.rowNumber}</td>
                          <td className="py-1.5 px-2.5 text-[var(--color-ink)] whitespace-nowrap">{r.date}</td>
                          <td className="py-1.5 px-2.5 font-medium text-[var(--color-ink)] truncate max-w-[90px]">{r.vendor}</td>
                          <td className="py-1.5 px-2.5 text-[var(--color-ink-soft)] truncate max-w-[90px]">{r.category}</td>
                          <td className="py-1.5 px-2.5 text-right font-medium text-[var(--color-ink)] tabular">
                            ₹{Number(r.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-line-soft)] text-xs">
              <a
                href="/test_expenses_100.csv"
                download="test_expenses_100.csv"
                className="inline-flex items-center gap-1 text-[var(--color-brand)] hover:underline font-medium text-[11px]"
              >
                <Download size={12} />
                Download test CSV
              </a>
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--color-brand)] text-white font-medium hover:bg-[var(--color-brand-dark)] transition-colors text-xs"
              >
                <span>View in Expenses</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

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

        {/* CSV Notice / Error */}
        {csvNotice && (
          <div className="mt-3 p-2.5 rounded-md text-xs flex items-center gap-2 bg-[var(--color-bad-light)] text-[var(--color-bad)] border border-[var(--color-bad)]/30">
            <AlertCircle size={15} className="shrink-0" />
            <span>{csvNotice}</span>
          </div>
        )}
      </div>

        </div>
      </div>
    </div>
  );
}


