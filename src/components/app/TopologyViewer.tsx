import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard } from 'lucide-react';
import type { TopologyScenario } from '../../engine/types/scenario';
import type { Theme } from '../../hooks/useTheme';
import { useSimulation } from '../../engine/playback/useSimulation';
import { buildSnapshots } from '../../engine/simulation/snapshot';
import { evaluateDecision } from '../../engine/simulation/decisions';
import { changedRows } from '../../engine/simulation/diff';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { TopologyCanvas } from '../topology/TopologyCanvas';
import { OsiStack } from '../topology/OsiStack';
import { PduLegend } from '../topology/PduLegend';
import { PlaybackControls } from '../playback/PlaybackControls';
import { StepTimeline } from '../playback/StepTimeline';
import { StepPanel } from '../education/StepPanel';
import { DecisionView } from '../education/DecisionView';
import { HopSummary } from '../education/HopSummary';
import { DeviceInspector } from '../inspector/DeviceInspector';
import { PacketInspector, stepPackets } from '../inspector/PacketInspector';
import { ScenarioHeader } from './ScenarioHeader';
import { useSpeedPreference } from './useSpeedPreference';

type PanelTab = 'paso' | 'dispositivo' | 'paquete';

export function TopologyViewer({ scenario, theme }: { scenario: TopologyScenario; theme: Theme }) {
  const [trackId, setTrackId] = useState(scenario.tracks[0]!.id);
  const track = scenario.tracks.find((t) => t.id === trackId) ?? scenario.tracks[0]!;
  // Cada recorrido es una reproducción independiente para el motor.
  const playable = useMemo(() => ({ id: `${scenario.id}/${track.id}`, steps: track.steps }), [scenario.id, track]);
  const speed = useSpeedPreference();
  const { state, step, controls } = useSimulation(playable, speed);
  usePlaybackShortcuts(controls);
  const reducedMotion = usePrefersReducedMotion();

  // Estado determinista: snapshots precalculados por paso.
  const snapshots = useMemo(() => buildSnapshots(track), [track]);
  const before = snapshots.before[state.stepIndex] ?? snapshots.before[0]!;
  const after = snapshots.after[state.stepIndex] ?? snapshots.after[0]!;
  const outcome = useMemo(() => (step?.decision ? evaluateDecision(step.decision, track, before, after) : null), [step, track, before, after]);

  const [tab, setTab] = useState<PanelTab>('paso');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [vlan, setVlan] = useState<number | null>(null);
  useEffect(() => setPacketId(null), [step?.id]);
  useEffect(() => {
    setDeviceId(null);
    setVlan(null);
    setTab('paso');
  }, [track.id]);

  const onSelectDevice = useCallback((id: string) => {
    setDeviceId(id);
    setTab('dispositivo');
  }, []);
  const onSelectPacket = useCallback((id: string) => {
    setPacketId(id);
    setTab('paquete');
  }, []);
  const vlanColors = useMemo(() => Object.fromEntries((scenario.vlanFilter ?? []).map((v) => [v.id, v.color])), [scenario.vlanFilter]);

  const packets = stepPackets(track, step);
  const name = (id: string) => track.devices.find((d) => d.id === id)?.hostname ?? id;
  const inspectedId = deviceId ?? step?.device ?? null;
  const inspected = track.devices.find((d) => d.id === inspectedId);

  return (
    <div className="grid grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <ScenarioHeader scenario={scenario} />

        {(scenario.tracks.length > 1 || scenario.vlanFilter) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2">
            {scenario.tracks.length > 1 && (
              <div role="tablist" aria-label="Recorridos del escenario" className="flex flex-wrap gap-1 rounded-lg border border-line bg-panel-2 p-0.5">
                {scenario.tracks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={t.id === track.id}
                    onClick={() => setTrackId(t.id)}
                    title={t.description}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition ${t.id === track.id ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
            {scenario.vlanFilter && (
              <div role="radiogroup" aria-label="Resaltar VLAN" className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Ver VLAN:</span>
                <VlanChip label="Todas" active={vlan === null} onClick={() => setVlan(null)} color="var(--muted)" />
                {scenario.vlanFilter.map((v) => (
                  <VlanChip key={v.id} label={`${v.id} · ${v.name}`} active={vlan === v.id} onClick={() => setVlan(v.id)} color={v.color} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative h-[52vh] min-h-[340px] lg:h-auto lg:flex-1">
          <TopologyCanvas
            track={track}
            step={step}
            snapshot={after}
            theme={theme}
            label={scenario.title}
            selectedDeviceId={deviceId}
            vlan={vlan}
            vlanColors={vlanColors}
            animate={!reducedMotion}
            speed={state.speed}
            onSelectDevice={onSelectDevice}
            onSelectPacket={onSelectPacket}
          />
          {scenario.showStack && (
            <div className="pointer-events-none absolute top-3 right-3 hidden w-[230px] sm:block">
              <OsiStack active={step?.stackLayer} />
            </div>
          )}
          <div className="pointer-events-none absolute right-3 bottom-3 hidden sm:block">
            <PduLegend />
          </div>
          {state.status === 'idle' && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
              <p className="rounded-full border border-line bg-panel/90 px-3 py-1.5 text-xs text-muted shadow-sm backdrop-blur sm:mr-[240px]">
                Pulsa <strong className="text-fg">Reproducir</strong> o avanza paso a paso. Haz clic en un equipo o en una PDU para inspeccionarlos.
              </p>
            </div>
          )}
        </div>

        <footer className="space-y-1 border-t border-line bg-panel px-4 pt-1 pb-3">
          <StepTimeline steps={track.steps} state={state} onSelect={controls.goTo} />
          <PlaybackControls state={state} controls={controls} />
          <p className="hidden items-center gap-1.5 text-[11px] text-muted md:flex">
            <Keyboard size={13} aria-hidden="true" /> Atajos: Espacio reproducir/pausar · ← → pasos · R reiniciar
          </p>
        </footer>
      </div>

      <aside className="flex flex-col border-t border-line bg-panel lg:min-h-0 lg:border-t-0 lg:border-l" aria-label="Panel educativo e inspector">
        <div role="tablist" aria-label="Paneles" className="flex shrink-0 border-b border-line">
          <PanelTabButton id="paso" label="Paso" current={tab} onClick={setTab} />
          <PanelTabButton
            id="dispositivo"
            label={`Dispositivo${inspected ? ` · ${inspected.hostname}` : ''}`}
            current={tab}
            onClick={(t) => {
              // Fija el equipo mostrado para que no cambie al avanzar o retroceder.
              if (deviceId === null && inspected) setDeviceId(inspected.id);
              setTab(t);
            }}
          />
          <PanelTabButton id="paquete" label={`Paquete${packets.length ? ` (${packets.length})` : ''}`} current={tab} onClick={setTab} />
        </div>
        <div className="scroll-thin p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" role="tabpanel">
          {tab === 'paso' && (
            <StepPanel
              step={step}
              stepNumber={state.stepIndex + 1}
              totalSteps={state.totalSteps}
              deviceName={step ? (step.device === '—' ? 'Varios' : name(step.device)) : ''}
              decision={outcome && step?.decision ? <DecisionView outcome={outcome} deviceName={name(step.decision.device)} /> : undefined}
              extra={step?.hopSummary ? <HopSummary track={track} upToStep={state.stepIndex} /> : undefined}
            />
          )}
          {tab === 'dispositivo' && (
            <DeviceInspector device={inspected} state={inspectedId ? after[inspectedId] : undefined} changed={inspectedId ? changedRows(before[inspectedId], after[inspectedId]) : undefined} />
          )}
          {tab === 'paquete' && <PacketInspector packets={packets} selectedId={packetId} onSelect={setPacketId} />}
        </div>
      </aside>
    </div>
  );
}

function PanelTabButton({ id, label, current, onClick }: { id: PanelTab; label: string; current: PanelTab; onClick: (t: PanelTab) => void }) {
  const active = id === current;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      className={`min-w-0 flex-1 cursor-pointer truncate border-b-2 px-3 py-2.5 text-xs font-medium transition ${active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
    >
      {label}
    </button>
  );
}

function VlanChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] transition"
      style={{ borderColor: active ? color : 'var(--line)', color: active ? 'var(--fg)' : 'var(--muted)', background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : undefined }}
    >
      <span className="inline-block size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </button>
  );
}
