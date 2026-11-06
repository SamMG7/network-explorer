/** Lógica de un switch Ethernet con VLAN (aprendizaje y reenvío). */

export const BROADCAST_MAC = 'ffff.ffff.ffff';

export interface MacEntry {
  vlan: number;
  mac: string;
  port: string;
  type: 'DYNAMIC' | 'STATIC';
}

export interface SwitchPort {
  name: string;
  mode: 'access' | 'trunk';
  /** VLAN de acceso (puertos access). */
  vlan?: number;
  /** VLAN permitidas (puertos trunk). */
  allowed?: number[];
  /** VLAN nativa del trunk (viaja sin etiqueta). */
  native?: number;
}

export function isBroadcast(mac: string): boolean {
  return mac.toLowerCase() === BROADCAST_MAC;
}

/**
 * Aprende la MAC de ORIGEN en el puerto de recepción y su VLAN.
 * Si la MAC ya existía en otro puerto de la misma VLAN, se actualiza (movimiento).
 * Devuelve una tabla nueva (no muta la recibida).
 */
export function learnMac(table: readonly MacEntry[], entry: { vlan: number; mac: string; port: string }): MacEntry[] {
  if (isBroadcast(entry.mac)) return [...table]; // una MAC de broadcast nunca es origen válido
  const rest = table.filter((e) => !(e.vlan === entry.vlan && e.mac === entry.mac && e.type === 'DYNAMIC'));
  const staticHit = table.find((e) => e.vlan === entry.vlan && e.mac === entry.mac && e.type === 'STATIC');
  if (staticHit) return [...table];
  const learned: MacEntry = { vlan: entry.vlan, mac: entry.mac, port: entry.port, type: 'DYNAMIC' };
  return [...rest, learned].sort(sortMac);
}

function sortMac(a: MacEntry, b: MacEntry): number {
  return a.vlan - b.vlan || a.mac.localeCompare(b.mac);
}

/** ¿El puerto transporta la VLAN indicada? */
export function portCarriesVlan(port: SwitchPort, vlan: number): boolean {
  if (port.mode === 'access') return port.vlan === vlan;
  return (port.allowed ?? []).includes(vlan);
}

export type ForwardDecision =
  | { action: 'flood'; ports: string[]; reason: string }
  | { action: 'forward'; port: string; reason: string }
  | { action: 'filter'; reason: string };

/**
 * Decisión de reenvío para una trama ya asociada a una VLAN.
 * - Broadcast o MAC desconocida → inundación a los puertos de la VLAN, menos el de entrada.
 * - MAC conocida en otro puerto → reenvío solo por ese puerto.
 * - MAC conocida en el mismo puerto de entrada → se filtra (descarta).
 */
export function switchDecision(
  table: readonly MacEntry[],
  ports: readonly SwitchPort[],
  frame: { vlan: number; dstMac: string; inPort: string },
): ForwardDecision {
  const floodPorts = ports
    .filter((p) => p.name !== frame.inPort && portCarriesVlan(p, frame.vlan))
    .map((p) => p.name);

  if (isBroadcast(frame.dstMac)) {
    return { action: 'flood', ports: floodPorts, reason: `MAC de destino de broadcast: se inunda a todos los puertos de la VLAN ${frame.vlan} excepto el de entrada.` };
  }
  const hit = table.find((e) => e.vlan === frame.vlan && e.mac === frame.dstMac);
  if (!hit) {
    return { action: 'flood', ports: floodPorts, reason: `La MAC ${frame.dstMac} no está en la tabla de la VLAN ${frame.vlan} (unicast desconocido): se inunda.` };
  }
  if (hit.port === frame.inPort) {
    return { action: 'filter', reason: `La MAC de destino está en el mismo puerto de entrada (${hit.port}): la trama se descarta.` };
  }
  return { action: 'forward', port: hit.port, reason: `La MAC ${frame.dstMac} está asociada al puerto ${hit.port} en la VLAN ${frame.vlan}: se reenvía solo por ese puerto.` };
}

/** VLAN que el switch asigna a una trama recibida en un puerto. */
export function ingressVlan(port: SwitchPort, tag: number | undefined): number | null {
  if (port.mode === 'access') return tag === undefined ? (port.vlan ?? 1) : null; // trama etiquetada en access: se descarta
  if (tag === undefined) return port.native ?? 1;
  return (port.allowed ?? []).includes(tag) ? tag : null;
}
