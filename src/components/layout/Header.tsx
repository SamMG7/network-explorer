import { BookA, Menu, Moon, PlayCircle, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Theme } from '../../hooks/useTheme';
import type { AppView } from '../../hooks/useHashRoute';

export const APP_VERSION = '0.1.0';

interface HeaderProps {
  view: AppView;
  scenarioTitle?: string;
  onNavigate: (view: AppView) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenCatalog?: () => void;
}

export function Header({ view, scenarioTitle, onNavigate, theme, onToggleTheme, onOpenCatalog }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/95 px-3 backdrop-blur sm:px-4">
      {onOpenCatalog && (
        <button type="button" onClick={onOpenCatalog} className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line text-fg lg:hidden" aria-label="Abrir catálogo de escenarios">
          <Menu size={18} />
        </button>
      )}
      <a href="#/" className="flex shrink-0 items-center gap-2" aria-label="Network Explorer, inicio">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap text-fg">
          Network <span className="text-cyan">Explorer</span>
        </span>
      </a>
      <span className="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-muted sm:inline" title="Versión de la aplicación">
        v{APP_VERSION} · CCNA 200-301
      </span>
      {scenarioTitle && (
        <p className="hidden min-w-0 truncate border-l border-line pl-3 text-sm text-muted md:block" aria-label="Escenario actual">
          {scenarioTitle}
        </p>
      )}

      <nav aria-label="Navegación principal" className="ml-auto flex items-center gap-1">
        <NavButton active={view === 'simulador'} onClick={() => onNavigate('simulador')} icon={<PlayCircle size={16} />}>
          Simulaciones
        </NavButton>
        <NavButton active={view === 'glosario'} onClick={() => onNavigate('glosario')} icon={<BookA size={16} />}>
          Glosario
        </NavButton>
      </nav>
      <button
        type="button"
        onClick={onToggleTheme}
        className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line text-fg transition hover:border-accent"
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${active ? 'bg-accent/15 text-fg' : 'text-muted hover:text-fg'}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="max-sm:sr-only">{children}</span>
    </button>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--panel-2)" stroke="var(--line)" />
      <path d="M16 11v5M16 16l-7 5M16 16l7 5" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="8" r="3.2" fill="var(--cyan)" />
      <circle cx="7" cy="23" r="3.2" fill="var(--accent)" />
      <circle cx="25" cy="23" r="3.2" fill="var(--ok)" />
      <circle cx="16" cy="16" r="2" fill="var(--orange)" />
    </svg>
  );
}
