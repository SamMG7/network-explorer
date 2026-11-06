import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationEngine, type EngineScenario } from '../engine/playback/simulationEngine';
import { FakeClock } from './fakeClock';

const SCENARIO: EngineScenario = {
  id: 'demo',
  steps: [{ durationMs: 1000 }, { durationMs: 2000 }, { durationMs: 1000 }],
};
const OTHER: EngineScenario = { id: 'otro', steps: [{ durationMs: 500 }, { durationMs: 500 }] };

let clock: FakeClock;
let engine: SimulationEngine;

beforeEach(() => {
  clock = new FakeClock();
  engine = new SimulationEngine(SCENARIO, { clock });
});

describe('estado inicial', () => {
  it('empieza en idle, paso 0, velocidad 1', () => {
    expect(engine.getState()).toEqual({ scenarioId: 'demo', stepIndex: 0, totalSteps: 3, status: 'idle', speed: 1 });
    expect(clock.pending).toBe(0);
  });
});

describe('reproducción automática', () => {
  it('avanza según la duración de cada paso y termina en finished', () => {
    engine.play();
    expect(engine.getState().status).toBe('playing');
    clock.advance(999);
    expect(engine.getState().stepIndex).toBe(0);
    clock.advance(1);
    expect(engine.getState().stepIndex).toBe(1);
    clock.advance(2000);
    expect(engine.getState().stepIndex).toBe(2);
    clock.advance(1000);
    expect(engine.getState()).toMatchObject({ stepIndex: 2, status: 'finished' });
    expect(clock.pending).toBe(0);
  });

  it('nunca tiene más de un temporizador pendiente', () => {
    engine.play();
    engine.next();
    engine.goTo(0);
    engine.setSpeed(2);
    engine.play();
    expect(clock.pending).toBe(1);
  });

  it('reproducir desde finished reinicia en el paso 0', () => {
    engine.play();
    clock.advance(10_000);
    expect(engine.getState().status).toBe('finished');
    engine.play();
    expect(engine.getState()).toMatchObject({ stepIndex: 0, status: 'playing' });
  });

  it('notifica a los suscriptores en cada cambio', () => {
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    engine.play();
    clock.advance(1000);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    engine.next();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('pausa y reanudación', () => {
  it('conserva el tiempo restante del paso', () => {
    engine.play();
    clock.advance(400);
    engine.pause();
    expect(engine.getState().status).toBe('paused');
    expect(clock.pending).toBe(0);

    clock.advance(5000); // en pausa no avanza
    expect(engine.getState().stepIndex).toBe(0);

    engine.play();
    clock.advance(599);
    expect(engine.getState().stepIndex).toBe(0);
    clock.advance(1);
    expect(engine.getState().stepIndex).toBe(1);
  });

  it('toggle alterna entre reproducir y pausar', () => {
    engine.toggle();
    expect(engine.getState().status).toBe('playing');
    engine.toggle();
    expect(engine.getState().status).toBe('paused');
  });

  it('pausar sin reproducir no hace nada', () => {
    engine.pause();
    expect(engine.getState().status).toBe('idle');
  });
});

describe('avance y retroceso manual', () => {
  it('next y prev cambian de paso y dejan en pausa', () => {
    engine.next();
    expect(engine.getState()).toMatchObject({ stepIndex: 1, status: 'paused' });
    engine.prev();
    expect(engine.getState()).toMatchObject({ stepIndex: 0, status: 'paused' });
    engine.prev();
    expect(engine.getState().stepIndex).toBe(0);
    expect(clock.pending).toBe(0);
  });

  it('next en el último paso finaliza la simulación', () => {
    engine.goTo(2);
    engine.next();
    expect(engine.getState()).toMatchObject({ stepIndex: 2, status: 'finished' });
  });

  it('prev desde finished vuelve al paso anterior', () => {
    engine.goTo(2);
    engine.next();
    engine.prev();
    expect(engine.getState()).toMatchObject({ stepIndex: 1, status: 'paused' });
  });

  it('navegar mientras se reproduce reinicia el temporizador del nuevo paso', () => {
    engine.play();
    clock.advance(900);
    engine.next(); // paso 1 (2000 ms) completo desde ahora
    expect(engine.getState()).toMatchObject({ stepIndex: 1, status: 'playing' });
    clock.advance(1999);
    expect(engine.getState().stepIndex).toBe(1);
    clock.advance(1);
    expect(engine.getState().stepIndex).toBe(2);
  });

  it('goTo acota índices fuera de rango', () => {
    engine.goTo(99);
    expect(engine.getState().stepIndex).toBe(2);
    engine.goTo(-5);
    expect(engine.getState().stepIndex).toBe(0);
  });
});

describe('reinicio', () => {
  it('vuelve a idle en el paso 0 y cancela el temporizador', () => {
    engine.play();
    clock.advance(1500);
    engine.reset();
    expect(engine.getState()).toMatchObject({ stepIndex: 0, status: 'idle' });
    expect(clock.pending).toBe(0);
    clock.advance(10_000);
    expect(engine.getState().stepIndex).toBe(0);
  });
});

describe('velocidad', () => {
  it('a 2x los pasos duran la mitad', () => {
    engine.setSpeed(2);
    engine.play();
    clock.advance(500);
    expect(engine.getState().stepIndex).toBe(1);
  });

  it('cambiar la velocidad durante la reproducción escala el tiempo restante', () => {
    engine.play();
    clock.advance(500); // quedan 500 ms a 1x
    engine.setSpeed(2); // ahora quedan 250 ms
    clock.advance(249);
    expect(engine.getState().stepIndex).toBe(0);
    clock.advance(1);
    expect(engine.getState().stepIndex).toBe(1);
  });

  it('cambiar la velocidad en pausa escala el tiempo restante al reanudar', () => {
    engine.play();
    clock.advance(500);
    engine.pause();
    engine.setSpeed(0.5); // 500 ms restantes → 1000 ms
    engine.play();
    clock.advance(999);
    expect(engine.getState().stepIndex).toBe(0);
    clock.advance(1);
    expect(engine.getState().stepIndex).toBe(1);
  });

  it('acota velocidades inválidas', () => {
    engine.setSpeed(100);
    expect(engine.getState().speed).toBe(4);
    engine.setSpeed(Number.NaN);
    expect(engine.getState().speed).toBe(1);
  });
});

describe('cambio de escenario y cancelación', () => {
  it('load cancela la reproducción anterior y conserva la velocidad', () => {
    engine.setSpeed(1.5);
    engine.play();
    clock.advance(300);
    engine.load(OTHER);
    expect(clock.pending).toBe(0);
    expect(engine.getState()).toEqual({ scenarioId: 'otro', stepIndex: 0, totalSteps: 2, status: 'idle', speed: 1.5 });
    clock.advance(10_000);
    expect(engine.getState().stepIndex).toBe(0);
  });

  it('dispose detiene el temporizador y deja en pausa', () => {
    engine.play();
    engine.dispose();
    expect(clock.pending).toBe(0);
    expect(engine.getState().status).toBe('paused');
  });

  it('un escenario sin pasos ignora los comandos', () => {
    const empty = new SimulationEngine({ id: 'vacio', steps: [] }, { clock });
    empty.play();
    empty.next();
    empty.prev();
    expect(empty.getState()).toMatchObject({ status: 'idle', stepIndex: 0 });
    expect(clock.pending).toBe(0);
  });
});
