import type { ReactNode } from 'react';

/** Tabla compacta reutilizable para ARP, MAC, rutas, NAT y DHCP. */
export function DataTable({
  title,
  command,
  columns,
  rows,
  empty,
  highlight,
}: {
  title: string;
  command?: string;
  columns: string[];
  rows: ReactNode[][];
  empty: string;
  /** Índices de fila a resaltar. */
  highlight?: Set<number>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-line bg-panel-2 px-3 py-1.5">
        <h3 className="text-xs font-semibold text-fg">{title}</h3>
        {command && <code className="font-mono text-[10px] text-muted">{command}</code>}
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted italic">{empty}</p>
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="text-muted">
                {columns.map((c) => (
                  <th key={c} scope="col" className="px-3 py-1 font-sans font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-line text-fg transition-colors"
                  style={highlight?.has(i) ? { background: 'color-mix(in srgb, var(--ok) 16%, transparent)' } : undefined}
                >
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-1 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
