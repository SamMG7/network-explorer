import { describe, expect, it } from 'vitest';
import { SCENARIOS, filterScenarios, getScenario } from '../scenarios';
import { validatePacket, validateScenario, validateTrack } from '../engine/simulation/validate';
import { findHeader } from '../engine/types/packet';
import type { TopologyScenario, Track } from '../engine/types/scenario';
import { GLOSSARY } from '../content/glossary';
import { buildSubnetSteps } from '../scenarios/subnetting/subnetSteps';
import { calculateSubnet, parseIPv4 } from '../services/network/ipv4';
import { subnettingScenario } from '../scenarios/subnetting/subnettingScenario';
import { BROADCAST_MAC, arpRequest, eth, packet } from '../scenarios/builders';

describe('catálogo', () => {
  it('contiene los seis escenarios obligatorios', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['osi-encapsulacion', 'arp-switching', 'ipv4-subnetting', 'vlan-trunking', 'routing-ipv4', 'dhcp-nat']);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s pasa todas las reglas de integridad y precisión', (_id, s) => {
    expect(validateScenario(s)).toEqual([]);
  });

  it('el escenario DHCP/NAT tiene dos recorridos seleccionables', () => {
    expect((getScenario('dhcp-nat') as TopologyScenario).tracks.map((t) => t.id)).toEqual(['dhcp', 'nat']);
  });

  it('todos los términos referenciados existen en el glosario y sus relaciones también', () => {
    for (const g of Object.values(GLOSSARY)) for (const r of g.related ?? []) expect(GLOSSARY[r], r).toBeDefined();
  });

  it('búsqueda por protocolo, sin acentos y por dificultad', () => {
    expect(filterScenarios(SCENARIOS, '802.1q', 'todas', 'todas').map((s) => s.id)).toContain('vlan-trunking');
    expect(filterScenarios(SCENARIOS, 'enrutamiento', 'todas', 'todas').map((s) => s.id)).toContain('routing-ipv4');
    expect(filterScenarios(SCENARIOS, '', 'todas', 'avanzado').map((s) => s.id)).toEqual(['dhcp-nat']);
    expect(filterScenarios(SCENARIOS, '', 'servicios-ip', 'todas').map((s) => s.id)).toEqual(['dhcp-nat']);
    expect(filterScenarios(SCENARIOS, 'zzz', 'todas', 'todas')).toEqual([]);
  });
});

describe('reglas de routing en el recorrido', () => {
  const t = (getScenario('routing-ipv4') as TopologyScenario).tracks[0]!;
  const hops = t.steps.flatMap((s) => s.transits ?? []);

  it('la IP origen y destino no cambian (sin NAT)', () => {
    const ips = hops.map((h) => findHeader(h.packet, 'ipv4')!);
    expect(new Set(ips.map((i) => `${i.src}>${i.dst}`)).size).toBe(1);
  });

  it('el TTL baja exactamente 1 por router', () => {
    expect(hops.map((h) => findHeader(h.packet, 'ipv4')!.ttl)).toEqual([128, 127, 126]);
  });

  it('las MAC cambian en cada salto', () => {
    const macs = hops.map((h) => {
      const e = findHeader(h.packet, 'ethernet')!;
      return `${e.src}>${e.dst}`;
    });
    expect(new Set(macs).size).toBe(hops.length);
  });
});

describe('PAT: antes y después de la traducción', () => {
  it('solo cambian la IP y el puerto de origen', () => {
    const t = (getScenario('dhcp-nat') as TopologyScenario).tracks.find((x) => x.id === 'nat')!;
    const step = t.steps.find((s) => s.id === 'pat-a')!;
    const [inside, outside] = step.transits!.map((x) => x.packet);
    const i1 = findHeader(inside!, 'ipv4')!;
    const i2 = findHeader(outside!, 'ipv4')!;
    expect(i1.src).toBe('192.168.10.11');
    expect(i2.src).toBe('203.0.113.2');
    expect(i2.dst).toBe(i1.dst);
    expect(findHeader(outside!, 'tcp')!.dstPort).toBe(findHeader(inside!, 'tcp')!.dstPort);
  });
});

