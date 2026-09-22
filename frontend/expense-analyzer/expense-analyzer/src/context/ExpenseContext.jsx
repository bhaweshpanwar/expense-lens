import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchBudget,
  saveBudgetLimit,
} from '../services/api';

const ExpenseContext = createContext(null);

export function ExpenseProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchExpenses(), fetchBudget()]).then(([expenseData, budgetData]) => {
      if (!isMounted) return;
      setExpenses(expenseData);
      setMonthlyBudget(budgetData.monthlyBudget);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const addExpense = useCallback(async (expense) => {
    const created = await createExpense(expense);
    setExpenses((prev) => [created, ...prev]);
    return created;
  }, []);

  const editExpense = useCallback(async (id, updates) => {
    const updated = await updateExpense(id, updates);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const removeExpense = useCallback(async (id) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateBudget = useCallback(async (newAmount, categoryId = null) => {
    await saveBudgetLimit({ category_id: categoryId, limit_amount: newAmount });
    if (!categoryId) {
      setMonthlyBudget(newAmount);
    }
  }, []);

  const value = {
    expenses,
    monthlyBudget,
    setMonthlyBudget,
    updateBudget,
    isLoading,
    addExpense,
    editExpense,
    removeExpense,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpenseProvider');
  return ctx;
}
