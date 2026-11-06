import { AlertTriangle, CheckCircle2, CircleHelp, Info, Target, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EducationalStep } from '../../engine/types/scenario';
import { OSI_LAYERS } from '../../content/osi';
import { TONE_COLOR, TONE_LABEL } from '../shared/visuals';
import { GlossaryChips } from './GlossaryChips';

interface StepPanelProps {
  step: EducationalStep | undefined;
  stepNumber: number;
  totalSteps: number;
  deviceName: string;
  /** Decisión calculada por el motor (si el paso la tiene). */
  decision?: ReactNode;
  /** Contenido adicional (p. ej. resumen por salto). */
  extra?: ReactNode;
}

/** Responde: qué ocurre, por qué, protocolo, capa, decisión, resultado y qué pasaría con un error. */
export function StepPanel({ step, stepNumber, totalSteps, deviceName, decision, extra }: StepPanelProps) {
  if (!step) return null;
  const tone = step.tone ?? 'info';
  const layers = [...step.layers].sort((a, b) => b - a);

  return (
    <section key={step.id} aria-labelledby="step-title" aria-live="polite" className="animate-fade-in space-y-4">
      <header>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-mono">
            Paso {stepNumber}/{totalSteps}
          </span>
          {tone !== 'info' && (
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: TONE_COLOR[tone], borderColor: TONE_COLOR[tone] }}>
              {TONE_LABEL[tone]}
            </span>
          )}
        </div>
        <h2 id="step-title" className="mt-1 text-lg leading-snug font-semibold text-fg">
          {step.title}
        </h2>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Fact label="Capa OSI">
          {layers.map((l) => (
            <span key={l} className="block">
              {l} · {OSI_LAYERS[l].name}
            </span>
          ))}
        </Fact>
        <Fact label="Protocolo">{step.protocol}</Fact>
        <Fact label="Dispositivo">{deviceName}</Fact>
      </dl>

      <Block icon={<Info size={15} />} title="¿Qué ocurre?">
        {step.what}
      </Block>
      <Block icon={<Target size={15} />} title="¿Por qué ocurre?">
        {step.why}
      </Block>
      <Block icon={<Waypoints size={15} />} title="Decisión del dispositivo">
        {step.decisionText}
      </Block>
      {decision}
      <Block icon={<CheckCircle2 size={15} />} title="Resultado" accent="var(--ok)">
        {step.result}
      </Block>
      {extra}
      <Block icon={<AlertTriangle size={15} />} title="¿Y si hay un error de configuración?" accent="var(--warn)">
        {step.misconfig}
      </Block>

      <GlossaryChips ids={step.concepts} />

      {step.simplification && (
        <p className="flex gap-2 rounded-lg border border-dashed border-line p-3 text-xs leading-relaxed text-muted">
          <CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">Simplificación: </strong>
            {step.simplification}
          </span>
        </p>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2/50 px-2 py-1.5">
      <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 leading-snug font-medium text-fg">{children}</dd>
    </div>
  );
}

function Block({ icon, title, children, accent }: { icon: ReactNode; title: string; children: ReactNode; accent?: string }) {
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase" style={{ color: accent ?? 'var(--cyan)' }}>
        <span aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-fg">{children}</p>
    </div>
  );
}