describe('el validador detecta errores reales', () => {
  it('EtherType incorrecto y ARP Request sin broadcast', () => {
    const bad = packet('x', 'x', eth('aaaa.aaaa.aaaa', 'bbbb.bbbb.bbbb', '0x0800'), arpRequest('bbbb.bbbb.bbbb', '10.0.0.1', '10.0.0.2'));
    const problems = validatePacket(bad);
    expect(problems.some((p) => p.includes('0x0806'))).toBe(true);
    expect(problems.some((p) => p.includes('broadcast'))).toBe(true);
    expect(validatePacket(packet('ok', 'ok', eth(BROADCAST_MAC, 'bbbb.bbbb.bbbb', '0x0806'), arpRequest('bbbb.bbbb.bbbb', '10.0.0.1', '10.0.0.2')))).toEqual([]);
  });

  it('una decisión del guion que contradice la lógica se reporta', () => {
    const base = (getScenario('routing-ipv4') as TopologyScenario).tracks[0]!;
    const broken: Track = {
      ...base,
      steps: base.steps.map((s) => (s.id === 'r1-lookup' ? { ...s, decision: { kind: 'route-lookup', device: 'r1', dstIp: '192.168.20.10', expect: { iface: 'G0/0' } } } : s)),
    };
    expect(validateTrack(broken).some((p) => p.includes('no coincide'))).toBe(true);
  });

  it('una MAC de origen que no corresponde a la interfaz se reporta', () => {
    const base = (getScenario('routing-ipv4') as TopologyScenario).tracks[0]!;
    const broken: Track = {
      ...base,
      steps: base.steps.map((s) =>
        s.id === 'r1-reencapsula'
          ? { ...s, transits: s.transits!.map((t) => ({ ...t, packet: { ...t.packet, headers: t.packet.headers.map((h) => (h.type === 'ethernet' ? { ...h, src: '0050.7966.6801' } : h)) } })) }
          : s,
      ),
    };
    expect(validateTrack(broken).some((p) => p.includes('MAC origen'))).toBe(true);
  });

  it('una trama sin etiqueta en el trunk se reporta', () => {
    const base = (getScenario('vlan-trunking') as TopologyScenario).tracks[0]!;
    const broken: Track = {
      ...base,
      steps: base.steps.map((s) =>
        s.id === 's1-flood'
          ? { ...s, transits: s.transits!.map((t) => ({ ...t, packet: { ...t.packet, headers: t.packet.headers.map((h) => (h.type === 'ethernet' ? { ...h, vlanTag: undefined } : h)) } })) }
          : s,
      ),
    };
    expect(validateTrack(broken).some((p) => p.includes('etiquetada'))).toBe(true);
  });
});

describe('subnetting: pasos generados del cálculo real', () => {
  it.each(subnettingScenario.examples.map((e) => [e.label, e] as const))('%s genera 8 pasos completos', (_l, ex) => {
    const steps = buildSubnetSteps(calculateSubnet(parseIPv4(ex.ip)!, ex.prefix));
    expect(steps).toHaveLength(8);
    expect(new Set(steps.map((s) => s.id)).size).toBe(8);
    for (const s of steps) {
      expect(s.what.length).toBeGreaterThan(10);
      for (const c of s.concepts) expect(GLOSSARY[c], c).toBeDefined();
    }
  });

  it('los textos reflejan los valores calculados y los casos especiales', () => {
    const s26 = buildSubnetSteps(calculateSubnet(parseIPv4('192.168.10.77')!, 26));
    expect(s26.find((s) => s.id === 'red')!.result).toContain('192.168.10.64/26');
    expect(s26.find((s) => s.id === 'conteo')!.result).toContain('62 hosts');
    const s31 = buildSubnetSteps(calculateSubnet(parseIPv4('10.0.12.0')!, 31));
    expect(s31.find((s) => s.id === 'broadcast')!.result).toBe('Sin dirección de broadcast');
    expect(s31.find((s) => s.id === 'broadcast')!.what).toContain('RFC 3021');
  });
});
