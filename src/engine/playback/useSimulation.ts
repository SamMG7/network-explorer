import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { type Clock, type SimulationState, SimulationEngine, initialStateFor } from './simulationEngine';

export interface SimulationControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
}

export interface Playable<S extends { durationMs: number }> {
  id: string;
  steps: readonly S[];
}

export interface UseSimulationResult<S> {
  state: SimulationState;
  step: S | undefined;
  controls: SimulationControls;
}

/**
 * Conecta un único `SimulationEngine` (vida = componente) con React.
 * Cuando cambia el `id` de lo que se reproduce (escenario, recorrido o una
 * nueva entrada de la calculadora), `engine.load` cancela la reproducción
 * anterior antes de pintar.
 */
export function useSimulation<S extends { durationMs: number }>(
  playable: Playable<S>,
  options: { clock?: Clock; initialSpeed?: number; onSpeedChange?: (speed: number) => void } = {},
): UseSimulationResult<S> {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new SimulationEngine(playable, { clock: options.clock, speed: options.initialSpeed });
  }
  const engine = engineRef.current;
  const engineState = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  useLayoutEffect(() => {
    if (engine.getState().scenarioId !== playable.id) engine.load(playable);
  }, [engine, playable]);

  useEffect(() => () => engine.dispose(), [engine]);

  const onSpeedChange = options.onSpeedChange;
  const speedRef = useRef(engineState.speed);
  useEffect(() => {
    if (speedRef.current !== engineState.speed) {
      speedRef.current = engineState.speed;
      onSpeedChange?.(engineState.speed);
    }
  }, [engineState.speed, onSpeedChange]);

  const state = engineState.scenarioId === playable.id ? engineState : initialStateFor(playable, engineState.speed);

  const controls = useMemo<SimulationControls>(
    () => ({
      play: () => engine.play(),
      pause: () => engine.pause(),
      toggle: () => engine.toggle(),
      next: () => engine.next(),
      prev: () => engine.prev(),
      goTo: (index) => engine.goTo(index),
      reset: () => engine.reset(),
      setSpeed: (speed) => engine.setSpeed(speed),
    }),
    [engine],
  );

  return { state, step: playable.steps[state.stepIndex], controls };
}
