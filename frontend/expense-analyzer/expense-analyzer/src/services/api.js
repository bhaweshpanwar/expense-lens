// Service layer for the Business Expense Analyzer.
// Connected to Express backend at http://localhost:5000/api

import axios from 'axios';
import { initialExpenses, monthlyBudget as defaultBudget } from '../data/expenses';
import { categories as defaultCategories } from '../data/categories';
import { vendors as defaultVendors } from '../data/vendors';
import { unusualExpenses as defaultUnusualExpenses } from '../data/unusualExpenses';

const AUTH_SESSION_KEY = 'sharma_auth_session';
const AUTH_TOKEN_KEY = 'auth_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT Bearer token to all outgoing requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 Unauthorized responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on authentication failure
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    return Promise.reject(error);
  }
);

function formatDate(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.slice(0, 10);
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

function formatTransaction(t) {
  if (!t) return t;

  const categoryName =
    (typeof t.category === 'object' && t.category?.name)
      ? t.category.name
      : (t.category_name || (typeof t.category === 'string' ? t.category : 'Other'));

  const vendorName =
    (typeof t.vendor === 'object' && t.vendor?.name)
      ? t.vendor.name
      : (t.vendor_name || (typeof t.vendor === 'string' ? t.vendor : 'Unknown'));

  const dateStr = formatDate(t.txn_date || t.date);
  const numAmount = parseFloat(t.amount) || 0;

  return {
    id: t.id,
    amount: numAmount,
    date: dateStr,
    txn_date: dateStr,
    category: categoryName,
    category_name: categoryName,
    category_id: t.category?.id || t.category_id || null,
    vendor: vendorName,
    vendor_name: vendorName,
    vendor_id: t.vendor?.id || t.vendor_id || null,
    notes: t.notes || '',
    type: t.type || 'expense',
    is_flagged_unusual: Boolean(t.is_flagged_unusual),
    flag_reason: t.flag_reason || null,
  };
}

let categoriesCache = null;

async function getCategoryList() {
  if (!categoriesCache) {
    categoriesCache = await fetchCategories();
  }
  return categoriesCache;
}

async function resolveCategoryId(categoryName) {
  if (!categoryName) return null;
  const cats = await getCategoryList();
  const match = cats.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (match) return match.id;

  try {
    const res = await apiClient.post('/categories', {
      name: categoryName,
      type: 'expense',
    });
    const newCat = res.data?.data || res.data;
    if (newCat && newCat.id) {
      categoriesCache = null;
      return newCat.id;
    }
  } catch {
    if (cats.length > 0) return cats[0].id;
  }
  return null;
}

// ---- Expenses -------------------------------------------------------------

export async function fetchExpenses() {
  try {
    const res = await apiClient.get('/transactions?limit=1000');
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    const list = Array.isArray(payload)
      ? payload
      : (payload?.transactions || []);
    return list.map(formatTransaction);
  } catch (err) {
    console.warn('Failed to fetch transactions from backend, falling back to mock data', err);
    return [...initialExpenses];
  }
}

export async function fetchExpenseById(id) {
  try {
    const expenses = await fetchExpenses();
    return expenses.find((e) => e.id === id) || null;
  } catch (err) {
    console.warn(`Failed to fetch transaction ${id}`, err);
    return null;
  }
}

export async function createExpense(expense) {
  const categoryId = expense.category_id || (await resolveCategoryId(expense.category));
  const payload = {
    type: 'expense',
    amount: Number(expense.amount),
    category_id: categoryId,
    vendor_name: expense.vendor || undefined,
    txn_date: expense.date,
    notes: expense.notes || '',
  };

  const res = await apiClient.post('/transactions', payload);
  const created = res.data?.data || res.data;
  return formatTransaction(created);
}

export async function updateExpense(id, updates) {
  let categoryId = updates.category_id;
  if (!categoryId && updates.category) {
    categoryId = await resolveCategoryId(updates.category);
  }

  const payload = {
    type: 'expense',
    amount: updates.amount !== undefined ? Number(updates.amount) : undefined,
    category_id: categoryId || undefined,
    vendor_name: updates.vendor || undefined,
    txn_date: updates.date || undefined,
    notes: updates.notes !== undefined ? updates.notes : undefined,
  };

  const res = await apiClient.put(`/transactions/${id}`, payload);
  const updated = res.data?.data || res.data;
  return formatTransaction(updated);
}

export async function deleteExpense(id) {
  await apiClient.delete(`/transactions/${id}`);
  return { success: true, id };
}

// ---- Reference data ---------------------------------------------------------

export async function fetchCategories() {
  try {
    const res = await apiClient.get('/categories');
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    const dbCats = Array.isArray(payload) ? payload : (payload?.categories || []);
    if (dbCats.length > 0) {
      return dbCats.map((cat) => {
        const defaultCat = defaultCategories.find(
          (dc) => dc.name.toLowerCase() === cat.name.toLowerCase()
        );
        return {
          id: cat.id,
          name: cat.name,
          color: defaultCat?.color || '#23514A',
          monthlyBudget: defaultCat?.monthlyBudget || 10000,
          type: cat.type || 'expense',
        };
      });
    }
  } catch (err) {
    console.warn('Failed to fetch categories from backend, using defaults', err);
  }
  return defaultCategories;
}

export async function fetchVendors() {
  try {
    const res = await apiClient.get('/vendors');
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    const dbVendors = Array.isArray(payload) ? payload : (payload?.vendors || []);
    if (dbVendors.length > 0) {
      return dbVendors;
    }
  } catch (err) {
    console.warn('Failed to fetch vendors from backend, using defaults', err);
  }
  return defaultVendors;
}

export async function fetchBudget() {
  try {
    const res = await apiClient.get('/budgets');
    const budgets = res.data?.data || [];
    const overall = budgets.find((b) => b.category_id === null);
    if (overall && overall.limit_amount > 0) {
      return { monthlyBudget: overall.limit_amount };
    }
  } catch {}
  return { monthlyBudget: defaultBudget };
}

export async function fetchUnusualExpenses() {
  try {
    const res = await apiClient.get('/dashboard/unusual-transactions');
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    const items = Array.isArray(payload)
      ? payload
      : (payload?.unusual_transactions || []);

    return items.map((t) => {
      const amount = parseFloat(t.amount) || 0;
      const avg = parseFloat(t.avg_amount) || 0;
      return {
        id: t.id,
        amount,
        historicalAverage: avg,
        reason: t.flag_reason || 'Unusual Expense Detected',
        detail: t.flag_reason || '',
        vendor: t.vendor_name || (t.vendor && t.vendor.name) || 'Unknown',
        category: t.category_name || (t.category && t.category.name) || 'Other',
        date: formatDate(t.txn_date || t.date),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch unusual transactions, using fallback', err);
    return defaultUnusualExpenses;
  }
}

// ---- Authentication --------------------------------------------------------

export async function getCurrentUser() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const session = localStorage.getItem(AUTH_SESSION_KEY);
    if (!token || !session) return null;
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export async function loginUser(email, password) {
  try {
    const res = await apiClient.post('/auth/login', { email, password });
    const payload = res.data?.data || res.data;
    const token = payload?.token;
    const u = payload?.user || payload;

    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    const sessionUser = {
      id: u?.id || 'usr-1',
      name: u?.name || 'Ramesh Sharma',
      email: u?.email || email,
      business_name: u?.business_name || "Sharma's Furniture",
      role: u?.role || 'Owner',
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));
    categoriesCache = null; // Clear cache on user switch
    return sessionUser;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Invalid email or password. Please check your credentials.';
    throw new Error(message);
  }
}

export async function registerUser({ name, email, password }) {
  try {
    const business_name = `${name}'s Business`;
    const res = await apiClient.post('/auth/register', {
      name,
      email,
      password,
      business_name,
    });
    const payload = res.data?.data || res.data;
    const token = payload?.token;
    const u = payload?.user || payload;

    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    const sessionUser = {
      id: u?.id || `usr-${Date.now()}`,
      name: u?.name || name.trim(),
      email: u?.email || email,
      business_name: business_name,
      role: 'Owner',
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionUser));
    categoriesCache = null;
    return sessionUser;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An account with this email address already exists.';
    throw new Error(message);
  }
}

export async function logoutUser() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    categoriesCache = null;
  } catch (e) {
    console.error('Failed to clear session', e);
  }
  return { success: true };
}

