import { useEffect } from 'react';
import type { SimulationControls } from '../engine/playback/useSimulation';

const INTERACTIVE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY']);

/**
 * Atajos globales:  Espacio/K reproducir·pausar · ←/J anterior · →/L siguiente · R reiniciar.
 * Se ignoran mientras se escribe en un campo. Espacio también se ignora sobre
 * botones y enlaces para no duplicar su activación nativa.
 */
export function usePlaybackShortcuts(controls: SimulationControls, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          if (event.key === ' ' && INTERACTIVE.has(tag)) return;
          event.preventDefault();
          controls.toggle();
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          event.preventDefault();
          controls.next();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          event.preventDefault();
          controls.prev();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          controls.reset();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controls, enabled]);
}
