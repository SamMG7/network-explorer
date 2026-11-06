import type { Device, Interface } from '../types/network';
import type { SimEvent, Track } from '../types/scenario';
import { type ArpEntry, arpSet } from '../../services/network/arp';
import { type MacEntry, learnMac } from '../../services/network/switching';
import { type NatEntry, patTranslate } from '../../services/network/nat';

export interface DhcpBinding {
  ip: string;
  mac: string;
  leaseSeconds: number;
}

export interface DeviceState {
  arp: ArpEntry[];
  mac: MacEntry[];
  nat: NatEntry[];
  dhcpBindings: DhcpBinding[];
  /** Configuración IP efectiva por interfaz (cambia con DHCP). */
  interfaces: Interface[];
  gateway?: string;
  dns?: string;
}

/** Estado completo de la red en un paso. Inmutable. */
export type NetworkSnapshot = Readonly<Record<string, Readonly<DeviceState>>>;

export function initialSnapshot(devices: readonly Device[]): NetworkSnapshot {
  const snap: Record<string, DeviceState> = {};
  for (const d of devices) {
    snap[d.id] = {
      arp: [...(d.initialArp ?? [])],
      mac: [...(d.initialMac ?? [])],
      nat: [],
      dhcpBindings: [...(d.initialDhcpBindings ?? [])],
      interfaces: d.interfaces.map((i) => ({ ...i })),
      gateway: d.gateway,
      dns: d.dns,
    };
  }
  return snap;
}

/** Aplica UN evento y devuelve un snapshot nuevo (función pura). */
export function applyEvent(snapshot: NetworkSnapshot, event: SimEvent, devices: readonly Device[]): NetworkSnapshot {
  const current = snapshot[event.device];
  if (!current) throw new Error(`Evento sobre dispositivo inexistente: ${event.device}`);
  let next: DeviceState;

  switch (event.type) {
    case 'mac-learn':
      next = { ...current, mac: learnMac(current.mac, event) };
      break;
    case 'arp-set':
      next = { ...current, arp: arpSet(current.arp, { ip: event.ip, mac: event.mac }) };
      break;
    case 'nat-translate': {
      const device = devices.find((d) => d.id === event.device);
      if (!device?.pat) throw new Error(`${event.device} no tiene PAT configurado`);
      const { table } = patTranslate(current.nat, event, device.pat);
      next = { ...current, nat: table };
      break;
    }
    case 'ip-assign':
      next = {
        ...current,
        interfaces: current.interfaces.map((i) => (i.name === event.iface ? { ...i, ip: event.ip, prefix: event.prefix } : i)),
        gateway: event.gateway,
        dns: event.dns,
      };
      break;
    case 'dhcp-bind':
      next = {
        ...current,
        dhcpBindings: [...current.dhcpBindings.filter((b) => b.mac !== event.mac), { ip: event.ip, mac: event.mac, leaseSeconds: event.leaseSeconds }],
      };
      break;
  }
  return { ...snapshot, [event.device]: next };
}

/**
 * Snapshots de todos los pasos: `result[i]` es el estado DESPUÉS de los eventos
 * del paso i. Se calculan de una vez y en orden; ir hacia atrás simplemente lee
 * un snapshot anterior, por lo que el estado siempre es reproducible.
 */
export function buildSnapshots(track: Track): { before: NetworkSnapshot[]; after: NetworkSnapshot[] } {
  const before: NetworkSnapshot[] = [];
  const after: NetworkSnapshot[] = [];
  let snap = initialSnapshot(track.devices);
  for (const step of track.steps) {
    before.push(snap);
    for (const event of step.events ?? []) snap = applyEvent(snap, event, track.devices);
    after.push(snap);
  }
  return { before, after };
}

/** Reconstrucción directa (sin caché) del estado en un paso; usada en pruebas. */
export function snapshotAt(track: Track, stepIndex: number): NetworkSnapshot {
  let snap = initialSnapshot(track.devices);
  track.steps.slice(0, stepIndex + 1).forEach((step) => {
    for (const event of step.events ?? []) snap = applyEvent(snap, event, track.devices);
  });
  return snap;
}