// ---- AI & Vision Services --------------------------------------------------

export async function analyzeReceiptImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post('/ai/analyze-receipt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const payload = res.data?.data !== undefined ? res.data.data : res.data;
  return {
    vendor: payload?.vendor || '',
    amount: payload?.amount ? Number(payload.amount) : '',
    date: payload?.date ? formatDate(payload.date) : '',
    category: payload?.category || '',
    raw_text: payload?.raw_text || '',
    fallback: Boolean(res.data?.fallback),
    error: res.data?.error || null,
  };
}

export async function explainUnusualExpense(expenseData) {
  try {
    const res = await apiClient.post('/ai/explain-unusual', expenseData);
    return res.data?.data || res.data;
  } catch (err) {
    console.warn('AI explain unusual error', err);
    return null;
  }
}

export async function checkAiHealth() {
  try {
    const res = await apiClient.get('/ai/health');
    return res.data?.data || res.data;
  } catch {
    return { connected: false };
  }
}

// ---- Budgets & Limits ------------------------------------------------------

export async function fetchBudgets() {
  try {
    const res = await apiClient.get('/budgets');
    return res.data?.data || [];
  } catch (err) {
    console.warn('Failed to fetch budgets', err);
    return [];
  }
}

export async function fetchBudgetStatus() {
  try {
    const res = await apiClient.get('/budgets/status');
    return res.data?.data || [];
  } catch (err) {
    console.warn('Failed to fetch budget status', err);
    return [];
  }
}

export async function saveBudgetLimit({ category_id = null, limit_amount, period = 'monthly' }) {
  const res = await apiClient.post('/budgets', {
    category_id,
    limit_amount: Number(limit_amount),
    period,
  });
  return res.data?.data;
}

export async function recommendBudgetLimits(categoryBreakdown = [], monthlyBudget = 100000) {
  try {
    const res = await apiClient.post('/ai/recommend-budgets', {
      categoryBreakdown,
      monthlyBudget: Number(monthlyBudget),
    });
    return res.data?.data;
  } catch (err) {
    console.warn('Failed to get budget recommendations', err);
    return null;
  }
}

// ---- Savings Goals & AI Advisor --------------------------------------------

export async function fetchSavingsGoals() {
  try {
    const res = await apiClient.get('/savings-goal');
    return res.data?.data || [];
  } catch (err) {
    console.warn('Failed to fetch savings goals', err);
    return [];
  }
}

export async function createSavingsGoal({ target_amount, monthly_save_amount, target_date }) {
  const res = await apiClient.post('/savings-goal', {
    target_amount: Number(target_amount),
    monthly_save_amount: Number(monthly_save_amount),
    target_date: target_date || undefined,
  });
  return res.data?.data;
}

export async function getSavingsSuggestion(target_monthly_save = 10000) {
  const res = await apiClient.post('/savings-goal/suggestion', {
    target_monthly_save: Number(target_monthly_save),
  });
  return res.data?.data;
}


