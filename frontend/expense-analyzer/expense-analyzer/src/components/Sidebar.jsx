import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid,
  Receipt,
  FolderKanban,
  LineChart,
  ShieldAlert,
  Sparkles,
  Hammer,
} from 'lucide-react';

const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/expenses', labelKey: 'nav.expenses', icon: Receipt },
  { to: '/categories', labelKey: 'nav.categories', icon: FolderKanban },
  { to: '/analysis', labelKey: 'nav.analysis', icon: LineChart },
  { to: '/budget-alerts', labelKey: 'nav.budgetAlerts', icon: ShieldAlert },
  { to: '/unusual-expenses', labelKey: 'nav.unusualExpenses', icon: Sparkles },
];

export default function Sidebar({ isOpen, onNavigate }) {
  const { t } = useTranslation();

  return (
    <aside
      className={`fixed z-40 inset-y-0 left-0 w-64 bg-[var(--color-brand-dark)] text-white flex flex-col
        transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded-md bg-[var(--color-amber)] flex items-center justify-center shrink-0">
          <Hammer size={16} className="text-[var(--color-brand-dark)]" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">{t('brandTitle')}</p>
          <p className="text-[11px] text-white/60">{t('brandSubtitle')}</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
              ${isActive
                ? 'bg-white/10 text-white font-medium border-l-2 border-[var(--color-amber)] pl-[10px]'
                : 'text-white/70 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/45">
        {t('common.version')}
        <br />
        {t('common.preview')}
      </div>
    </aside>
  );
}

