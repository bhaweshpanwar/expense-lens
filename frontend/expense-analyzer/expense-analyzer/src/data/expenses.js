// Mock expense transactions for Sharma Furniture & Hardware
// Spans April - September 2026 so charts/analysis have real month-over-month data.
// Shape: { id, vendor, category, amount, date, notes }

export const initialExpenses = [
  // April 2026
  { id: 'exp-001', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 17500, date: '2026-04-04', notes: 'Sagwan wood planks - 2 batches' },
  { id: 'exp-002', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-04-05', notes: 'Shop rent - April' },
  { id: 'exp-003', vendor: 'Sharma Electricals', category: 'Electricity & Utilities', amount: 7200, date: '2026-04-08', notes: 'Electricity bill - workshop' },
  { id: 'exp-004', vendor: 'Local Transport', category: 'Transportation', amount: 4200, date: '2026-04-11', notes: 'Delivery to Rajwada showroom' },
  { id: 'exp-005', vendor: 'Workshop Staff', category: 'Labour', amount: 18000, date: '2026-04-15', notes: 'Carpenter wages - first half' },
  { id: 'exp-006', vendor: 'City Packaging', category: 'Packaging', amount: 3100, date: '2026-04-18', notes: 'Bubble wrap and cartons' },

  // May 2026
  { id: 'exp-007', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 19200, date: '2026-05-03', notes: 'Plywood sheets - 12mm' },
  { id: 'exp-008', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-05-05', notes: 'Shop rent - May' },
  { id: 'exp-009', vendor: 'Verma Hardware', category: 'Raw Materials', amount: 8600, date: '2026-05-09', notes: 'Hinges, screws and handles' },
  { id: 'exp-010', vendor: 'Rajesh Electricals', category: 'Maintenance', amount: 2500, date: '2026-05-12', notes: 'Table saw motor repair' },
  { id: 'exp-011', vendor: 'Local Transport', category: 'Transportation', amount: 3800, date: '2026-05-16', notes: 'Material pickup from Pithampur' },
  { id: 'exp-012', vendor: 'Modern Stationery Mart', category: 'Office Supplies', amount: 1450, date: '2026-05-20', notes: 'Billing register and stationery' },
  { id: 'exp-013', vendor: 'Workshop Staff', category: 'Labour', amount: 18500, date: '2026-05-28', notes: 'Carpenter wages - full month' },

  // June 2026
  { id: 'exp-014', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 16800, date: '2026-06-02', notes: 'Teak wood - dining set order' },
  { id: 'exp-015', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-06-05', notes: 'Shop rent - June' },
  { id: 'exp-016', vendor: 'Sharma Electricals', category: 'Electricity & Utilities', amount: 8900, date: '2026-06-08', notes: 'Electricity bill - summer load' },
  { id: 'exp-017', vendor: 'City Packaging', category: 'Packaging', amount: 4300, date: '2026-06-13', notes: 'Corrugated boxes for bulk order' },
  { id: 'exp-018', vendor: 'Indore Print & Media', category: 'Marketing', amount: 3500, date: '2026-06-17', notes: 'Local newspaper ad - festive sale' },
  { id: 'exp-019', vendor: 'Workshop Staff', category: 'Labour', amount: 18500, date: '2026-06-27', notes: 'Carpenter wages - full month' },

  // July 2026
  { id: 'exp-020', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 20500, date: '2026-07-04', notes: 'Wood stock for monsoon slowdown' },
  { id: 'exp-021', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-07-05', notes: 'Shop rent - July' },
  { id: 'exp-022', vendor: 'Verma Hardware', category: 'Raw Materials', amount: 7400, date: '2026-07-10', notes: 'Fittings and laminate sheets' },
  { id: 'exp-023', vendor: 'Local Transport', category: 'Transportation', amount: 5100, date: '2026-07-14', notes: 'Rain-delayed delivery, extra trip' },
  { id: 'exp-024', vendor: 'Rajesh Electricals', category: 'Maintenance', amount: 1800, date: '2026-07-19', notes: 'Wiring check after leakage' },
  { id: 'exp-025', vendor: 'Workshop Staff', category: 'Labour', amount: 18500, date: '2026-07-27', notes: 'Carpenter wages - full month' },

  // August 2026
  { id: 'exp-026', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 18200, date: '2026-08-03', notes: 'Regular timber restock' },
  { id: 'exp-027', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-08-05', notes: 'Shop rent - August' },
  { id: 'exp-028', vendor: 'Sharma Electricals', category: 'Electricity & Utilities', amount: 8100, date: '2026-08-09', notes: 'Electricity bill' },
  { id: 'exp-029', vendor: 'City Packaging', category: 'Packaging', amount: 3900, date: '2026-08-12', notes: 'Packaging for online orders' },
  { id: 'exp-030', vendor: 'Modern Stationery Mart', category: 'Office Supplies', amount: 1200, date: '2026-08-16', notes: 'Invoice books, pens' },
  { id: 'exp-031', vendor: 'Workshop Staff', category: 'Labour', amount: 19000, date: '2026-08-26', notes: 'Carpenter wages + Rakhi bonus' },

  // September 2026 (current month)
  { id: 'exp-032', vendor: 'Gupta Timber', category: 'Raw Materials', amount: 45000, date: '2026-09-03', notes: 'Bulk teak order for hotel contract' },
  { id: 'exp-033', vendor: 'Agarwal Properties', category: 'Rent', amount: 15000, date: '2026-09-05', notes: 'Shop rent - September' },
  { id: 'exp-034', vendor: 'Sharma Electricals', category: 'Electricity & Utilities', amount: 8500, date: '2026-09-07', notes: 'Electricity bill' },
  { id: 'exp-035', vendor: 'Local Transport', category: 'Transportation', amount: 9200, date: '2026-09-10', notes: 'Two extra trips for hotel order' },
  { id: 'exp-036', vendor: 'Verma Hardware', category: 'Raw Materials', amount: 6200, date: '2026-09-12', notes: 'Hardware fittings restock' },
  { id: 'exp-037', vendor: 'City Packaging', category: 'Packaging', amount: 5800, date: '2026-09-14', notes: 'Heavy-duty packaging for hotel order' },
  { id: 'exp-038', vendor: 'Rajesh Electricals', category: 'Maintenance', amount: 3500, date: '2026-09-16', notes: 'Compressor servicing' },
  { id: 'exp-039', vendor: 'Modern Stationery Mart', category: 'Office Supplies', amount: 900, date: '2026-09-17', notes: 'Stationery restock' },
  { id: 'exp-040', vendor: 'Indore Print & Media', category: 'Marketing', amount: 2600, date: '2026-09-19', notes: 'Pamphlet printing' },
  { id: 'exp-041', vendor: 'Workshop Staff', category: 'Labour', amount: 18700, date: '2026-09-20', notes: 'Carpenter wages - first half' },
];

// Overall monthly budget for the business
export const monthlyBudget = 100000;
