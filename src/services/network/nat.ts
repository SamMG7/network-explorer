/**
 * NAT/PAT (NAT overload) educativo, con la terminología de Cisco:
 *  inside local  = IP:puerto privado del cliente
 *  inside global = IP:puerto público asignado por el router
 *  outside local / outside global = destino externo (iguales sin NAT de destino)
 */

export type NatProtocol = 'tcp' | 'udp';

export interface NatEntry {
  protocol: NatProtocol;
  insideLocal: string;
  insideGlobal: string;
  outsideLocal: string;
  outsideGlobal: string;
}

export interface PatConfig {
  publicIp: string;
  /** Primer puerto a usar si el original ya está ocupado. */
  portStart: number;
  portEnd: number;
}

export interface Flow {
  protocol: NatProtocol;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
}

const sock = (ip: string, port: number) => `${ip}:${port}`;

export function splitSocket(socket: string): { ip: string; port: number } {
  const idx = socket.lastIndexOf(':');
  return { ip: socket.slice(0, idx), port: Number(socket.slice(idx + 1)) };
}

export interface PatResult {
  table: NatEntry[];
  entry: NatEntry;
  reused: boolean;
  portPreserved: boolean;
}

/**
 * Traducción de salida (inside → outside) con PAT.
 * 1. Si ya existe una traducción para el mismo socket interno y destino, se reutiliza.
 * 2. Si no, se intenta conservar el puerto de origen.
 * 3. Si ese puerto global ya está en uso con el mismo protocolo, se busca el siguiente libre.
 */
export function patTranslate(table: readonly NatEntry[], flow: Flow, config: PatConfig): PatResult {
  const insideLocal = sock(flow.srcIp, flow.srcPort);
  const outside = sock(flow.dstIp, flow.dstPort);
  const existing = table.find((e) => e.protocol === flow.protocol && e.insideLocal === insideLocal && e.outsideGlobal === outside);
  if (existing) return { table: [...table], entry: existing, reused: true, portPreserved: splitSocket(existing.insideGlobal).port === flow.srcPort };

  const used = new Set(
    table.filter((e) => e.protocol === flow.protocol && splitSocket(e.insideGlobal).ip === config.publicIp).map((e) => splitSocket(e.insideGlobal).port),
  );

  let port = flow.srcPort;
  let portPreserved = true;
  if (used.has(port)) {
    portPreserved = false;
    port = config.portStart;
    while (used.has(port)) {
      port++;
      if (port > config.portEnd) throw new Error('No quedan puertos disponibles para PAT');
    }
  }

  const entry: NatEntry = {
    protocol: flow.protocol,
    insideLocal,
    insideGlobal: sock(config.publicIp, port),
    outsideLocal: outside,
    outsideGlobal: outside,
  };
  return { table: [...table, entry], entry, reused: false, portPreserved };
}

/**
 * Traducción de entrada (outside → inside): busca la traducción por el socket
 * global de destino y el origen externo. Sin coincidencia, el router descarta el paquete.
 */
export function patReverse(table: readonly NatEntry[], packet: Flow): NatEntry | null {
  const insideGlobal = sock(packet.dstIp, packet.dstPort);
  const outside = sock(packet.srcIp, packet.srcPort);
  return table.find((e) => e.protocol === packet.protocol && e.insideGlobal === insideGlobal && e.outsideGlobal === outside) ?? null;
}
