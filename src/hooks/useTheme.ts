import { useCallback, useEffect, useState } from 'react';
import { readPreference, writePreference } from '../utils/preferences';

export type Theme = 'dark' | 'light';

/** Tema oscuro por defecto; la elección se recuerda en localStorage. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => (readPreference('theme') === 'light' ? 'light' : 'dark'));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    writePreference('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggleTheme };
}
