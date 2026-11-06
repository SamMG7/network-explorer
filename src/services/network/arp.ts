import { parseIPv4, sameSubnet } from './ipv4';

export interface ArpEntry {
  ip: string;
  mac: string;
}

export function arpLookup(cache: readonly ArpEntry[], ip: string): ArpEntry | undefined {
  return cache.find((e) => e.ip === ip);
}

/** Agrega o actualiza una entrada. Devuelve una caché nueva. */
export function arpSet(cache: readonly ArpEntry[], entry: ArpEntry): ArpEntry[] {
  return [...cache.filter((e) => e.ip !== entry.ip), entry].sort((a, b) => (parseIPv4(a.ip) ?? 0) - (parseIPv4(b.ip) ?? 0));
}

export interface HostIpConfig {
  ip: string;
  prefix: number;
  gateway?: string;
}

export type NextHopDecision =
  | { local: true; target: string; reason: string }
  | { local: false; target: string; reason: string }
  | { local: false; target: null; reason: string };

/**
 * Decisión de un host: ¿el destino está en mi subred?
 * Compara (IP propia AND máscara) con (IP destino AND máscara).
 * Si es local, resuelve por ARP la IP de destino; si es remoto, la del gateway.
 */
export function hostNextHop(config: HostIpConfig, destination: string): NextHopDecision {
  const own = parseIPv4(config.ip);
  const dst = parseIPv4(destination);
  if (own === null || dst === null) throw new Error('IP inválida');
  if (sameSubnet(own, dst, config.prefix)) {
    return { local: true, target: destination, reason: `${destination} está en la misma subred /${config.prefix}: se entrega directamente (ARP por la IP de destino).` };
  }
  if (!config.gateway) {
    return { local: false, target: null, reason: `${destination} está en otra subred y no hay gateway configurado: el host no puede enviar el paquete.` };
  }
  return { local: false, target: config.gateway, reason: `${destination} está en otra subred: el paquete se envía al gateway ${config.gateway} (ARP por la IP del gateway).` };
}
