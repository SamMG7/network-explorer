import type { Packet } from '../../engine/types/packet';
import { HEADER_NAME, PDU_COLOR } from '../shared/visuals';

/** Representación de la PDU como bloques encapsulados (externo → interno). */
export function PduStrip({ packet, compact = false }: { packet: Packet; compact?: boolean }) {
  const eth = packet.headers[0]?.type === 'ethernet' ? packet.headers[0] : undefined;
  return (
    <div className="flex items-stretch overflow-x-auto rounded-lg border border-line text-[10.5px] font-semibold" role="img" aria-label={`Estructura: ${packet.headers.map((h) => HEADER_NAME[h.type]).join(' › ')}${eth?.showFcs ? ' › FCS' : ''}`}>
      {packet.headers.map((h, i) => {
        const tag = h.type === 'ethernet' && h.vlanTag;
        return (
          <div
            key={i}
            className={`flex shrink-0 items-center gap-1 border-r border-app/40 px-2 ${compact ? 'py-1' : 'py-2'}`}
            style={{
              background: `color-mix(in srgb, ${PDU_COLOR[h.type]} 24%, var(--panel))`,
              color: 'var(--fg)',
              flexGrow: i === packet.headers.length - 1 ? 1 : 0,
            }}
          >
            {HEADER_NAME[h.type]}
            {tag && (
              <span className="rounded bg-app/60 px-1 font-mono text-[9.5px]" title="Etiqueta 802.1Q">
                802.1Q · VLAN {h.vlanTag!.vid}
              </span>
            )}
          </div>
        );
      })}
      {eth?.showFcs && (
        <div className={`flex shrink-0 items-center px-2 ${compact ? 'py-1' : 'py-2'}`} style={{ background: `color-mix(in srgb, ${PDU_COLOR.ethernet} 24%, var(--panel))` }}>
          FCS
        </div>
      )}
    </div>
  );
}
