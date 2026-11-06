/**
 * Representación educativa de una PDU. Cada encabezado contiene solo campos
 * que existen en el protocolo correspondiente (subconjunto relevante para CCNA).
 * Los encabezados se ordenan del más externo al más interno.
 */

export interface EthernetHeader {
  type: 'ethernet';
  dst: string;
  src: string;
  /** EtherType del contenido: 0x0800 IPv4, 0x0806 ARP. */
  etherType: '0x0800' | '0x0806';
  /** Etiqueta 802.1Q (TPID 0x8100) cuando la trama viaja etiquetada por un trunk. */
  vlanTag?: { vid: number; pcp: number };
  /** Muestra el tráiler FCS (secuencia de verificación de trama). */
  showFcs?: boolean;
}

export interface ArpMessage {
  type: 'arp';
  /** 1 = request, 2 = reply */
  operation: 1 | 2;
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}

export interface IPv4Header {
  type: 'ipv4';
  src: string;
  dst: string;
  ttl: number;
  /** Número de protocolo: 1 ICMP, 6 TCP, 17 UDP. */
  protocol: 1 | 6 | 17;
}

export interface TcpHeader {
  type: 'tcp';
  srcPort: number;
  dstPort: number;
  flags: Array<'SYN' | 'ACK' | 'PSH' | 'FIN' | 'RST'>;
}

export interface UdpHeader {
  type: 'udp';
  srcPort: number;
  dstPort: number;
}

export interface IcmpMessage {
  type: 'icmp';
  /** 8 = Echo Request, 0 = Echo Reply */
  icmpType: 0 | 8;
  code: 0;
}

export type DhcpMessageType = 'DHCPDISCOVER' | 'DHCPOFFER' | 'DHCPREQUEST' | 'DHCPACK';

export interface DhcpMessage {
  type: 'dhcp';
  /** 1 = BOOTREQUEST (cliente), 2 = BOOTREPLY (servidor) */
  op: 1 | 2;
  messageType: DhcpMessageType;
  xid: string;
  /** Bit de broadcast en el campo flags. */
  broadcastFlag: boolean;
  ciaddr: string;
  yiaddr: string;
  chaddr: string;
  options: Array<{ code: number; name: string; value: string }>;
}

export interface AppData {
  type: 'data';
  protocol: string;
  summary: string;
}

export type Header = EthernetHeader | ArpMessage | IPv4Header | TcpHeader | UdpHeader | IcmpMessage | DhcpMessage | AppData;
export type HeaderType = Header['type'];

export interface Packet {
  id: string;
  /** Etiqueta breve para el canvas: "ARP Request", "ICMP Echo"… */
  label: string;
  headers: Header[];
}

/** Protocolo "principal" que define el color de la PDU en el canvas. */
export function packetKind(packet: Packet): 'arp' | 'dhcp' | 'tcp' | 'udp' | 'icmp' | 'ipv4' | 'ethernet' | 'data' {
  const types = packet.headers.map((h) => h.type);
  if (types.includes('arp')) return 'arp';
  if (types.includes('dhcp')) return 'dhcp';
  if (types.includes('icmp')) return 'icmp';
  if (types.includes('tcp')) return 'tcp';
  if (types.includes('udp')) return 'udp';
  if (types.includes('ipv4')) return 'ipv4';
  if (types.includes('ethernet')) return 'ethernet';
  return 'data';
}

export function findHeader<T extends HeaderType>(packet: Packet, type: T): Extract<Header, { type: T }> | undefined {
  return packet.headers.find((h): h is Extract<Header, { type: T }> => h.type === type);
}
