import { useState } from 'react';
import { readPreference, writePreference } from '../../utils/preferences';

const persist = (speed: number) => writePreference('speed', String(speed));

/** Velocidad inicial recordada entre sesiones. */
export function useSpeedPreference(): { initialSpeed: number; onSpeedChange: (speed: number) => void } {
  const [initialSpeed] = useState(() => {
    const stored = Number(readPreference('speed'));
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
  });
  return { initialSpeed, onSpeedChange: persist };
}
