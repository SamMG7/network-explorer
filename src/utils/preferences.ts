/**
 * Preferencias del usuario en localStorage (tema y velocidad).
 * Todas las lecturas/escrituras toleran que el almacenamiento no esté disponible
 * (modo privado, cookies bloqueadas): la app funciona igual sin él.
 */
const PREFIX = 'network-explorer:';

export type PreferenceKey = 'theme' | 'speed';

export function readPreference(key: PreferenceKey): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePreference(key: PreferenceKey, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    /* sin almacenamiento: se ignora */
  }
}
