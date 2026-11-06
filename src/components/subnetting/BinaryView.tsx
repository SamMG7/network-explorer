import { toBits } from '../../services/network/ipv4';
import type { SubnetFocus } from '../../scenarios/subnetting/subnetSteps';

interface Row {
  id: string;
  label: string;
  value: number;
  dotted: string;
  focus: SubnetFocus[];
}

/** Bits de cada valor; los de red y los de host se distinguen por color. */
export function BinaryView({ rows, prefix, focus }: { rows: Row[]; prefix: number; focus: SubnetFocus }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="font-mono text-[11px]" aria-label="Representación binaria">
        <thead>
          <tr>
            <th scope="col" className="pr-3 text-left font-sans text-[10px] font-medium text-muted">Valor</th>
            <th scope="col" className="text-left font-sans text-[10px] font-medium text-muted">
              <span style={{ color: 'var(--accent)' }}>■ red ({prefix})</span> · <span style={{ color: 'var(--orange)' }}>■ host ({32 - prefix})</span>
            </th>
            <th scope="col" className="pl-3 text-left font-sans text-[10px] font-medium text-muted">Decimal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const on = row.focus.includes(focus);
            const bits = toBits(row.value);
            return (
              <tr key={row.id} className="transition-opacity" style={{ opacity: on || focus === 'entrada' ? 1 : 0.45 }} aria-current={on ? 'true' : undefined}>
                <th scope="row" className="py-1 pr-3 text-left font-sans text-xs font-medium whitespace-nowrap text-fg">
                  {row.label}
                </th>
                <td className="py-1">
                  <span className="flex gap-[2px]">
                    {bits.split('').map((b, i) => (
                      <span key={i} className={`flex ${i > 0 && i % 8 === 0 ? 'ml-1.5' : ''}`}>
                        <span
                          className="inline-flex h-5 w-[14px] items-center justify-center rounded-[3px] text-[10.5px]"
                          style={{
                            background: `color-mix(in srgb, ${i < prefix ? 'var(--accent)' : 'var(--orange)'} ${on ? 30 : 14}%, transparent)`,
                            color: 'var(--fg)',
                            outline: on && i === prefix ? '1px solid var(--cyan)' : undefined,
                          }}
                        >
                          {b}
                        </span>
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-1 pl-3 whitespace-nowrap text-fg">{row.dotted}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
