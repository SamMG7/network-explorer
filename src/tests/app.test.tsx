import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { SCENARIOS } from '../scenarios';
import { useSimulation } from '../engine/playback/useSimulation';
import { FakeClock } from './fakeClock';
import type { TopologyScenario } from '../engine/types/scenario';

const catalog = () => screen.getAllByRole('complementary', { name: 'Catálogo de escenarios' })[0]!;
const stepTitle = () => screen.getByRole('heading', { level: 2 }).textContent;

describe('useSimulation', () => {
  it('cambiar de recorrido cancela la reproducción y reinicia', () => {
    const clock = new FakeClock();
    const s = SCENARIOS.find((x) => x.id === 'dhcp-nat') as TopologyScenario;
    const [dhcp, nat] = s.tracks.map((t) => ({ id: t.id, steps: t.steps }));
    const { result, rerender } = renderHook(({ p }) => useSimulation(p!, { clock }), { initialProps: { p: dhcp } });
    act(() => result.current.controls.play());
    act(() => clock.advance(dhcp!.steps[0]!.durationMs + 1));
    expect(result.current.state.stepIndex).toBe(1);
    rerender({ p: nat });
    expect(result.current.state).toMatchObject({ scenarioId: 'nat', stepIndex: 0, status: 'idle' });
    expect(clock.pending).toBe(0);
  });
});

describe('App (integración)', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('muestra los seis escenarios', () => {
    render(<App />);
    expect(within(catalog()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(SCENARIOS.map((s) => s.title));
  });

  it('reproduce, y al cambiar de escenario no siguen corriendo temporizadores', () => {
    render(<App />);
    const osi = SCENARIOS[0] as TopologyScenario;
    fireEvent.click(screen.getByRole('button', { name: /Reproducir \(Espacio\)/ }));
    act(() => vi.advanceTimersByTime(osi.tracks[0]!.steps[0]!.durationMs + 10));
    expect(stepTitle()).toBe(osi.tracks[0]!.steps[1]!.title);

    fireEvent.click(within(catalog()).getByRole('button', { name: /ARP y switching/ }));
    const arp = SCENARIOS[1] as TopologyScenario;
    expect(stepTitle()).toBe(arp.tracks[0]!.steps[0]!.title);
    expect(screen.getByText('Listo para iniciar')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(120_000));
    expect(stepTitle()).toBe(arp.tracks[0]!.steps[0]!.title);
  });

  it('avanzar y retroceder actualiza el panel y la decisión calculada', () => {
    window.location.hash = '#/escenario/routing-ipv4';
    render(<App />);
    const t = (SCENARIOS.find((s) => s.id === 'routing-ipv4') as TopologyScenario).tracks[0]!;
    fireEvent.click(screen.getByRole('button', { name: `Ir al paso 5: ${t.steps[4]!.title}` }));
    expect(stepTitle()).toBe(t.steps[4]!.title);
    expect(screen.getByLabelText('Decisión calculada por el simulador')).toHaveTextContent('via 10.0.12.2');
    fireEvent.click(screen.getByRole('button', { name: /Paso anterior/ }));
    expect(stepTitle()).toBe(t.steps[3]!.title);
  });

  it('el inspector muestra la tabla MAC del estado del paso', () => {
    window.location.hash = '#/escenario/arp-switching';
    render(<App />);
    const t = (SCENARIOS.find((s) => s.id === 'arp-switching') as TopologyScenario).tracks[0]!;
    fireEvent.click(screen.getByRole('button', { name: `Ir al paso 4: ${t.steps[3]!.title}` }));
    // jsdom no calcula layout y React Flow no dibuja nodos; se abre el inspector por su pestaña,
    // que muestra el dispositivo que procesa el paso (S1).
    fireEvent.click(screen.getByRole('tab', { name: /Dispositivo · S1/ }));
    expect(screen.getByRole('tab', { name: /Dispositivo · S1/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('0050.7966.6801')).toBeInTheDocument();
    // Volver al paso 3: la tabla vuelve a estar vacía.
    fireEvent.click(screen.getByRole('button', { name: `Ir al paso 3: ${t.steps[2]!.title}` }));
    expect(screen.getByText(/Tabla vacía/)).toBeInTheDocument();
  });

  it('el glosario contextual se abre sin salir de la simulación', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Modelo OSI' }));
    expect(screen.getByRole('region', { name: 'Definición: Modelo OSI' })).toBeInTheDocument();
  });

  it('la calculadora valida entradas y recalcula', () => {
    window.location.hash = '#/escenario/ipv4-subnetting';
    render(<App />);
    const ipInput = screen.getByLabelText('Dirección IPv4');
    fireEvent.change(ipInput, { target: { value: '300.1.1.1' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Dirección IPv4 inválida');
    fireEvent.change(ipInput, { target: { value: '10.0.12.0' } });
    fireEvent.change(screen.getByLabelText('Prefijo CIDR'), { target: { value: '31' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText(/RFC 3021/).length).toBeGreaterThan(0);
  });

  it('cambiar de recorrido en DHCP/NAT reinicia los pasos', () => {
    window.location.hash = '#/escenario/dhcp-nat';
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'NAT/PAT' }));
    const nat = (SCENARIOS.find((s) => s.id === 'dhcp-nat') as TopologyScenario).tracks[1]!;
    expect(stepTitle()).toBe(nat.steps[0]!.title);
  });
});
