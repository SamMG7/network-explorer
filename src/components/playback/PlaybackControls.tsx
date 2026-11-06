import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { ReactNode } from 'react';
import { SPEED_OPTIONS, type SimulationState } from '../../engine/playback/simulationEngine';
import type { SimulationControls } from '../../engine/playback/useSimulation';

const STATUS_LABEL: Record<SimulationState['status'], string> = {
  idle: 'Listo para iniciar',
  playing: 'Reproduciendo',
  paused: 'En pausa',
  finished: 'Simulación finalizada',
};

interface PlaybackControlsProps {
  state: SimulationState;
  controls: SimulationControls;
}

export function PlaybackControls({ state, controls }: PlaybackControlsProps) {
  const { status, stepIndex, totalSteps, speed } = state;
  const isPlaying = status === 'playing';
  const atStart = stepIndex === 0 && status !== 'finished';
  const playLabel = isPlaying ? 'Pausar' : status === 'finished' ? 'Reproducir desde el inicio' : status === 'paused' ? 'Reanudar' : 'Reproducir';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5" role="group" aria-label="Controles de reproducción">
        <ControlButton label="Reiniciar (R)" onClick={controls.reset} disabled={status === 'idle' && stepIndex === 0}>
          <RotateCcw size={17} />
        </ControlButton>
        <ControlButton label="Paso anterior (←)" onClick={controls.prev} disabled={atStart}>
          <SkipBack size={17} />
        </ControlButton>
        <button
          type="button"
          onClick={controls.toggle}
          aria-label={`${playLabel} (Espacio)`}
          title={`${playLabel} (Espacio)`}
          className="flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          <span className="hidden sm:inline">{playLabel}</span>
        </button>
        <ControlButton label="Paso siguiente (→)" onClick={controls.next} disabled={status === 'finished'}>
          <SkipForward size={17} />
        </ControlButton>
      </div>

      <div className="flex items-center gap-2" role="radiogroup" aria-label="Velocidad de reproducción">
        <span className="text-xs text-muted">Velocidad</span>
        <div className="flex rounded-lg border border-line bg-panel-2 p-0.5">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={speed === option}
              onClick={() => controls.setSpeed(option)}
              className={`cursor-pointer rounded-md px-2 py-1 font-mono text-xs transition ${
                speed === option ? 'bg-accent text-white' : 'text-muted hover:text-fg'
              }`}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>

      <p className="ml-auto text-xs text-muted" aria-live="polite">
        <span className="font-medium text-fg">{STATUS_LABEL[status]}</span>
        {' · '}Paso {Math.min(stepIndex + 1, totalSteps)} de {totalSteps}
      </p>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-line bg-panel-2 text-fg transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
    >
      {children}
    </button>
  );
}
