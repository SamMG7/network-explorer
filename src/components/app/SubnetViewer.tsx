import { useEffect, useMemo, useState } from 'react';
import type { SubnettingScenario } from '../../engine/types/scenario';
import { calculateSubnet, formatIPv4, parseSubnetInput } from '../../services/network/ipv4';
import { buildSubnetSteps } from '../../scenarios/subnetting/subnetSteps';
import { useSimulation } from '../../engine/playback/useSimulation';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { SubnetLab } from '../subnetting/SubnetLab';
import { StepPanel } from '../education/StepPanel';
import { PlaybackControls } from '../playback/PlaybackControls';
import { StepTimeline } from '../playback/StepTimeline';
import { ScenarioHeader } from './ScenarioHeader';
import { useSpeedPreference } from './useSpeedPreference';

export function SubnetViewer({ scenario }: { scenario: SubnettingScenario }) {
  const first = scenario.examples[0]!;
  const [ipText, setIpText] = useState(first.ip);
  const [prefixText, setPrefixText] = useState(String(first.prefix));
  const parsed = parseSubnetInput(ipText, prefixText);
  const error = parsed.ok ? null : parsed.error;
  // Se conserva la última entrada válida mientras el usuario escribe algo incompleto.
  const [lastValid, setLastValid] = useState(() => {
    const p = parseSubnetInput(first.ip, String(first.prefix));
    if (!p.ok) throw new Error('Ejemplo inicial inválido');
    return p.value;
  });
  const validIp = parsed.ok ? parsed.value.ip : null;
  const validPrefix = parsed.ok ? parsed.value.prefix : null;
  useEffect(() => {
    if (validIp !== null && validPrefix !== null) setLastValid({ ip: validIp, prefix: validPrefix });
  }, [validIp, validPrefix]);
  const ip = validIp ?? lastValid.ip;
  const prefix = validPrefix ?? lastValid.prefix;

  const result = useMemo(() => calculateSubnet(ip, prefix), [ip, prefix]);
  // La explicación paso a paso se regenera con cada entrada nueva.
  const playable = useMemo(() => ({ id: `subnet/${formatIPv4(ip)}/${prefix}`, steps: buildSubnetSteps(result) }), [ip, prefix, result]);
  const { state, step, controls } = useSimulation(playable, useSpeedPreference());
  usePlaybackShortcuts(controls);

  return (
    <div className="grid grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <ScenarioHeader scenario={scenario} />
        <div className="scroll-thin lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <SubnetLab
            scenario={scenario}
            ipText={ipText}
            prefixText={prefixText}
            onIpChange={setIpText}
            onPrefixChange={setPrefixText}
            onExample={(ip, prefix) => {
              setIpText(ip);
              setPrefixText(String(prefix));
            }}
            result={result}
            error={error}
            focus={step?.focus ?? 'entrada'}
          />
        </div>
        <footer className="space-y-1 border-t border-line bg-panel px-4 pt-1 pb-3">
          <StepTimeline steps={playable.steps} state={state} onSelect={controls.goTo} />
          <PlaybackControls state={state} controls={controls} />
        </footer>
      </div>
      <aside className="scroll-thin border-t border-line bg-panel p-4 lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-l" aria-label="Explicación paso a paso">
        <StepPanel step={step} stepNumber={state.stepIndex + 1} totalSteps={state.totalSteps} deviceName="Calculadora (host que decide)" />
      </aside>
    </div>
  );
}
