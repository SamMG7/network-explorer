import { ChevronDown, GraduationCap } from 'lucide-react';
import type { Scenario } from '../../engine/types/scenario';
import { CCNA_CATEGORIES } from '../../content/categories';
import { DifficultyBadge } from '../catalog/DifficultyBadge';

export function ScenarioHeader({ scenario }: { scenario: Scenario }) {
  const category = CCNA_CATEGORIES.find((c) => c.id === scenario.category)?.label;
  return (
    <header className="border-b border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{category}</span>
        <DifficultyBadge difficulty={scenario.difficulty} />
        {scenario.examTopics.map((t) => (
          <span key={t} className="rounded border border-line px-1.5 py-0.5 text-[10px]">
            {t}
          </span>
        ))}
      </div>
      <h1 className="mt-1 text-xl font-semibold text-fg">{scenario.title}</h1>
      <p className="mt-0.5 max-w-3xl text-sm text-muted">{scenario.summary}</p>
      <details className="group mt-2 max-w-3xl">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-accent">
          <GraduationCap size={14} aria-hidden="true" /> Objetivos y simplificaciones
          <ChevronDown size={14} className="transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
          <ul className="list-disc space-y-1 pl-5 text-fg">
            {scenario.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {scenario.simplifications.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </details>
    </header>
  );
}
