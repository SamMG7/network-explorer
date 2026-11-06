import type { Device, Interface, Link } from '../../engine/types/network';
import type { TopologyStep, Track } from '../../engine/types/scenario';
import type { NetworkSnapshot } from '../../engine/simulation/snapshot';
import type { DeviceFlowNode, LinkFlowEdge } from './flowTypes';

export interface TopologyOptions {
  selectedDeviceId: string | null;
  vlan: number | null;
  vlanColors: Record<number, string>;
  animate: boolean;
  speed: number;
  onSelectDevice: (id: string) => void;
  onSelectPacket: (id: string) => void;
}

function ifaceVlans(iface: Interface | undefined): number[] {
  if (!iface) return [];
  if (iface.mode === 'access') return iface.vlan !== undefined ? [iface.vlan] : [];
  if (iface.mode === 'trunk') return iface.allowed ?? [];
  return [];
}

/** VLAN que transporta un enlace (según el puerto de switch en cualquiera de sus extremos). */
export function linkVlans(link: Link, devices: readonly Device[]): number[] {
  const set = new Set<number>();
  for (const end of [link.a, link.b]) {
    const d = devices.find((x) => x.id === end.device);
    if (d?.type === 'switch') for (const v of ifaceVlans(d.interfaces.find((i) => i.name === end.iface))) set.add(v);
  }
  return [...set];
}

/** VLAN a las que pertenece un dispositivo (hosts: por el puerto del switch al que se conectan). */
export function deviceVlans(device: Device, track: Track): number[] {
  const set = new Set<number>();
  for (const link of track.links) {
    if (link.a.device === device.id || link.b.device === device.id) for (const v of linkVlans(link, track.devices)) set.add(v);
  }
  return [...set];
}

function ifaceLabel(device: Device | undefined, ifaceName: string, snapshot: NetworkSnapshot): string {
  if (!device || device.type === 'pc' || device.type === 'server' || device.type === 'cloud') return '';
  const iface = snapshot[device.id]?.interfaces.find((i) => i.name === ifaceName);
  if (device.type === 'router' && iface?.ip) return `${ifaceName} .${iface.ip.split('.').pop()}`;
  if (iface?.mode === 'access') return `${ifaceName} · V${iface.vlan}`;
  return ifaceName;
}

function addresses(device: Device, snapshot: NetworkSnapshot): string[] {
  if (device.type === 'switch' || device.type === 'router' || device.type === 'cloud') return [];
  const state = snapshot[device.id];
  const ips = (state?.interfaces ?? device.interfaces).filter((i) => i.ip).map((i) => `${i.ip}/${i.prefix}`);
  if (ips.length === 0 && device.dhcpClient) return ['sin IP (DHCP)'];
  return ips;
}

/**
 * Traduce (recorrido + paso + snapshot) a nodos y enlaces de React Flow.
 * Función pura: todo lo visible se deriva del paso actual y del estado reconstruido.
 */
export function buildTopology(
  track: Track,
  step: TopologyStep | undefined,
  snapshot: NetworkSnapshot,
  options: TopologyOptions,
): { nodes: DeviceFlowNode[]; edges: LinkFlowEdge[] } {
  const active = new Set(step?.activeDevices ?? []);
  const tone = step?.tone ?? 'info';
  const transitByLink = new Map((step?.transits ?? []).map((t) => [t.link, t]));
  const activeLinkTone = new Map((step?.activeLinks ?? []).map((l) => [l.id, l.tone ?? tone]));
  const vlan = options.vlan;

  const nodes: DeviceFlowNode[] = track.devices.map((device) => {
    const vlans = deviceVlans(device, track);
    const outOfVlan = vlan !== null && device.type !== 'router' && !vlans.includes(vlan);
    const accessVlan = device.type !== 'switch' && vlans.length === 1 ? vlans[0] : undefined;
    return {
      id: device.id,
      type: 'device',
      position: device.position,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 2,
      data: {
        device,
        addresses: addresses(device, snapshot),
        active: active.has(device.id),
        dimmed: outOfVlan || (active.size > 0 && !active.has(device.id)),
        selected: options.selectedDeviceId === device.id,
        tone,
        packet: step?.packetAt?.device === device.id ? step.packetAt.packet : undefined,
        vlanColor: accessVlan !== undefined ? options.vlanColors[accessVlan] : undefined,
        onSelectDevice: options.onSelectDevice,
        onSelectPacket: options.onSelectPacket,
      },
    };
  });

  const edges: LinkFlowEdge[] = track.links.map((link) => {
    const transit = transitByLink.get(link.id);
    const isActive = transit !== undefined || activeLinkTone.has(link.id);
    const vlans = linkVlans(link, track.devices);
    const outOfVlan = vlan !== null && vlans.length > 0 && !vlans.includes(vlan);
    const singleVlan = link.kind === 'access' && vlans.length === 1 ? vlans[0] : undefined;
    const devA = track.devices.find((d) => d.id === link.a.device);
    const devB = track.devices.find((d) => d.id === link.b.device);
    return {
      id: link.id,
      type: 'link',
      source: link.a.device,
      target: link.b.device,
      sourceHandle: 'c',
      targetHandle: 'c',
      selectable: false,
      focusable: false,
      zIndex: isActive ? 3 : 1,
      data: {
        link,
        aLabel: ifaceLabel(devA, link.a.iface, snapshot),
        bLabel: ifaceLabel(devB, link.b.iface, snapshot),
        active: isActive,
        dimmed: outOfVlan || ((step?.transits?.length ?? 0) + (step?.activeLinks?.length ?? 0) > 0 && !isActive),
        tone: transit?.tone ?? activeLinkTone.get(link.id) ?? tone,
        transit: transit ? { packet: transit.packet, reverse: transit.reverse ?? false } : undefined,
        vlanColor: singleVlan !== undefined && options.vlan !== null ? options.vlanColors[singleVlan] : undefined,
        animate: options.animate,
        speed: options.speed,
        onSelectPacket: options.onSelectPacket,
      },
    };
  });

  return { nodes, edges };
}
