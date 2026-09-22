import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({ title, subtitle, onMenuClick }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const locale = i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN';
  const todayLabel = new Date('2026-09-22').toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const roleKey = user?.role?.toLowerCase() === 'owner' ? 'owner' : 'staff';
  const userRoleLabel = t(`common.${roleKey}`, user?.role || 'Staff');

  return (
    <header className="h-16 shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-line)] flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
          aria-label={t('common.actions')}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--color-ink)] leading-tight truncate">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-[var(--color-ink-soft)] truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language selector in top-right of header */}
        <LanguageSwitcher />

        <div className="hidden md:flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-[var(--color-ink)]">
            {user?.name || t('common.authorizedUser')}
          </span>
          <span className="text-[11px] text-[var(--color-ink-soft)]">
            {userRoleLabel} · {todayLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-[var(--color-brand-light)] text-[var(--color-brand-dark)] flex items-center justify-center font-medium text-xs border border-[var(--color-brand)]/20 select-none"
            title={`${user?.name || ''} (${user?.email || ''})`}
          >
            {getInitials(user?.name)}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={t('common.logout')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-bad)] hover:border-[var(--color-bad)]/40 hover:bg-[var(--color-bad-light)]/40 transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}


