import type { Device, Link } from '../types/network';
import type { Scenario, TopologyStep, Track } from '../types/scenario';
import type { Header, Packet } from '../types/packet';
import { buildSnapshots } from './snapshot';
import { decisionMatchesExpectation, evaluateDecision } from './decisions';
import { BROADCAST_MAC } from '../../services/network/switching';
import { parseIPv4 } from '../../services/network/ipv4';
import { GLOSSARY } from '../../content/glossary';

const L3: Device['type'][] = ['pc', 'server', 'router'];
const MAC_RE = /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/;
const ZERO_MAC = '0000.0000.0000';

/** Reglas de coherencia de una PDU (independientes de la topología). */
export function validatePacket(packet: Packet): string[] {
  const problems: string[] = [];
  const h = packet.headers;
  h.forEach((header, i) => {
    const inner: Header | undefined = h[i + 1];
    switch (header.type) {
      case 'ethernet': {
        if (i !== 0) problems.push(`${packet.id}: Ethernet debe ser el encabezado más externo`);
        for (const mac of [header.src, header.dst]) if (!MAC_RE.test(mac)) problems.push(`${packet.id}: MAC con formato inválido ${mac}`);
        if (inner?.type === 'arp' && header.etherType !== '0x0806') problems.push(`${packet.id}: ARP requiere EtherType 0x0806`);
        if (inner?.type === 'ipv4' && header.etherType !== '0x0800') problems.push(`${packet.id}: IPv4 requiere EtherType 0x0800`);
        if (header.vlanTag && (header.vlanTag.vid < 1 || header.vlanTag.vid > 4094)) problems.push(`${packet.id}: VLAN ID fuera de rango`);
        break;
      }
      case 'arp': {
        const eth = h[0]?.type === 'ethernet' ? h[0] : undefined;
        if (header.operation === 1) {
          if (header.targetMac !== ZERO_MAC) problems.push(`${packet.id}: ARP Request lleva target MAC 0000.0000.0000`);
          if (eth && eth.dst !== BROADCAST_MAC) problems.push(`${packet.id}: ARP Request se envía a broadcast`);
        } else if (eth && eth.dst !== header.targetMac) {
          problems.push(`${packet.id}: ARP Reply es unicast hacia la MAC del solicitante`);
        }
        if (eth && eth.src !== header.senderMac) problems.push(`${packet.id}: MAC origen Ethernet ≠ sender MAC de ARP`);
        if (inner) problems.push(`${packet.id}: ARP no encapsula otros encabezados`);
        break;
      }
      case 'ipv4': {
        if (parseIPv4(header.src) === null || parseIPv4(header.dst) === null) problems.push(`${packet.id}: IP inválida`);
        if (header.ttl < 1 || header.ttl > 255) problems.push(`${packet.id}: TTL fuera de rango`);
        const expected = inner?.type === 'icmp' ? 1 : inner?.type === 'tcp' ? 6 : inner?.type === 'udp' ? 17 : null;
        if (expected !== null && header.protocol !== expected) problems.push(`${packet.id}: campo Protocol ${header.protocol} no coincide con ${inner?.type}`);
        break;
      }
      case 'udp':
        if (inner?.type === 'dhcp') {
          const client = header.srcPort === 68 && header.dstPort === 67;
          const server = header.srcPort === 67 && header.dstPort === 68;
          if (!client && !server) problems.push(`${packet.id}: DHCP usa UDP 68 (cliente) y 67 (servidor)`);
        }
        break;
      case 'dhcp': {
        const udp = h[i - 1];
        if (udp?.type !== 'udp') problems.push(`${packet.id}: DHCP viaja sobre UDP`);
        const fromClient = header.messageType === 'DHCPDISCOVER' || header.messageType === 'DHCPREQUEST';
        if ((header.op === 1) !== fromClient) problems.push(`${packet.id}: op no corresponde al tipo de mensaje DHCP`);
        if (!header.options.some((o) => o.code === 53)) problems.push(`${packet.id}: falta la opción 53 (tipo de mensaje)`);
        break;
      }
      default:
        break;
    }
  });
  return problems;
}

function endpointOf(link: Link, reverse: boolean) {
  return reverse ? { from: link.b, to: link.a } : { from: link.a, to: link.b };
}

