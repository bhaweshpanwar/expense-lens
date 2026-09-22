// Expense categories / sectors for Sharma Furniture & Hardware
// Each has an optional monthly budget used for category-level alerts.

export const categories = [
  { id: 'raw-materials', name: 'Raw Materials', monthlyBudget: 32000, color: '#23514A' },
  { id: 'electricity-utilities', name: 'Electricity & Utilities', monthlyBudget: 9000, color: '#C77B2E' },
  { id: 'rent', name: 'Rent', monthlyBudget: 15000, color: '#3D8361' },
  { id: 'transportation', name: 'Transportation', monthlyBudget: 8000, color: '#8E6C3A' },
  { id: 'packaging', name: 'Packaging', monthlyBudget: 6000, color: '#5B7B9A' },
  { id: 'maintenance', name: 'Maintenance', monthlyBudget: 5000, color: '#9A5B6E' },
  { id: 'office-supplies', name: 'Office Supplies', monthlyBudget: 3000, color: '#6E5B9A' },
  { id: 'marketing', name: 'Marketing', monthlyBudget: 4000, color: '#B8452F' },
  { id: 'labour', name: 'Labour', monthlyBudget: 20000, color: '#4B5B57' },
  { id: 'other', name: 'Other', monthlyBudget: 3000, color: '#A3A08F' },
];

export const getCategoryByName = (name) =>
  categories.find((c) => c.name === name);
