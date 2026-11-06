import type { Device } from '../types/network';
import type { StepDecision, Track } from '../types/scenario';
import type { NetworkSnapshot } from './snapshot';
import { arpLookup, hostNextHop } from '../../services/network/arp';
import { type ForwardDecision, type SwitchPort, switchDecision } from '../../services/network/switching';
import { type RouteLookup, lookupRoute } from '../../services/network/routing';
import { type NatEntry, patReverse, patTranslate } from '../../services/network/nat';

export type DecisionOutcome =
  | { kind: 'local-or-remote'; verdict: 'local' | 'remote'; target: string | null; reason: string; ownIp: string; prefix: number }
  | { kind: 'arp-lookup'; verdict: 'hit' | 'miss'; ip: string; mac?: string; reason: string }
  | { kind: 'switch-forward'; decision: ForwardDecision; vlan: number; inPort: string; dstMac: string }
  | { kind: 'route-lookup'; lookup: RouteLookup; dstIp: string }
  | { kind: 'nat-out'; entry: NatEntry; portPreserved: boolean; reused: boolean }
  | { kind: 'nat-in'; entry: NatEntry | null; destination: string };

function device(track: Track, id: string): Device {
  const d = track.devices.find((x) => x.id === id);
  if (!d) throw new Error(`Dispositivo inexistente: ${id}`);
  return d;
}

function switchPorts(d: Device): SwitchPort[] {
  return d.interfaces
    .filter((i) => i.mode === 'access' || i.mode === 'trunk')
    .map((i) => ({ name: i.name, mode: i.mode!, vlan: i.vlan, allowed: i.allowed, native: i.native }));
}

/**
 * Calcula la decisión de un dispositivo con la lógica de red real y el estado del paso.
 * - Búsquedas ARP: sobre el estado ANTERIOR al paso (lo que el host sabía al decidir).
 * - Switch: sobre el estado POSTERIOR (el switch aprende el origen y luego reenvía).
 */
export function evaluateDecision(
  decision: StepDecision,
  track: Track,
  before: NetworkSnapshot,
  after: NetworkSnapshot,
): DecisionOutcome {
  switch (decision.kind) {
    case 'local-or-remote': {
      const state = after[decision.device]!;
      const iface = state.interfaces.find((i) => i.ip && i.prefix !== undefined);
      if (!iface?.ip || iface.prefix === undefined) throw new Error(`${decision.device} no tiene IPv4`);
      const r = hostNextHop({ ip: iface.ip, prefix: iface.prefix, gateway: state.gateway }, decision.dstIp);
      return { kind: 'local-or-remote', verdict: r.local ? 'local' : 'remote', target: r.target, reason: r.reason, ownIp: iface.ip, prefix: iface.prefix };
    }
    case 'arp-lookup': {
      const hit = arpLookup(before[decision.device]!.arp, decision.ip);
      return hit
        ? { kind: 'arp-lookup', verdict: 'hit', ip: decision.ip, mac: hit.mac, reason: `La caché ARP ya contiene ${decision.ip} → ${hit.mac}: no hace falta preguntar.` }
        : { kind: 'arp-lookup', verdict: 'miss', ip: decision.ip, reason: `La caché ARP no contiene ${decision.ip}: hay que enviar un ARP Request.` };
    }
    case 'switch-forward': {
      const d = device(track, decision.device);
      const result = switchDecision(after[decision.device]!.mac, switchPorts(d), {
        vlan: decision.vlan,
        dstMac: decision.dstMac,
        inPort: decision.inPort,
      });
      return { kind: 'switch-forward', decision: result, vlan: decision.vlan, inPort: decision.inPort, dstMac: decision.dstMac };
    }
    case 'route-lookup': {
      const d = device(track, decision.device);
      return { kind: 'route-lookup', lookup: lookupRoute(d.routes ?? [], decision.dstIp), dstIp: decision.dstIp };
    }
    case 'nat-out': {
      const d = device(track, decision.device);
      if (!d.pat) throw new Error(`${d.id} sin PAT`);
      // Se recalcula sobre el estado anterior: es exactamente la traducción que crea este paso.
      const r = patTranslate(before[decision.device]!.nat, decision, d.pat);
      return { kind: 'nat-out', entry: r.entry, portPreserved: r.portPreserved, reused: r.reused };
    }
    case 'nat-in': {
      const entry = patReverse(after[decision.device]!.nat, decision);
      return { kind: 'nat-in', entry, destination: `${decision.dstIp}:${decision.dstPort}` };
    }
  }
}

/** ¿La decisión calculada coincide con lo que el guion del escenario espera? */
export function decisionMatchesExpectation(decision: StepDecision, outcome: DecisionOutcome): boolean {
  switch (decision.kind) {
    case 'local-or-remote':
      return outcome.kind === 'local-or-remote' && outcome.verdict === decision.expect;
    case 'arp-lookup':
      return outcome.kind === 'arp-lookup' && outcome.verdict === decision.expect;
    case 'switch-forward': {
      if (outcome.kind !== 'switch-forward') return false;
      const got = outcome.decision;
      const exp = decision.expect;
      if (got.action !== exp.action) return false;
      if (got.action === 'flood' && exp.action === 'flood') return [...got.ports].sort().join() === [...exp.ports].sort().join();
      if (got.action === 'forward' && exp.action === 'forward') return got.port === exp.port;
      return true;
    }
    case 'route-lookup': {
      if (outcome.kind !== 'route-lookup') return false;
      const best = outcome.lookup.best;
      if (decision.expect === 'drop') return best === null;
      return best !== null && best.iface === decision.expect.iface && best.nextHop === decision.expect.nextHop;
    }
    case 'nat-out':
      return outcome.kind === 'nat-out' && outcome.entry.insideGlobal === decision.expect.insideGlobal;
    case 'nat-in':
      if (outcome.kind !== 'nat-in') return false;
      if (decision.expect === 'drop') return outcome.entry === null;
      return outcome.entry?.insideLocal === decision.expect.insideLocal;
  }
}
