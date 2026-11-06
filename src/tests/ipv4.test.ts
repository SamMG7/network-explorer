import { describe, expect, it } from 'vitest';
import {
  calculateSubnet,
  formatIPv4,
  isPrivateIPv4,
  maskToPrefix,
  parseIPv4,
  parseSubnetInput,
  prefixToMask,
  sameSubnet,
  toDottedBinary,
} from '../services/network/ipv4';

const ip = (s: string) => {
  const v = parseIPv4(s);
  if (v === null) throw new Error(s);
  return v;
};
const calc = (s: string, p: number) => calculateSubnet(ip(s), p);

describe('parseIPv4 / formatIPv4', () => {
  it('acepta direcciones válidas y conserva el formato', () => {
    for (const s of ['0.0.0.0', '255.255.255.255', '192.168.1.10', '10.0.0.1', ' 8.8.8.8 ']) {
      expect(formatIPv4(ip(s))).toBe(s.trim());
    }
  });

  it.each([
    ['256.1.1.1'],
    ['1.1.1'],
    ['1.1.1.1.1'],
    ['192.168.01.1'],
    ['a.b.c.d'],
    [''],
    ['1..1.1'],
    ['-1.2.3.4'],
    ['1.2.3.4 5'],
    ['1.2.3.+4'],
  ])('rechaza %j', (s) => {
    expect(parseIPv4(s)).toBeNull();
  });

  it('no produce números negativos en direcciones altas', () => {
    expect(ip('255.255.255.255')).toBe(4294967295);
    expect(ip('200.0.0.1')).toBeGreaterThan(0);
  });
});

describe('máscaras y prefijos CIDR', () => {
  it.each([
    [0, '0.0.0.0'],
    [1, '128.0.0.0'],
    [8, '255.0.0.0'],
    [20, '255.255.240.0'],
    [24, '255.255.255.0'],
    [26, '255.255.255.192'],
    [30, '255.255.255.252'],
    [31, '255.255.255.254'],
    [32, '255.255.255.255'],
  ])('/%i = %s', (prefix, mask) => {
    expect(formatIPv4(prefixToMask(prefix))).toBe(mask);
    expect(maskToPrefix(ip(mask))).toBe(prefix);
  });

  it('rechaza prefijos fuera de rango', () => {
    expect(() => prefixToMask(33)).toThrow();
    expect(() => prefixToMask(-1)).toThrow();
    expect(() => prefixToMask(24.5)).toThrow();
  });

  it('detecta máscaras no contiguas', () => {
    expect(maskToPrefix(ip('255.0.255.0'))).toBeNull();
    expect(maskToPrefix(ip('255.255.255.1'))).toBeNull();
  });
});

