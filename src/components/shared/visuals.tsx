import { Cloud, Monitor, Server } from 'lucide-react';
import type { DeviceType } from '../../engine/types/network';
import type { HeaderType } from '../../engine/types/packet';
import type { Tone } from '../../engine/types/scenario';

export const TONE_COLOR: Record<Tone, string> = {
  info: 'var(--cyan)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  deny: 'var(--deny)',
};

export const TONE_LABEL: Record<Tone, string> = {
  info: 'En curso',
  ok: 'Correcto',
  warn: 'Atención',
  deny: 'Descartado / sin comunicación',
};

/** Color consistente por protocolo en todo el sistema (canvas, inspector, leyenda). */
export const PDU_COLOR: Record<HeaderType | 'ipv4' | 'ethernet', string> = {
  ethernet: 'var(--pdu-ethernet)',
  arp: 'var(--pdu-arp)',
  ipv4: 'var(--pdu-ipv4)',
  icmp: 'var(--pdu-icmp)',
  tcp: 'var(--pdu-tcp)',
  udp: 'var(--pdu-udp)',
  dhcp: 'var(--pdu-dhcp)',
  data: 'var(--pdu-data)',
};

export const HEADER_NAME: Record<HeaderType, string> = {
  ethernet: 'Ethernet',
  arp: 'ARP',
  ipv4: 'IPv4',
  icmp: 'ICMP',
  tcp: 'TCP',
  udp: 'UDP',
  dhcp: 'DHCP',
  data: 'Datos',
};

export const DEVICE_LABEL: Record<DeviceType, string> = {
  pc: 'PC',
  server: 'Servidor',
  switch: 'Switch',
  router: 'Router',
  cloud: 'Internet',
};

/** Iconos genéricos de dispositivos (símbolos propios, no marcas). */
export function DeviceIcon({ type, size = 26 }: { type: DeviceType; size?: number }) {
  switch (type) {
    case 'pc':
      return <Monitor size={size} strokeWidth={1.8} aria-hidden="true" />;
    case 'server':
      return <Server size={size} strokeWidth={1.8} aria-hidden="true" />;
    case 'cloud':
      return <Cloud size={size} strokeWidth={1.8} aria-hidden="true" />;
    case 'router':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="16" cy="12" rx="12" ry="5" />
          <path d="M4 12v8c0 2.8 5.4 5 12 5s12-2.2 12-5v-8" />
          <path d="M10 12h-3m3 0-1.5-1.5M10 12l-1.5 1.5M22 12h3m-3 0 1.5-1.5M22 12l1.5 1.5M16 9.5V8m0 0-1.2 1.2M16 8l1.2 1.2M16 14.5V16m0 0-1.2-1.2M16 16l1.2-1.2" />
        </svg>
      );
    case 'switch':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="8" width="26" height="16" rx="3" />
          <path d="M9 13h12m0 0-2.5-2.5M21 13l-2.5 2.5M23 19H11m0 0 2.5-2.5M11 19l2.5 2.5" />
        </svg>
      );
  }
}
