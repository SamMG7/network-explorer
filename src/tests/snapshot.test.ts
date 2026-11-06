import { describe, expect, it } from 'vitest';
import { buildSnapshots, snapshotAt } from '../engine/simulation/snapshot';
import { SCENARIOS, getScenario } from '../scenarios';
import type { TopologyScenario, Track } from '../engine/types/scenario';

const tracks: Array<[string, Track]> = SCENARIOS.flatMap((s) => (s.kind === 'topology' ? s.tracks.map((t) => [`${s.id}/${t.id}`, t] as [string, Track]) : []));
const track = (scenario: string, id: string) => (getScenario(scenario) as TopologyScenario).tracks.find((t) => t.id === id)!;
const idx = (t: Track, stepId: string) => t.steps.findIndex((s) => s.id === stepId);

describe('estado determinista por paso', () => {
  it.each(tracks)('%s: cada snapshot es idéntico a reconstruirlo desde cero', (_id, t) => {
    const { after } = buildSnapshots(t);
    t.steps.forEach((_, i) => expect(after[i]).toEqual(snapshotAt(t, i)));
  });

  it.each(tracks)('%s: avanzar y retroceder devuelve exactamente el mismo estado', (_id, t) => {
    const first = buildSnapshots(t).after;
    const second = buildSnapshots(t).after; // otra “pasada”, como al volver atrás y avanzar de nuevo
    for (let i = t.steps.length - 1; i >= 0; i--) expect(second[i]).toEqual(first[i]);
  });

  it('no muta las tablas iniciales de los dispositivos', () => {
    const t = track('arp-switching', 'arp');
    const before = JSON.stringify(t.devices);
    buildSnapshots(t);
    expect(JSON.stringify(t.devices)).toBe(before);
  });
});

describe('tablas en pasos concretos', () => {
  it('ARP: la tabla MAC de S1 crece a medida que avanzan los pasos', () => {
    const t = track('arp-switching', 'arp');
    const { after } = buildSnapshots(t);
    expect(after[idx(t, 'request')]!.s1!.mac).toEqual([]);
    expect(after[idx(t, 'flood')]!.s1!.mac.map((e) => e.port)).toEqual(['Fa0/1']);
    expect(after[idx(t, 'reenvio-reply')]!.s1!.mac.map((e) => e.port).sort()).toEqual(['Fa0/1', 'Fa0/2']);
  });

  it('ARP: la caché de PC-A solo tiene a PC-B después del Reply', () => {
    const t = track('arp-switching', 'arp');
    const { after } = buildSnapshots(t);
    expect(after[idx(t, 'reenvio-reply')]!['pc-a']!.arp).toEqual([]);
    expect(after[idx(t, 'cache-a')]!['pc-a']!.arp).toEqual([{ ip: '192.168.1.20', mac: '0050.7966.6802' }]);
    // Volver al paso 2 deja la caché vacía otra vez.
    expect(after[idx(t, 'cache')]!['pc-a']!.arp).toEqual([]);
  });

  it('VLAN: S2 aprende la MAC de PC-A en el trunk dentro de la VLAN 10', () => {
    const t = track('vlan-trunking', 'misma-vlan');
    const { after } = buildSnapshots(t);
    expect(after[idx(t, 's2-flood')]!.s2!.mac).toEqual([{ vlan: 10, mac: '0050.7966.6a01', port: 'G0/1', type: 'DYNAMIC' }]);
  });

  it('NAT: la tabla de traducciones pasa de 0 a 1 y a 2 entradas', () => {
    const t = track('dhcp-nat', 'nat');
    const { after } = buildSnapshots(t);
    expect(after[idx(t, 'salida-a')]!.r1!.nat).toHaveLength(0);
    expect(after[idx(t, 'pat-a')]!.r1!.nat.map((e) => e.insideGlobal)).toEqual(['203.0.113.2:50000']);
    expect(after[idx(t, 'pat-b')]!.r1!.nat.map((e) => e.insideGlobal)).toEqual(['203.0.113.2:50000', '203.0.113.2:1024']);
  });

  it('DHCP: el cliente no tiene IP hasta el último paso y el préstamo aparece con el ACK', () => {
    const t = track('dhcp-nat', 'dhcp');
    const { after } = buildSnapshots(t);
    expect(after[idx(t, 'ack')]!.cliente!.interfaces[0]!.ip).toBeUndefined();
    expect(after[idx(t, 'offer')]!.r1!.dhcpBindings.map((b) => b.ip)).toEqual(['192.168.10.12']);
    expect(after[idx(t, 'ack')]!.r1!.dhcpBindings.map((b) => b.ip)).toEqual(['192.168.10.12', '192.168.10.11']);
    const final = after[idx(t, 'configurado')]!.cliente!;
    expect(final.interfaces[0]).toMatchObject({ ip: '192.168.10.11', prefix: 24 });
    expect(final.gateway).toBe('192.168.10.1');
  });
});
