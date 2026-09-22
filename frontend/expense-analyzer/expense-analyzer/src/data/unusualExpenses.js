// Mock "unusual expense" flags. In the real system this will be produced by
// the backend's anomaly-detection logic; for now we hand-curate a couple of
// examples so the UI has something real to explain.
//
// historicalAverage is the average amount for that vendor+category
// combination, calculated across prior months (excluding the flagged one).

export const unusualExpenses = [
  {
    id: 'unusual-001',
    expenseId: 'exp-032',
    vendor: 'Gupta Timber',
    category: 'Raw Materials',
    amount: 45000,
    date: '2026-09-03',
    historicalAverage: 18440,
    reason: 'Significantly higher than historical spending with this vendor.',
    detail: 'Linked to a one-off bulk teak order for a hotel contract, but the amount is well outside the usual monthly range for Gupta Timber.',
  },
  {
    id: 'unusual-002',
    expenseId: 'exp-035',
    vendor: 'Local Transport',
    category: 'Transportation',
    amount: 9200,
    date: '2026-09-10',
    historicalAverage: 4200,
    reason: 'More than double the average monthly transport spend.',
    detail: 'Two additional delivery trips were booked in September for the same hotel order that pushed up raw material costs.',
  },
];
