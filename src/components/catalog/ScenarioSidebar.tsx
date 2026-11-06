import { useMemo, useState } from 'react';
import { Clock, ListOrdered, Route } from 'lucide-react';
import type { CcnaCategoryId, Difficulty, Scenario } from '../../engine/types/scenario';
import { CCNA_CATEGORIES } from '../../content/categories';
import { filterScenarios, stepCount } from '../../scenarios';
import { SearchInput } from './SearchInput';
import { EmptyState } from './EmptyState';
import { DifficultyBadge } from './DifficultyBadge';

interface ScenarioSidebarProps {
  scenarios: Scenario[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const DIFFICULTIES: Array<Difficulty | 'todas'> = ['todas', 'básico', 'intermedio', 'avanzado'];

export function ScenarioSidebar({ scenarios, selectedId, onSelect }: ScenarioSidebarProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CcnaCategoryId | 'todas'>('todas');
  const [difficulty, setDifficulty] = useState<Difficulty | 'todas'>('todas');
  const filtered = useMemo(() => filterScenarios(scenarios, query, category, difficulty), [scenarios, query, category, difficulty]);
  const usedDifficulties = DIFFICULTIES.filter((d) => d === 'todas' || scenarios.some((s) => s.difficulty === d));

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <SearchInput value={query} onChange={setQuery} label="Buscar escenarios" placeholder="Buscar: ARP, VLAN, TTL, NAT…" />

      <div role="group" aria-label="Filtrar por categoría CCNA" className="flex flex-wrap gap-1.5">
        <Chip label="Todas" active={category === 'todas'} onClick={() => setCategory('todas')} />
        {CCNA_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} active={category === c.id} onClick={() => setCategory(c.id)} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="difficulty" className="text-xs text-muted">
          Dificultad
        </label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | 'todas')}
          className="flex-1 cursor-pointer rounded-lg border border-line bg-panel-2 px-2 py-1 text-xs text-fg capitalize focus:border-accent focus:outline-none"
        >
          {usedDifficulties.map((d) => (
            <option key={d} value={d}>
              {d === 'todas' ? 'Todas' : d}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted" aria-live="polite">
        {filtered.length} de {scenarios.length} escenarios
      </p>

      <ul className="scroll-thin -mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.map((s) => {
          const selected = s.id === selectedId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={selected ? 'true' : undefined}
                className={`w-full cursor-pointer rounded-xl border p-3 text-left transition ${selected ? 'border-accent bg-accent/10' : 'border-line bg-panel hover:border-muted'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-muted">{String(scenarios.indexOf(s) + 1).padStart(2, '0')}</span>
                  <DifficultyBadge difficulty={s.difficulty} />
                </div>
                <h3 className="mt-1 text-sm leading-snug font-semibold text-fg">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{s.summary}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <ListOrdered size={12} aria-hidden="true" />
                    {s.kind === 'subnetting' ? 'Calculadora + pasos' : `${stepCount(s)} pasos`}
                  </span>
                  {s.kind === 'topology' && s.tracks.length > 1 && (
                    <span className="flex items-center gap-1">
                      <Route size={12} aria-hidden="true" />
                      {s.tracks.length} recorridos
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} aria-hidden="true" />~{s.estimatedMinutes} min
                  </span>
                </p>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li>
            <EmptyState
              title="Sin resultados"
              description="Prueba con “ARP”, “TTL”, “802.1Q” o “PAT”."
              action={
                <button
                  type="button"
                  className="cursor-pointer text-xs text-accent hover:underline"
                  onClick={() => {
                    setQuery('');
                    setCategory('todas');
                    setDifficulty('todas');
                  }}
                >
                  Limpiar filtros
                </button>
              }
            />
          </li>
        )}
      </ul>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition ${active ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'}`}
    >
      {label}
    </button>
  );
}
