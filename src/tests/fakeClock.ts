import type { Clock, TimerHandle } from '../engine/playback/simulationEngine';

/** Reloj manual para pruebas deterministas del motor. */
export class FakeClock implements Clock {
  private time = 0;
  private nextId = 1;
  private timers = new Map<number, { at: number; cb: () => void }>();

  now(): number {
    return this.time;
  }

  setTimeout(cb: () => void, ms: number): TimerHandle {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + ms, cb });
    return id as unknown as TimerHandle;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers.delete(handle as unknown as number);
  }

  get pending(): number {
    return this.timers.size;
  }

  /** Avanza el tiempo ejecutando, en orden, los temporizadores que venzan. */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      let nextId: number | null = null;
      let nextAt = Infinity;
      for (const [id, t] of this.timers) {
        if (t.at <= target && t.at < nextAt) {
          nextAt = t.at;
          nextId = id;
        }
      }
      if (nextId === null) break;
      const timer = this.timers.get(nextId)!;
      this.timers.delete(nextId);
      this.time = timer.at;
      timer.cb();
    }
    this.time = target;
  }
}
