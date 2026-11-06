import { describe, expect, it } from 'vitest';
import { type Route, lookupRoute } from '../services/network/routing';
import { BROADCAST_MAC, type MacEntry, type SwitchPort, ingressVlan, learnMac, switchDecision } from '../services/network/switching';
import { arpLookup, arpSet, hostNextHop } from '../services/network/arp';
import { patReverse, patTranslate } from '../services/network/nat';

describe('routing: coincidencia de prefijo más largo', () => {
  const routes: Route[] = [
    { code: 'S*', network: '0.0.0.0', prefix: 0, nextHop: '10.0.0.1', iface: 'G0/1', ad: 1, metric: 0 },
    { code: 'S', network: '192.168.0.0', prefix: 16, nextHop: '10.0.0.2', iface: 'G0/2', ad: 1, metric: 0 },
    { code: 'S', network: '192.168.20.0', prefix: 24, nextHop: '10.0.0.3', iface: 'G0/3', ad: 1, metric: 0 },
    { code: 'C', network: '10.0.0.0', prefix: 24, iface: 'G0/0', ad: 0, metric: 0 },
  ];

  it('elige la ruta más específica', () => {
    const r = lookupRoute(routes, '192.168.20.55');
    expect(r.best?.prefix).toBe(24);
    expect(r.candidates.map((c) => c.prefix)).toEqual([24, 16, 0]);
  });

  it('usa la /16 cuando la /24 no contiene al destino', () => {
    expect(lookupRoute(routes, '192.168.99.1').best?.nextHop).toBe('10.0.0.2');
  });

  it('usa la ruta por defecto como último recurso', () => {
    expect(lookupRoute(routes, '8.8.8.8').best?.code).toBe('S*');
  });

  it('sin coincidencias devuelve null (descarte)', () => {
    const r = lookupRoute(routes.filter((x) => x.code !== 'S*'), '8.8.8.8');
    expect(r.best).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it('con el mismo prefijo gana la menor distancia administrativa', () => {
    const r = lookupRoute(
      [
        { code: 'S', network: '172.16.0.0', prefix: 24, nextHop: '10.0.0.9', iface: 'G0/9', ad: 200, metric: 0 },
        { code: 'S', network: '172.16.0.0', prefix: 24, nextHop: '10.0.0.1', iface: 'G0/1', ad: 1, metric: 0 },
      ],
      '172.16.0.5',
    );
    expect(r.best?.nextHop).toBe('10.0.0.1');
    expect(r.equalCost).toHaveLength(1);
  });

  it('con mismo prefijo y AD gana la menor métrica; si empatan, es ECMP', () => {
    const base = { code: 'S' as const, network: '172.16.0.0', prefix: 24, ad: 1 };
    const byMetric = lookupRoute([{ ...base, nextHop: 'a', iface: 'A', metric: 20 }, { ...base, nextHop: 'b', iface: 'B', metric: 10 }], '172.16.0.1');
    expect(byMetric.best?.nextHop).toBe('b');
    const ecmp = lookupRoute([{ ...base, nextHop: 'a', iface: 'A', metric: 10 }, { ...base, nextHop: 'b', iface: 'B', metric: 10 }], '172.16.0.1');
    expect(ecmp.equalCost).toHaveLength(2);
  });

  it('rechaza destinos inválidos', () => {
    expect(() => lookupRoute(routes, '999.1.1.1')).toThrow();
  });
});

describe('switching: aprendizaje y reenvío', () => {
  const ports: SwitchPort[] = [
    { name: 'Fa0/1', mode: 'access', vlan: 10 },
    { name: 'Fa0/2', mode: 'access', vlan: 10 },
    { name: 'Fa0/3', mode: 'access', vlan: 20 },
    { name: 'G0/1', mode: 'trunk', allowed: [10, 20], native: 99 },
  ];

  it('aprende la MAC de origen por VLAN y puerto', () => {
    const t = learnMac([], { vlan: 10, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/1' });
    expect(t).toEqual([{ vlan: 10, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/1', type: 'DYNAMIC' }]);
  });

  it('actualiza el puerto si la MAC se mueve y no duplica', () => {
    let t = learnMac([], { vlan: 10, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/1' });
    t = learnMac(t, { vlan: 10, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/2' });
    expect(t).toHaveLength(1);
    expect(t[0]!.port).toBe('Fa0/2');
  });

  it('la misma MAC en otra VLAN es otra entrada', () => {
    let t = learnMac([], { vlan: 10, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/1' });
    t = learnMac(t, { vlan: 20, mac: 'aaaa.aaaa.aaaa', port: 'Fa0/3' });
    expect(t).toHaveLength(2);
  });

  it('no aprende broadcast como origen, no muta la tabla original y respeta entradas estáticas', () => {
    const original: MacEntry[] = [{ vlan: 10, mac: 'bbbb.bbbb.bbbb', port: 'Fa0/2', type: 'STATIC' }];
    expect(learnMac(original, { vlan: 10, mac: BROADCAST_MAC, port: 'Fa0/1' })).toEqual(original);
    expect(learnMac(original, { vlan: 10, mac: 'bbbb.bbbb.bbbb', port: 'Fa0/1' })).toEqual(original);
    expect(original).toHaveLength(1);
  });

  it('broadcast: inunda solo la VLAN y nunca por el puerto de entrada', () => {
    const d = switchDecision([], ports, { vlan: 10, dstMac: BROADCAST_MAC, inPort: 'Fa0/1' });
    expect(d).toMatchObject({ action: 'flood', ports: ['Fa0/2', 'G0/1'] });
  });

  it('unicast desconocido: inunda', () => {
    expect(switchDecision([], ports, { vlan: 20, dstMac: 'cccc.cccc.cccc', inPort: 'Fa0/3' })).toMatchObject({ action: 'flood', ports: ['G0/1'] });
  });

  it('unicast conocido: reenvía solo por su puerto', () => {
    const t = learnMac([], { vlan: 10, mac: 'bbbb.bbbb.bbbb', port: 'G0/1' });
    expect(switchDecision(t, ports, { vlan: 10, dstMac: 'bbbb.bbbb.bbbb', inPort: 'Fa0/1' })).toMatchObject({ action: 'forward', port: 'G0/1' });
  });

  it('destino en el mismo puerto de entrada: filtra', () => {
    const t = learnMac([], { vlan: 10, mac: 'bbbb.bbbb.bbbb', port: 'Fa0/1' });
    expect(switchDecision(t, ports, { vlan: 10, dstMac: 'bbbb.bbbb.bbbb', inPort: 'Fa0/1' }).action).toBe('filter');
  });

  it('la tabla es por VLAN: una MAC conocida en otra VLAN se trata como desconocida', () => {
    const t = learnMac([], { vlan: 20, mac: 'bbbb.bbbb.bbbb', port: 'Fa0/3' });
    expect(switchDecision(t, ports, { vlan: 10, dstMac: 'bbbb.bbbb.bbbb', inPort: 'Fa0/1' }).action).toBe('flood');
  });

  it('VLAN de ingreso según el tipo de puerto', () => {
    expect(ingressVlan(ports[0]!, undefined)).toBe(10);
    expect(ingressVlan(ports[0]!, 20)).toBeNull();
    expect(ingressVlan(ports[3]!, undefined)).toBe(99);
    expect(ingressVlan(ports[3]!, 20)).toBe(20);
    expect(ingressVlan(ports[3]!, 30)).toBeNull();
  });
});

describe('ARP y decisión local/remoto', () => {
  it('agrega y actualiza entradas sin duplicar', () => {
    let c = arpSet([], { ip: '192.168.1.20', mac: 'aaaa.aaaa.aaaa' });
    c = arpSet(c, { ip: '192.168.1.5', mac: 'bbbb.bbbb.bbbb' });
    c = arpSet(c, { ip: '192.168.1.20', mac: 'cccc.cccc.cccc' });
    expect(c).toEqual([
      { ip: '192.168.1.5', mac: 'bbbb.bbbb.bbbb' },
      { ip: '192.168.1.20', mac: 'cccc.cccc.cccc' },
    ]);
    expect(arpLookup(c, '192.168.1.99')).toBeUndefined();
  });

  it('destino local → ARP por el destino; remoto → por el gateway', () => {
    const cfg = { ip: '192.168.1.10', prefix: 24, gateway: '192.168.1.1' };
    expect(hostNextHop(cfg, '192.168.1.20')).toMatchObject({ local: true, target: '192.168.1.20' });
    expect(hostNextHop(cfg, '8.8.8.8')).toMatchObject({ local: false, target: '192.168.1.1' });
  });

  it('remoto sin gateway: no hay a quién enviar', () => {
    expect(hostNextHop({ ip: '192.168.1.10', prefix: 24 }, '8.8.8.8')).toMatchObject({ local: false, target: null });
  });

  it('la máscara cambia la decisión', () => {
    expect(hostNextHop({ ip: '192.168.1.10', prefix: 30, gateway: '192.168.1.9' }, '192.168.1.20').local).toBe(false);
  });
});

describe('NAT/PAT', () => {
  const cfg = { publicIp: '203.0.113.2', portStart: 1024, portEnd: 65535 };
  const flow = (srcIp: string, srcPort: number) => ({ protocol: 'tcp' as const, srcIp, srcPort, dstIp: '198.51.100.10', dstPort: 443 });

  it('conserva el puerto de origen si está libre', () => {
    const r = patTranslate([], flow('192.168.10.11', 50000), cfg);
    expect(r.entry).toEqual({
      protocol: 'tcp',
      insideLocal: '192.168.10.11:50000',
      insideGlobal: '203.0.113.2:50000',
      outsideLocal: '198.51.100.10:443',
      outsideGlobal: '198.51.100.10:443',
    });
    expect(r.portPreserved).toBe(true);
  });

  it('si el puerto global está ocupado, asigna el siguiente libre del rango', () => {
    let t = patTranslate([], flow('192.168.10.11', 50000), cfg).table;
    const r = patTranslate(t, flow('192.168.10.12', 50000), cfg);
    expect(r.entry.insideGlobal).toBe('203.0.113.2:1024');
    expect(r.portPreserved).toBe(false);
    t = r.table;
    expect(patTranslate(t, flow('192.168.10.13', 50000), cfg).entry.insideGlobal).toBe('203.0.113.2:1025');
  });

  it('reutiliza la traducción existente de la misma conexión', () => {
    const t = patTranslate([], flow('192.168.10.11', 50000), cfg).table;
    const r = patTranslate(t, flow('192.168.10.11', 50000), cfg);
    expect(r.reused).toBe(true);
    expect(r.table).toHaveLength(1);
  });

  it('traducción inversa: encuentra el host interno o descarta', () => {
    const t = patTranslate([], flow('192.168.10.11', 50000), cfg).table;
    expect(patReverse(t, { protocol: 'tcp', srcIp: '198.51.100.10', srcPort: 443, dstIp: '203.0.113.2', dstPort: 50000 })?.insideLocal).toBe('192.168.10.11:50000');
    expect(patReverse(t, { protocol: 'tcp', srcIp: '192.0.2.50', srcPort: 40000, dstIp: '203.0.113.2', dstPort: 50000 })).toBeNull();
    expect(patReverse(t, { protocol: 'udp', srcIp: '198.51.100.10', srcPort: 443, dstIp: '203.0.113.2', dstPort: 50000 })).toBeNull();
  });

  it('falla si se agotan los puertos', () => {
    const tiny = { publicIp: '203.0.113.2', portStart: 1024, portEnd: 1024 };
    let t = patTranslate([], flow('192.168.10.11', 1024), tiny).table;
    expect(() => patTranslate(t, flow('192.168.10.12', 1024), tiny)).toThrow();
    t = [];
    expect(t).toEqual([]);
  });
});