/** Reglas de una PDU en tránsito por un enlace concreto. */
export function validateTransit(track: Track, step: TopologyStep, transit: NonNullable<TopologyStep['transits']>[number]): string[] {
  const problems: string[] = [];
  const where = `${track.id}/${step.id}/${transit.link}`;
  const link = track.links.find((l) => l.id === transit.link);
  if (!link) return [`${where}: enlace inexistente`];
  const { from, to } = endpointOf(link, transit.reverse ?? false);
  const sender = track.devices.find((d) => d.id === from.device);
  const receiver = track.devices.find((d) => d.id === to.device);
  if (!sender || !receiver) return [`${where}: extremo inexistente`];
  if (link.kind === 'internet') return problems; // segmento abstracto: sin reglas de capa 2

  const eth = transit.packet.headers[0];
  if (eth?.type !== 'ethernet') return [`${where}: por un enlace Ethernet viaja una trama Ethernet`];

  const senderIface = sender.interfaces.find((i) => i.name === from.iface);
  const receiverIface = receiver.interfaces.find((i) => i.name === to.iface);
  if (L3.includes(sender.type) && senderIface?.mac && eth.src !== senderIface.mac) {
    problems.push(`${where}: MAC origen ${eth.src} ≠ MAC de ${sender.hostname} ${from.iface} (${senderIface.mac})`);
  }
  if (L3.includes(receiver.type) && receiverIface?.mac && eth.dst !== BROADCAST_MAC && eth.dst !== receiverIface.mac) {
    problems.push(`${where}: MAC destino ${eth.dst} ≠ MAC de ${receiver.hostname} ${to.iface} (${receiverIface.mac})`);
  }

  // Etiquetado 802.1Q: trunk → etiquetado (salvo VLAN nativa), access → sin etiqueta.
  const switchIface = sender.type === 'switch' ? senderIface : receiver.type === 'switch' ? receiverIface : undefined;
  if (link.kind === 'trunk') {
    const native = switchIface?.native ?? 1;
    if (!eth.vlanTag) problems.push(`${where}: en el trunk la trama debe ir etiquetada (802.1Q)`);
    else if (eth.vlanTag.vid === native) problems.push(`${where}: la VLAN nativa viaja sin etiqueta`);
  } else if (eth.vlanTag) {
    problems.push(`${where}: en un enlace ${link.kind} la trama viaja sin etiqueta 802.1Q`);
  }
  return problems;
}

export function validateTrack(track: Track, scenarioId = ''): string[] {
  const problems: string[] = [];
  const p = (m: string) => problems.push(`[${scenarioId}/${track.id}] ${m}`);
  const devices = new Map(track.devices.map((d) => [d.id, d]));
  if (devices.size !== track.devices.length) p('ids de dispositivo duplicados');

  for (const link of track.links) {
    for (const end of [link.a, link.b]) {
      const d = devices.get(end.device);
      if (!d) p(`enlace ${link.id}: dispositivo inexistente ${end.device}`);
      else if (!d.interfaces.some((i) => i.name === end.iface)) p(`enlace ${link.id}: ${d.hostname} no tiene la interfaz ${end.iface}`);
    }
  }
  const linkIds = new Set(track.links.map((l) => l.id));
  if (linkIds.size !== track.links.length) p('ids de enlace duplicados');

  let snapshots: ReturnType<typeof buildSnapshots> | null = null;
  try {
    snapshots = buildSnapshots(track);
  } catch (e) {
    p(`no se pudieron construir los snapshots: ${(e as Error).message}`);
  }

  const stepIds = new Set<string>();
  track.steps.forEach((step, index) => {
    const w = `paso ${index + 1} (${step.id})`;
    if (stepIds.has(step.id)) p(`${w}: id duplicado`);
    stepIds.add(step.id);
    for (const field of ['title', 'what', 'why', 'protocol', 'decisionText', 'result', 'misconfig'] as const) {
      if (!step[field].trim()) p(`${w}: falta "${field}"`);
    }
    if (step.layers.length === 0) p(`${w}: sin capa OSI`);
    if (!(step.durationMs > 0)) p(`${w}: duración inválida`);
    if (!devices.has(step.device) && step.device !== '—') p(`${w}: dispositivo que procesa inexistente ${step.device}`);
    for (const c of step.concepts) if (!GLOSSARY[c]) p(`${w}: término de glosario inexistente "${c}"`);
    for (const id of step.activeDevices) if (!devices.has(id)) p(`${w}: dispositivo activo inexistente ${id}`);
    for (const l of step.activeLinks ?? []) if (!linkIds.has(l.id)) p(`${w}: enlace activo inexistente ${l.id}`);
    for (const e of step.events ?? []) if (!devices.has(e.device)) p(`${w}: evento sobre ${e.device} inexistente`);
    if (step.packetAt && !devices.has(step.packetAt.device)) p(`${w}: packetAt en dispositivo inexistente`);

    const packets = [...(step.transits ?? []).map((t) => t.packet), ...(step.packetAt ? [step.packetAt.packet] : [])];
    for (const pk of packets) for (const m of validatePacket(pk)) p(`${w}: ${m}`);
    for (const t of step.transits ?? []) for (const m of validateTransit(track, step, t)) p(m);

    if (step.decision && snapshots) {
      try {
        const outcome = evaluateDecision(step.decision, track, snapshots.before[index]!, snapshots.after[index]!);
        if (!decisionMatchesExpectation(step.decision, outcome)) p(`${w}: la decisión calculada (${step.decision.kind}) no coincide con lo esperado en el guion`);
      } catch (e) {
        p(`${w}: error al evaluar la decisión: ${(e as Error).message}`);
      }
    }
  });
  return problems;
}

export function validateScenario(scenario: Scenario): string[] {
  const base: string[] = [];
  if (scenario.objectives.length === 0) base.push(`[${scenario.id}] sin objetivos`);
  if (scenario.kind === 'subnetting') {
    if (scenario.examples.length === 0) base.push(`[${scenario.id}] sin ejemplos`);
    return base;
  }
  if (scenario.tracks.length === 0) base.push(`[${scenario.id}] sin recorridos`);
  return [...base, ...scenario.tracks.flatMap((t) => validateTrack(t, scenario.id))];
}
