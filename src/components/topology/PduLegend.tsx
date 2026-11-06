import { PDU_COLOR } from '../shared/visuals';

const ITEMS: Array<{ key: keyof typeof PDU_COLOR; label: string }> = [
  { key: 'arp', label: 'ARP' },
  { key: 'dhcp', label: 'DHCP' },
  { key: 'icmp', label: 'ICMP' },
  { key: 'tcp', label: 'TCP' },
  { key: 'udp', label: 'UDP' },
  { key: 'ipv4', label: 'IPv4' },
  { key: 'data', label: 'Datos' },
];

/** Leyenda de colores de PDU (consistente en canvas e inspector). */
export function PduLegend() {
  return (
    <ul className="flex flex-wrap gap-x-2.5 gap-y-1 rounded-lg border border-line bg-panel/90 px-2 py-1 text-[10px] text-muted backdrop-blur" aria-label="Leyenda de colores por protocolo">
      {ITEMS.map((i) => (
        <li key={i.key} className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: PDU_COLOR[i.key] }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
