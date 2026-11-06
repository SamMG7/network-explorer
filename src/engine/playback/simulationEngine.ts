/**
 * Motor de simulación de AWS Explorer.
 *
 * - No conoce React ni el contenido de los escenarios: solo necesita
 *   un id y la duración de cada paso.
 * - Es la ÚNICA pieza que crea temporizadores. Existe como máximo un
 *   temporizador pendiente a la vez, y se cancela en cada transición.
 * - El reloj es inyectable para poder probarlo de forma determinista.
 */

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface SimulationState {
  scenarioId: string;
  stepIndex: number;
  totalSteps: number;
  status: PlaybackStatus;
  speed: number;
}

export interface EngineScenario {
  id: string;
  steps: ReadonlyArray<{ durationMs: number }>;
}

export type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/** Reloj por defecto. Resuelve las funciones globales en cada llamada (compatible con temporizadores falsos). */
export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};

export const SPEED_OPTIONS = [0.5, 1, 2] as const;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

type Listener = () => void;

export function initialStateFor(scenario: EngineScenario, speed = 1): SimulationState {
  return {
    scenarioId: scenario.id,
    stepIndex: 0,
    totalSteps: scenario.steps.length,
    status: 'idle',
    speed,
  };
}

export class SimulationEngine {
  private scenario: EngineScenario;
  private state: SimulationState;
  private readonly clock: Clock;
  private readonly listeners = new Set<Listener>();

  private timer: TimerHandle | null = null;
  private timerStartedAt = 0;
  private timerDelay = 0;
  /** Tiempo real restante del paso actual cuando se pausó. */
  private remainingMs: number | null = null;

  constructor(scenario: EngineScenario, options: { clock?: Clock; speed?: number } = {}) {
    this.scenario = scenario;
    this.clock = options.clock ?? systemClock;
    this.state = initialStateFor(scenario, clampSpeed(options.speed ?? 1));
  }

  // ---------------------------------------------------------------- lectura

  getState = (): SimulationState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Útil en pruebas para verificar que no quedan temporizadores huérfanos. */
  hasPendingTimer(): boolean {
    return this.timer !== null;
  }

  // ---------------------------------------------------------------- comandos

  play(): void {
    const { status, stepIndex, totalSteps } = this.state;
    if (totalSteps === 0 || status === 'playing') return;

    if (status === 'finished') {
      this.remainingMs = null;
      this.update({ stepIndex: 0, status: 'playing' });
      this.schedule(this.stepDuration(0));
      return;
    }

    const delay = this.remainingMs ?? this.stepDuration(stepIndex);
    this.remainingMs = null;
    this.update({ status: 'playing' });
    this.schedule(delay);
  }

  pause(): void {
    if (this.state.status !== 'playing') return;
    this.remainingMs = this.timeLeftOnTimer();
    this.clearTimer();
    this.update({ status: 'paused' });
  }

  toggle(): void {
    if (this.state.status === 'playing') this.pause();
    else this.play();
  }

  next(): void {
    const { stepIndex, totalSteps } = this.state;
    if (totalSteps === 0) return;
    if (stepIndex >= totalSteps - 1) {
      this.finish();
      return;
    }
    this.goTo(stepIndex + 1);
  }

  prev(): void {
    if (this.state.totalSteps === 0) return;
    this.goTo(Math.max(0, this.state.stepIndex - 1));
  }

  /** Salta a un paso. Si se estaba reproduciendo, continúa desde ese paso; si no, queda en pausa. */
  goTo(index: number): void {
    const { totalSteps, status } = this.state;
    if (totalSteps === 0) return;
    const target = Math.min(Math.max(0, Math.trunc(index)), totalSteps - 1);
    const wasPlaying = status === 'playing';

    this.remainingMs = null;
    this.update({ stepIndex: target, status: wasPlaying ? 'playing' : 'paused' });
    if (wasPlaying) this.schedule(this.stepDuration(target));
    else this.clearTimer();
  }

  reset(): void {
    this.clearTimer();
    this.remainingMs = null;
    this.update({ stepIndex: 0, status: 'idle' });
  }

  /**
   * Cambia la velocidad conservando el progreso proporcional del paso actual:
   * si quedaba la mitad del paso, seguirá quedando la mitad a la nueva velocidad.
   */
  setSpeed(speed: number): void {
    const next = clampSpeed(speed);
    const previous = this.state.speed;
    if (next === previous) return;
    const ratio = previous / next;

    if (this.state.status === 'playing') {
      const remaining = this.timeLeftOnTimer() * ratio;
      this.update({ speed: next });
      this.schedule(remaining);
      return;
    }
    if (this.remainingMs !== null) this.remainingMs *= ratio;
    this.update({ speed: next });
  }

  /** Carga otro escenario: cancela cualquier reproducción pendiente y vuelve al estado inicial. */
  load(scenario: EngineScenario): void {
    this.clearTimer();
    this.remainingMs = null;
    this.scenario = scenario;
    this.state = initialStateFor(scenario, this.state.speed);
    this.emit();
  }

  /** Detiene temporizadores. El motor puede reutilizarse después. */
  dispose(): void {
    this.clearTimer();
    if (this.state.status === 'playing') {
      this.update({ status: 'paused' });
    }
  }

  // ---------------------------------------------------------------- internos

  private finish(): void {
    this.clearTimer();
    this.remainingMs = null;
    this.update({ stepIndex: Math.max(0, this.state.totalSteps - 1), status: 'finished' });
  }

  private onStepElapsed = (): void => {
    this.timer = null;
    if (this.state.status !== 'playing') return;
    const { stepIndex, totalSteps } = this.state;
    if (stepIndex < totalSteps - 1) {
      const nextIndex = stepIndex + 1;
      this.update({ stepIndex: nextIndex });
      this.schedule(this.stepDuration(nextIndex));
    } else {
      this.finish();
    }
  };

  private stepDuration(index: number): number {
    const step = this.scenario.steps[index];
    const base = step ? step.durationMs : 0;
    return Math.max(0, base / this.state.speed);
  }

  private schedule(delay: number): void {
    this.clearTimer();
    this.timerStartedAt = this.clock.now();
    this.timerDelay = delay;
    this.timer = this.clock.setTimeout(this.onStepElapsed, delay);
  }

  private timeLeftOnTimer(): number {
    if (this.timer === null) return this.remainingMs ?? 0;
    const elapsed = this.clock.now() - this.timerStartedAt;
    return Math.max(0, this.timerDelay - elapsed);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private update(partial: Partial<SimulationState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}
