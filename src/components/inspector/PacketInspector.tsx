import type { Packet } from '../../engine/types/packet';
import type { TopologyStep, Track } from '../../engine/types/scenario';
import { HEADER_NAME, PDU_COLOR } from '../shared/visuals';
import { PduStrip } from './PduStrip';
import { headerFields } from './packetFields';

export interface StepPacket {
  packet: Packet;
  where: string;
}

/** PDUs del paso: en tránsito por enlaces o detenidas en un dispositivo. */
export function stepPackets(track: Track, step: TopologyStep | undefined): StepPacket[] {
  if (!step) return [];
  const name = (id: string) => track.devices.find((d) => d.id === id)?.hostname ?? id;
  const list: StepPacket[] = (step.transits ?? []).map((t) => {
    const link = track.links.find((l) => l.id === t.link);
    const [from, to] = link ? (t.reverse ? [link.b, link.a] : [link.a, link.b]) : [undefined, undefined];
    return { packet: t.packet, where: from && to ? `${name(from.device)} ${from.iface} → ${name(to.device)} ${to.iface}` : t.link };
  });
  if (step.packetAt) list.push({ packet: step.packetAt.packet, where: `En ${name(step.packetAt.device)}` });
  return list;
}

interface PacketInspectorProps {
  packets: StepPacket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PacketInspector({ packets, selectedId, onSelect }: PacketInspectorProps) {
  if (packets.length === 0) {
    return <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">En este paso no hay ninguna PDU en tránsito. Avanza a un paso con tramas o paquetes.</p>;
  }
  const current = packets.find((p) => p.packet.id === selectedId) ?? packets[0]!;

  return (
    <section aria-labelledby="pkt-title" className="space-y-4">
      {packets.length > 1 && (
        <div role="tablist" aria-label="PDU del paso" className="flex flex-wrap gap-1.5">
          {packets.map((p) => (
            <button
              key={p.packet.id}
              type="button"
              role="tab"
              aria-selected={p.packet.id === current.packet.id}
              onClick={() => onSelect(p.packet.id)}
              className={`cursor-pointer rounded-md border px-2 py-1 text-left text-[11px] transition ${p.packet.id === current.packet.id ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'}`}
            >
              {p.where}
            </button>
          ))}
        </div>
      )}
      <header>
        <h2 id="pkt-title" className="text-base font-semibold text-fg">
          {current.packet.label}
        </h2>
        <p className="text-xs text-muted">{current.where}</p>
      </header>
      <PduStrip packet={current.packet} />
      <p className="text-[11px] text-muted">Representación educativa: solo se muestran los campos relevantes de cada encabezado; no es una captura real.</p>

      {current.packet.headers.map((h, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-line">
          <h3 className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${PDU_COLOR[h.type]} 16%, transparent)` }}>
            <span className="inline-block size-2.5 rounded-sm" style={{ background: PDU_COLOR[h.type] }} aria-hidden="true" />
            {HEADER_NAME[h.type]}
          </h3>
          <dl className="divide-y divide-line text-xs">
            {headerFields(h).map((f) => (
              <div key={f.name} className="grid grid-cols-[minmax(0,42%)_1fr] gap-2 px-3 py-1.5">
                <dt className="text-muted">{f.name}</dt>
                <dd className="min-w-0 font-mono break-words text-fg">
                  {f.value}
                  {f.hint && <span className="block font-sans text-[10.5px] text-muted">{f.hint}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
