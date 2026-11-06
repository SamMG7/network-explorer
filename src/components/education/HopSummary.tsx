import type { Track } from '../../engine/types/scenario';
import { findHeader } from '../../engine/types/packet';
import { DataTable } from '../inspector/Tables';

/** Tabla por salto: qué cambia (MAC, TTL) y qué se mantiene (IP) durante el enrutamiento. */
export function HopSummary({ track, upToStep }: { track: Track; upToStep: number }) {
  const name = (id: string) => track.devices.find((d) => d.id === id)?.hostname ?? id;
  const rows = track.steps.slice(0, upToStep + 1).flatMap((step) =>
    (step.transits ?? []).map((t) => {
      const link = track.links.find((l) => l.id === t.link)!;
      const [from, to] = t.reverse ? [link.b, link.a] : [link.a, link.b];
      const e = findHeader(t.packet, 'ethernet');
      const i = findHeader(t.packet, 'ipv4');
      return [`${name(from.device)} → ${name(to.device)}`, e?.src ?? '—', e?.dst ?? '—', i?.src ?? '—', i?.dst ?? '—', i ? String(i.ttl) : '—'];
    }),
  );
  return (
    <DataTable title="Resumen por salto" columns={['Salto', 'MAC origen', 'MAC destino', 'IP origen', 'IP destino', 'TTL']} rows={rows} empty="Aún no hay saltos" />
  );
}
