import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

interface AppShellProps {
  header: ReactNode;
  sidebar?: ReactNode;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  children: ReactNode;
}

/**
 * Estructura general. En escritorio (lg+) el catálogo es una columna fija;
 * en pantallas pequeñas es un panel deslizable con fondo.
 */
export function AppShell({ header, sidebar, sidebarOpen, onCloseSidebar, children }: AppShellProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseSidebar();
    window.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, onCloseSidebar]);

  return (
    <div className="flex min-h-dvh flex-col bg-app text-fg lg:h-dvh lg:overflow-hidden">
      <button
        type="button"
        onClick={() => document.getElementById('contenido')?.focus()}
        className="sr-only z-50 rounded bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </button>
      {header}
      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <aside className="hidden w-[300px] shrink-0 border-r border-line bg-app lg:block" aria-label="Catálogo de escenarios">
            {sidebar}
          </aside>
        )}

        {sidebar && sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-black/55"
              aria-label="Cerrar catálogo"
              onClick={onCloseSidebar}
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Catálogo de escenarios"
              className="animate-fade-in absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col border-r border-line bg-app"
            >
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="text-sm font-semibold">Escenarios</span>
                <button
                  type="button"
                  onClick={onCloseSidebar}
                  aria-label="Cerrar catálogo"
                  className="cursor-pointer rounded-md p-1.5 text-muted hover:text-fg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </div>
          </div>
        )}

        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none lg:min-h-0 lg:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
