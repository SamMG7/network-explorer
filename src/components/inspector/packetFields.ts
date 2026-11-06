import type { Header } from '../../engine/types/packet';

export interface Field {
  name: string;
  value: string;
  hint?: string;
}

const PROTO_NAME: Record<number, string> = { 1: 'ICMP', 6: 'TCP', 17: 'UDP' };

/** Campos visibles de cada encabezado (solo campos reales del protocolo). */
export function headerFields(h: Header): Field[] {
  switch (h.type) {
    case 'ethernet': {
      const fields: Field[] = [
        { name: 'MAC destino', value: h.dst, hint: h.dst === 'ffff.ffff.ffff' ? 'Broadcast' : undefined },
        { name: 'MAC origen', value: h.src },
      ];
      if (h.vlanTag) {
        fields.push({ name: 'TPID (802.1Q)', value: '0x8100', hint: 'Indica que sigue una etiqueta VLAN' });
        fields.push({ name: 'PCP (prioridad)', value: String(h.vlanTag.pcp) });
        fields.push({ name: 'VLAN ID', value: String(h.vlanTag.vid) });
      }
      fields.push({ name: 'EtherType', value: h.etherType, hint: h.etherType === '0x0800' ? 'IPv4' : 'ARP' });
      if (h.showFcs) fields.push({ name: 'FCS (tráiler)', value: 'CRC-32', hint: 'Se verifica al recibir' });
      return fields;
    }
    case 'arp':
      return [
        { name: 'Operación', value: h.operation === 1 ? '1 (request)' : '2 (reply)' },
        { name: 'MAC del emisor', value: h.senderMac },
        { name: 'IP del emisor', value: h.senderIp },
        { name: 'MAC objetivo', value: h.targetMac, hint: h.operation === 1 ? 'Desconocida: es lo que se pregunta' : undefined },
        { name: 'IP objetivo', value: h.targetIp },
      ];
    case 'ipv4':
      return [
        { name: 'IP origen', value: h.src },
        { name: 'IP destino', value: h.dst },
        { name: 'TTL', value: String(h.ttl) },
        { name: 'Protocol', value: `${h.protocol} (${PROTO_NAME[h.protocol]})` },
      ];
    case 'tcp':
      return [
        { name: 'Puerto origen', value: String(h.srcPort) },
        { name: 'Puerto destino', value: String(h.dstPort) },
        { name: 'Flags', value: h.flags.join(', ') },
      ];
    case 'udp':
      return [
        { name: 'Puerto origen', value: String(h.srcPort) },
        { name: 'Puerto destino', value: String(h.dstPort) },
      ];
    case 'icmp':
      return [
        { name: 'Tipo', value: h.icmpType === 8 ? '8 (Echo Request)' : '0 (Echo Reply)' },
        { name: 'Código', value: String(h.code) },
      ];
    case 'dhcp':
      return [
        { name: 'op', value: h.op === 1 ? '1 (BOOTREQUEST)' : '2 (BOOTREPLY)' },
        { name: 'xid', value: h.xid, hint: 'Identifica la transacción' },
        { name: 'flags', value: h.broadcastFlag ? 'Broadcast (bit B = 1)' : 'Unicast' },
        { name: 'ciaddr', value: h.ciaddr, hint: 'IP actual del cliente' },
        { name: 'yiaddr', value: h.yiaddr, hint: '“Tu” IP: la que ofrece el servidor' },
        { name: 'chaddr', value: h.chaddr, hint: 'MAC del cliente' },
        ...h.options.map((o) => ({ name: `Opción ${o.code} · ${o.name}`, value: o.value })),
      ];
    case 'data':
      return [
        { name: 'Protocolo', value: h.protocol },
        { name: 'Contenido', value: h.summary },
      ];
  }
}
