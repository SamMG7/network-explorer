import type { EducationalStep as ScenarioStep } from '../../engine/types/scenario';
import type { SimulationState } from '../../engine/playback/simulationEngine';
import { TONE_COLOR } from '../shared/visuals';

interface StepTimelineProps {
  steps: ScenarioStep[];
  state: SimulationState;
  onSelect: (index: number) => void;
}

/** Barra de progreso + un segmento clicable por paso. */
export function StepTimeline({ steps, state, onSelect }: StepTimelineProps) {
  const done = state.status === 'finished' ? steps.length : state.stepIndex + (state.status === 'idle' ? 0 : 1);
  const percent = steps.length === 0 ? 0 : Math.round((done / steps.length) * 100);

  return (
    <nav aria-label="Pasos de la simulación">
      <div
        className="sr-only"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progreso de la simulación"
      />
      <ol className="flex gap-1">
        {steps.map((step, index) => {
          const current = index === state.stepIndex && state.status !== 'idle';
          const completed = index < state.stepIndex || state.status === 'finished';
          const color = step.tone && step.tone !== 'info' ? TONE_COLOR[step.tone] : 'var(--accent)';
          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={current ? 'step' : undefined}
                aria-label={`Ir al paso ${index + 1}: ${step.title}`}
                title={`${index + 1}. ${step.title}`}
                className="group block w-full cursor-pointer py-2"
              >
                <span
                  className="block h-1.5 rounded-full transition-all duration-300 group-hover:h-2.5"
                  style={{
                    background: current || completed ? color : 'var(--line)',
                    opacity: completed && !current ? 0.55 : 1,
                    boxShadow: current ? `0 0 0 2px color-mix(in srgb, ${color} 35%, transparent)` : undefined,
                  }}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
