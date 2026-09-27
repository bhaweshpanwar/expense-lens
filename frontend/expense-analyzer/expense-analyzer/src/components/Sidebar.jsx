import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid,
  Receipt,
  FolderKanban,
  LineChart,
  ShieldAlert,
  Sparkles,
  Landmark,
} from 'lucide-react';

const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/expenses', labelKey: 'nav.expenses', icon: Receipt },
  { to: '/tax', labelKey: 'nav.taxCenter', icon: Landmark },
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
      <div className="flex items-center px-5 h-16 border-b border-white/10">
        <span className="text-base font-bold tracking-wide text-white">ExpenseLens</span>
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
    </aside>
  );
}
