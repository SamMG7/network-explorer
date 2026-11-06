import { useState } from 'react';
import { BookA, X } from 'lucide-react';
import { GLOSSARY } from '../../content/glossary';

/** Conceptos del paso; al pulsar uno se muestra su definición sin salir de la simulación. */
export function GlossaryChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const entry = open ? GLOSSARY[open] : undefined;
  if (ids.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
        <BookA size={14} aria-hidden="true" /> Glosario del paso
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const g = GLOSSARY[id];
          if (!g) return null;
          return (
            <li key={id}>
              <button
                type="button"
                aria-expanded={open === id}
                aria-controls="glossary-def"
                onClick={() => setOpen((cur) => (cur === id ? null : id))}
                className={`cursor-pointer rounded-md border px-2 py-0.5 text-xs transition ${open === id ? 'border-accent bg-accent/15 text-fg' : 'border-line bg-panel-2 text-fg hover:border-accent'}`}
              >
                {g.term}
              </button>
            </li>
          );
        })}
      </ul>
      {entry && open && (
        <div id="glossary-def" role="region" aria-label={`Definición: ${entry.term}`} className="animate-fade-in mt-2 rounded-lg border border-accent/50 bg-accent/5 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-fg">{entry.term}</p>
            <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar definición" className="cursor-pointer text-muted hover:text-fg">
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 leading-relaxed text-fg">{entry.definition}</p>
          {entry.related && entry.related.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1 text-xs text-muted">
              Ver también:
              {entry.related.map((r) =>
                GLOSSARY[r] ? (
                  <button key={r} type="button" onClick={() => setOpen(r)} className="cursor-pointer text-accent hover:underline">
                    {GLOSSARY[r]!.term}
                  </button>
                ) : null,
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
