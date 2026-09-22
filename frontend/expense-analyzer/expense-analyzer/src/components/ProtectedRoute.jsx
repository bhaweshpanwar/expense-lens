import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Hammer } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-paper)]">
        <div className="w-10 h-10 rounded-md bg-[var(--color-amber)] flex items-center justify-center animate-pulse mb-3">
          <Hammer size={20} className="text-[var(--color-brand-dark)]" />
        </div>
        <p className="text-xs text-[var(--color-ink-soft)] font-medium">
          {t('auth.checkingAuth')}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-paper)]">
        <div className="w-10 h-10 rounded-md bg-[var(--color-amber)] flex items-center justify-center animate-pulse mb-3">
          <Hammer size={20} className="text-[var(--color-brand-dark)]" />
        </div>
        <p className="text-xs text-[var(--color-ink-soft)] font-medium">
          {t('auth.loadingPrompt')}
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

