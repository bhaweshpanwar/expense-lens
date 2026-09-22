import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

export default function LanguageSwitcher({ variant = 'dropdown' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'toggle') {
    return (
      <div className="inline-flex items-center text-xs font-medium border border-[var(--color-line)] rounded-md overflow-hidden bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => changeLanguage('en')}
          className={`px-2.5 py-1 transition-colors ${
            currentLang === 'en'
              ? 'bg-[var(--color-brand)] text-white font-semibold'
              : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
          }`}
        >
          English
        </button>
        <span className="text-[var(--color-line)]">|</span>
        <button
          type="button"
          onClick={() => changeLanguage('hi')}
          className={`px-2.5 py-1 transition-colors ${
            currentLang === 'hi'
              ? 'bg-[var(--color-brand)] text-white font-semibold'
              : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]'
          }`}
        >
          हिन्दी
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink)] bg-[var(--color-surface)] hover:bg-[var(--color-line-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
      >
        <span role="img" aria-label="globe" className="text-sm leading-none">
          🌐
        </span>
        <span>{currentLang === 'hi' ? 'हिन्दी' : 'English'}</span>
        <ChevronDown
          size={12}
          className={`text-[var(--color-ink-soft)] transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 origin-top-right rounded-md bg-[var(--color-surface)] border border-[var(--color-line)] shadow-lg py-1 z-50 focus:outline-none">
          {languages.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'font-semibold text-[var(--color-brand)] bg-[var(--color-brand-light)]/50'
                    : 'text-[var(--color-ink)] hover:bg-[var(--color-line-soft)]'
                }`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check size={13} className="text-[var(--color-brand)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
