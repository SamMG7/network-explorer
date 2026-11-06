import type { DeviceState } from './snapshot';

/** Claves de filas que cambiaron en un dispositivo entre dos estados (para resaltarlas). */
export function changedRows(before: DeviceState | undefined, after: DeviceState | undefined) {
  const arp = new Set<string>();
  const mac = new Set<string>();
  const nat = new Set<string>();
  if (!after) return { arp, mac, nat };
  const prevArp = new Map((before?.arp ?? []).map((e) => [e.ip, e.mac]));
  for (const e of after.arp) if (prevArp.get(e.ip) !== e.mac) arp.add(e.ip);
  const prevMac = new Map((before?.mac ?? []).map((e) => [`${e.vlan}|${e.mac}`, e.port]));
  for (const e of after.mac) if (prevMac.get(`${e.vlan}|${e.mac}`) !== e.port) mac.add(`${e.vlan}|${e.mac}`);
  const prevNat = new Set((before?.nat ?? []).map((e) => e.insideGlobal));
  for (const e of after.nat) if (!prevNat.has(e.insideGlobal)) nat.add(e.insideGlobal);
  return { arp, mac, nat };
}
