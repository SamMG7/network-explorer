import type {
  AppData,
  ArpMessage,
  DhcpMessage,
  EthernetHeader,
  Header,
  IcmpMessage,
  IPv4Header,
  Packet,
  TcpHeader,
  UdpHeader,
} from '../engine/types/packet';
import { BROADCAST_MAC } from '../services/network/switching';

/** Constructores breves de encabezados para escribir escenarios legibles. */
export const eth = (dst: string, src: string, etherType: EthernetHeader['etherType'], extra: Partial<EthernetHeader> = {}): EthernetHeader => ({
  type: 'ethernet',
  dst,
  src,
  etherType,
  ...extra,
});

export const ip = (src: string, dst: string, ttl: number, protocol: IPv4Header['protocol']): IPv4Header => ({ type: 'ipv4', src, dst, ttl, protocol });
export const tcp = (srcPort: number, dstPort: number, flags: TcpHeader['flags']): TcpHeader => ({ type: 'tcp', srcPort, dstPort, flags });
export const udp = (srcPort: number, dstPort: number): UdpHeader => ({ type: 'udp', srcPort, dstPort });
export const echoRequest: IcmpMessage = { type: 'icmp', icmpType: 8, code: 0 };
export const echoReply: IcmpMessage = { type: 'icmp', icmpType: 0, code: 0 };
export const data = (protocol: string, summary: string): AppData => ({ type: 'data', protocol, summary });

export const ZERO_MAC = '0000.0000.0000';
export { BROADCAST_MAC };

export const arpRequest = (senderMac: string, senderIp: string, targetIp: string): ArpMessage => ({
  type: 'arp',
  operation: 1,
  senderMac,
  senderIp,
  targetMac: ZERO_MAC,
  targetIp,
});

export const arpReply = (senderMac: string, senderIp: string, targetMac: string, targetIp: string): ArpMessage => ({
  type: 'arp',
  operation: 2,
  senderMac,
  senderIp,
  targetMac,
  targetIp,
});

export const dhcp = (msg: Omit<DhcpMessage, 'type'>): DhcpMessage => ({ type: 'dhcp', ...msg });

export const packet = (id: string, label: string, ...headers: Header[]): Packet => ({ id, label, headers });

/** Misma PDU con otra trama (p. ej. con o sin etiqueta 802.1Q). */
export function withEthernet(p: Packet, id: string, ethernet: EthernetHeader): Packet {
  return { ...p, id, headers: [ethernet, ...p.headers.filter((h) => h.type !== 'ethernet')] };
}
