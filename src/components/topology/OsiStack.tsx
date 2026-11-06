import type { OsiLayer } from '../../engine/types/scenario';
import { OSI_LAYERS, TCPIP_LAYERS } from '../../content/osi';

const ORDER: OsiLayer[] = [7, 6, 5, 4, 3, 2, 1];

/** Comparación OSI (7 capas) ↔ TCP/IP (4 capas) con la capa del paso resaltada. */
export function OsiStack({ active }: { active?: OsiLayer }) {
  return (
    <figure className="rounded-xl border border-line bg-panel/95 p-2 shadow-sm backdrop-blur" aria-label="Modelo OSI frente a TCP/IP">
      <figcaption className="mb-1.5 flex justify-between px-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
        <span>OSI</span>
        <span>TCP/IP</span>
      </figcaption>
      <div className="grid grid-cols-[1fr_auto] gap-x-1.5">
        <ol className="space-y-0.5">
          {ORDER.map((layer) => {
            const info = OSI_LAYERS[layer];
            const on = layer === active;
            return (
              <li
                key={layer}
                aria-current={on ? 'step' : undefined}
                className="flex items-center gap-1.5 rounded-md border px-1.5 py-[3px] text-[10.5px] transition-colors"
                style={{
                  borderColor: on ? 'var(--cyan)' : 'var(--line)',
                  background: on ? 'color-mix(in srgb, var(--cyan) 16%, transparent)' : 'transparent',
                  color: on ? 'var(--fg)' : 'var(--muted)',
                }}
              >
                <span className="w-3 font-mono font-semibold">{layer}</span>
                <span className="font-medium">{info.name}</span>
                <span className="ml-auto pl-2 text-[9.5px] whitespace-nowrap opacity-80">{info.pdu.split(' ')[0]}</span>
              </li>
            );
          })}
        </ol>
        <ol className="flex flex-col gap-0.5">
          {TCPIP_LAYERS.map((t) => {
            const on = active !== undefined && t.osi.includes(active);
            return (
              <li
                key={t.name}
                className="flex items-center justify-center rounded-md border px-1.5 text-center text-[10px] leading-tight"
                style={{
                  flexGrow: t.osi.length,
                  borderColor: on ? 'var(--orange)' : 'var(--line)',
                  background: on ? 'color-mix(in srgb, var(--orange) 14%, transparent)' : 'transparent',
                  color: on ? 'var(--fg)' : 'var(--muted)',
                  minWidth: 74,
                }}
              >
                {t.name}
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