describe('calculateSubnet', () => {
  it('192.168.10.77/26', () => {
    const r = calc('192.168.10.77', 26);
    expect(formatIPv4(r.network)).toBe('192.168.10.64');
    expect(formatIPv4(r.broadcast!)).toBe('192.168.10.127');
    expect(formatIPv4(r.firstHost)).toBe('192.168.10.65');
    expect(formatIPv4(r.lastHost)).toBe('192.168.10.126');
    expect(formatIPv4(r.wildcard)).toBe('0.0.0.63');
    expect(r.totalAddresses).toBe(64);
    expect(r.usableHosts).toBe(62);
    expect(r.role).toBe('host');
    expect(r.kind).toBe('normal');
  });

  it('172.16.35.200/20', () => {
    const r = calc('172.16.35.200', 20);
    expect(formatIPv4(r.network)).toBe('172.16.32.0');
    expect(formatIPv4(r.broadcast!)).toBe('172.16.47.255');
    expect(r.usableHosts).toBe(4094);
  });

  it('/30: 2 hosts utilizables', () => {
    const r = calc('10.0.12.1', 30);
    expect(formatIPv4(r.network)).toBe('10.0.12.0');
    expect(formatIPv4(r.broadcast!)).toBe('10.0.12.3');
    expect(r.usableHosts).toBe(2);
  });

  it('/31: RFC 3021, ambas direcciones utilizables y sin broadcast', () => {
    const r = calc('10.0.12.1', 31);
    expect(r.kind).toBe('p2p31');
    expect(r.broadcast).toBeNull();
    expect(formatIPv4(r.firstHost)).toBe('10.0.12.0');
    expect(formatIPv4(r.lastHost)).toBe('10.0.12.1');
    expect(r.totalAddresses).toBe(2);
    expect(r.usableHosts).toBe(2);
    expect(r.role).toBe('host');
  });

  it('/32: una sola dirección de host', () => {
    const r = calc('1.1.1.1', 32);
    expect(r.kind).toBe('host32');
    expect(r.broadcast).toBeNull();
    expect(formatIPv4(r.firstHost)).toBe('1.1.1.1');
    expect(formatIPv4(r.lastHost)).toBe('1.1.1.1');
    expect(r.usableHosts).toBe(1);
  });

  it('/0: todo el espacio IPv4', () => {
    const r = calc('203.0.113.5', 0);
    expect(formatIPv4(r.network)).toBe('0.0.0.0');
    expect(formatIPv4(r.broadcast!)).toBe('255.255.255.255');
    expect(r.totalAddresses).toBe(2 ** 32);
    expect(r.usableHosts).toBe(2 ** 32 - 2);
  });

  it('identifica dirección de red y de broadcast', () => {
    expect(calc('192.168.1.0', 24).role).toBe('red');
    expect(calc('192.168.1.255', 24).role).toBe('broadcast');
  });

  it('privadas RFC 1918 y clase histórica', () => {
    expect(isPrivateIPv4(ip('10.200.1.1'))).toBe(true);
    expect(isPrivateIPv4(ip('172.31.255.255'))).toBe(true);
    expect(isPrivateIPv4(ip('172.32.0.1'))).toBe(false);
    expect(isPrivateIPv4(ip('192.168.0.1'))).toBe(true);
    expect(isPrivateIPv4(ip('8.8.8.8'))).toBe(false);
    expect(calc('10.0.0.1', 8).historicClass).toBe('A');
    expect(calc('172.16.0.1', 16).historicClass).toBe('B');
    expect(calc('192.168.0.1', 24).historicClass).toBe('C');
  });

  it('binario punteado', () => {
    expect(toDottedBinary(ip('192.168.1.10'))).toBe('11000000.10101000.00000001.00001010');
  });

  it('misma subred', () => {
    expect(sameSubnet(ip('192.168.1.10'), ip('192.168.1.200'), 24)).toBe(true);
    expect(sameSubnet(ip('192.168.1.10'), ip('192.168.2.10'), 24)).toBe(false);
    expect(sameSubnet(ip('192.168.1.10'), ip('192.168.1.200'), 25)).toBe(false);
  });
});

describe('parseSubnetInput', () => {
  it('acepta "ip" + "prefijo" y la forma ip/prefijo', () => {
    expect(parseSubnetInput('10.0.0.1', '8')).toEqual({ ok: true, value: { ip: ip('10.0.0.1'), prefix: 8 } });
    expect(parseSubnetInput('10.0.0.1/30', '')).toEqual({ ok: true, value: { ip: ip('10.0.0.1'), prefix: 30 } });
    expect(parseSubnetInput('10.0.0.1', '/16')).toEqual({ ok: true, value: { ip: ip('10.0.0.1'), prefix: 16 } });
  });

  it.each([
    ['', '24'],
    ['300.1.1.1', '24'],
    ['10.0.0.1', ''],
    ['10.0.0.1', '33'],
    ['10.0.0.1', '-1'],
    ['10.0.0.1', 'abc'],
    ['10.0.0.1', '24.5'],
    ['10.0.0.1/24/8', ''],
  ])('rechaza %j / %j con un mensaje', (a, b) => {
    const r = parseSubnetInput(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
  });
});
