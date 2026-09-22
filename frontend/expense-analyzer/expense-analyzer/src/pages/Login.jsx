import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const validate = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = t('auth.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = t('auth.validation.emailInvalid');
    }

    if (!password) {
      nextErrors.password = t('auth.validation.passwordRequired');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDemo = () => {
    setEmail('sharma@hardware.com');
    setPassword('password123');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Mark */}
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            ExpenseLens
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg shadow-xs p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">{t('auth.signIn')}</h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              {t('auth.signInDesc')}
            </p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-md bg-[var(--color-bad-light)] border border-[var(--color-bad)]/20 p-3 text-xs text-[var(--color-bad)] flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                {t('auth.email')} <span className="text-[var(--color-bad)]">*</span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                    errors.email ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[var(--color-bad)] mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                {t('auth.password')} <span className="text-[var(--color-bad)]">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="current-password"
                  className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                    errors.password ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--color-bad)] mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 px-4 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          {/* Demo Credentials Box */}
          <div className="mt-5 p-3 rounded-md bg-[var(--color-paper)] border border-[var(--color-line)] text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--color-ink)]">{t('auth.demoAccount')}</span>
              <button
                type="button"
                onClick={handleUseDemo}
                className="text-[11px] text-[var(--color-brand)] hover:underline font-semibold"
              >
                {t('auth.fillCredentials')}
              </button>
            </div>
            <div className="mt-1 text-[var(--color-ink-soft)] font-mono text-[11px]">
              sharma@hardware.com / password123
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--color-line)] text-center">
            <p className="text-xs text-[var(--color-ink-soft)]">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-[var(--color-brand)] hover:underline"
              >
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

