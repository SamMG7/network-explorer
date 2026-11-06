import type { OsiLayer } from '../engine/types/scenario';

export interface OsiLayerInfo {
  layer: OsiLayer;
  name: string;
  pdu: string;
  tcpip: string;
  examples: string;
}

export const OSI_LAYERS: Record<OsiLayer, OsiLayerInfo> = {
  7: { layer: 7, name: 'Aplicación', pdu: 'Datos', tcpip: 'Aplicación', examples: 'HTTP, DNS, DHCP' },
  6: { layer: 6, name: 'Presentación', pdu: 'Datos', tcpip: 'Aplicación', examples: 'Cifrado TLS, codificación' },
  5: { layer: 5, name: 'Sesión', pdu: 'Datos', tcpip: 'Aplicación', examples: 'Control de sesiones' },
  4: { layer: 4, name: 'Transporte', pdu: 'Segmento (TCP) / datagrama (UDP)', tcpip: 'Transporte', examples: 'TCP, UDP' },
  3: { layer: 3, name: 'Red', pdu: 'Paquete', tcpip: 'Internet', examples: 'IPv4, ICMP' },
  2: { layer: 2, name: 'Enlace de datos', pdu: 'Trama', tcpip: 'Acceso a la red', examples: 'Ethernet, 802.1Q, ARP*' },
  1: { layer: 1, name: 'Física', pdu: 'Bits', tcpip: 'Acceso a la red', examples: 'Cobre, fibra, radio' },
};

/** Las 4 capas del modelo TCP/IP y las capas OSI que agrupan. */
export const TCPIP_LAYERS: Array<{ name: string; osi: OsiLayer[] }> = [
  { name: 'Aplicación', osi: [7, 6, 5] },
  { name: 'Transporte', osi: [4] },
  { name: 'Internet', osi: [3] },
  { name: 'Acceso a la red', osi: [2, 1] },
];

export function layerLabel(layer: OsiLayer): string {
  return `Capa ${layer} · ${OSI_LAYERS[layer].name}`;
}
