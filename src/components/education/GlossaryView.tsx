import { useMemo, useState } from 'react';
import { GLOSSARY } from '../../content/glossary';
import { SCENARIOS, normalizeText } from '../../scenarios';
import { SearchInput } from '../catalog/SearchInput';
import { EmptyState } from '../catalog/EmptyState';

/** Glosario completo, con los escenarios donde aparece cada término. */
export function GlossaryView({ onOpenScenario }: { onOpenScenario: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const entries = useMemo(() => {
    const q = normalizeText(query.trim());
    return Object.entries(GLOSSARY)
      .filter(([, g]) => !q || normalizeText(`${g.term} ${g.definition}`).includes(q))
      .sort(([, a], [, b]) => a.term.localeCompare(b.term, 'es'));
  }, [query]);

  const usage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of SCENARIOS) {
      if (s.kind !== 'topology') continue;
      for (const t of s.tracks) for (const st of t.steps) for (const c of st.concepts) {
        if (!map.has(c)) map.set(c, new Set());
        map.get(c)!.add(s.id);
      }
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:h-full lg:overflow-y-auto">
      <header>
        <h1 className="text-xl font-semibold text-fg">Glosario CCNA</h1>
        <p className="text-sm text-muted">{Object.keys(GLOSSARY).length} términos. También puedes abrirlos dentro de cada paso sin salir de la simulación.</p>
      </header>
      <SearchInput value={query} onChange={setQuery} label="Buscar en el glosario" placeholder="Buscar término o definición…" />
      {entries.length === 0 && <EmptyState title="Ningún término coincide" />}
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map(([id, g]) => (
          <div key={id} className="rounded-xl border border-line bg-panel p-3">
            <dt className="font-semibold text-fg">{g.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-fg">{g.definition}</dd>
            {usage.get(id) && (
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {[...usage.get(id)!].map((sid) => {
                  const s = SCENARIOS.find((x) => x.id === sid)!;
                  return (
                    <button key={sid} type="button" onClick={() => onOpenScenario(sid)} className="cursor-pointer rounded-md border border-line px-2 py-0.5 text-[11px] text-accent hover:border-accent">
                      {s.title} →
                    </button>
                  );
                })}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
