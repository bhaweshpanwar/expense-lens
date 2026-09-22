import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedName) {
      nextErrors.name = 'Full name is required.';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
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
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex flex-col justify-center items-center px-4 py-12">
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
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Create Account</h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              Register a staff or manager account for expense tracking
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
                htmlFor="name"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                Full Name <span className="text-[var(--color-bad)]">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="e.g. Rajesh Kumar"
                autoComplete="name"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                  errors.name ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-[var(--color-bad)] mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                Email Address <span className="text-[var(--color-bad)]">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="e.g. rajesh@hardware.com"
                autoComplete="email"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                  errors.email ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-[var(--color-bad)] mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                Password <span className="text-[var(--color-bad)]">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                  errors.password ? 'border-[var(--color-bad)]' : 'border-[var(--color-line)]'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-[var(--color-bad)] mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--color-ink)] mb-1.5"
              >
                Confirm Password <span className="text-[var(--color-bad)]">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`w-full rounded-md border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
                  errors.confirmPassword
                    ? 'border-[var(--color-bad)]'
                    : 'border-[var(--color-line)]'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-[var(--color-bad)] mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 px-4 rounded-md bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-line)] text-center">
            <p className="text-xs text-[var(--color-ink-soft)]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[var(--color-brand)] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
