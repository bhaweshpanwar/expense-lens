import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import EditExpense from './pages/EditExpense';
import Categories from './pages/Categories';
import ExpenseAnalysis from './pages/ExpenseAnalysis';
import BudgetAlerts from './pages/BudgetAlerts';
import UnusualExpenses from './pages/UnusualExpenses';
import Login from './pages/Login';
import Register from './pages/Register';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { ExpenseProvider } from './context/ExpenseContext';
import GstCenter from './pages/GstCenter';
import AccountsPayable from './pages/AccountsPayable';
import LandingPage from './pages/LandingPage';

function resolveMeta(pathname, t) {
  if (pathname === '/') {
    return { title: t('meta.dashboardTitle'), subtitle: t('meta.dashboardSubtitle') };
  }
  if (pathname === '/expenses') {
    return { title: t('meta.expensesTitle'), subtitle: t('meta.expensesSubtitle') };
  }
  if (pathname === '/expenses/new') {
    return { title: t('meta.addExpenseTitle'), subtitle: t('meta.addExpenseSubtitle') };
  }
  if (pathname.startsWith('/expenses/') && pathname.endsWith('/edit')) {
    return { title: t('meta.editExpenseTitle'), subtitle: t('meta.editExpenseSubtitle') };
  }
  if (pathname === '/categories') {
    return { title: t('meta.categoriesTitle'), subtitle: t('meta.categoriesSubtitle') };
  }
  if (pathname === '/analysis') {
    return { title: t('meta.analysisTitle'), subtitle: t('meta.analysisSubtitle') };
  }
  if (pathname === '/budget-alerts') {
    return { title: t('meta.budgetAlertsTitle'), subtitle: t('meta.budgetAlertsSubtitle') };
  }
  if (pathname === '/unusual-expenses') {
    return { title: t('meta.unusualExpensesTitle'), subtitle: t('meta.unusualExpensesSubtitle') };
  }
  if (pathname === '/tax') {
    return { title: t('meta.taxCenterTitle'), subtitle: t('meta.taxCenterSubtitle') };
  }
  if (pathname === '/payables') {
    return { title: t('meta.payablesTitle'), subtitle: t('meta.payablesSubtitle') };
  }
  return { title: t('appName'), subtitle: '' };
}

function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const meta = resolveMeta(location.pathname, t);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-paper)]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={meta.title} subtitle={meta.subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<AddExpense />} />
            <Route path="/expenses/:id/edit" element={<EditExpense />} />
            <Route path="/payables" element={<ProtectedRoute><AccountsPayable /></ProtectedRoute>} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/analysis" element={<ExpenseAnalysis />} />
            <Route path="/budget-alerts" element={<BudgetAlerts />} />
            <Route path="/unusual-expenses" element={<UnusualExpenses />} />
            <Route path="/tax" element={<ProtectedRoute><GstCenter /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand)]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <ExpenseProvider>
        <AppShell />
      </ExpenseProvider>
    );
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public product landing page */}
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Public authentication routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Root route: Landing Page if guest, AppShell if logged in */}
          <Route path="/" element={<HomeRoute />} />

          {/* Protected application routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ExpenseProvider>
                  <AppShell />
                </ExpenseProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

