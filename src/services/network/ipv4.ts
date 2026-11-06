/**
 * Utilidades IPv4 puras. Las direcciones se manejan como enteros sin signo
 * de 32 bits (0 … 2^32-1). Se usa aritmética con `>>> 0` para evitar que
 * los operadores de bits de JavaScript produzcan números negativos.
 */

export type IPv4Number = number;

const OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** Convierte "192.168.1.10" en entero. Devuelve `null` si no es una IPv4 válida. */
export function parseIPv4(text: string): IPv4Number | null {
  const parts = text.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    // Rechaza vacíos, signos, espacios y ceros a la izquierda ("010").
    if (!OCTET.test(part)) return null;
    value = value * 256 + Number(part);
  }
  return value >>> 0;
}

export function formatIPv4(value: IPv4Number): string {
  const v = value >>> 0;
  return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
}

export function isValidPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
}

/** /24 → 255.255.255.0 (como entero). */
export function prefixToMask(prefix: number): IPv4Number {
  if (!isValidPrefix(prefix)) throw new RangeError(`Prefijo inválido: ${prefix}`);
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/** 255.255.255.0 → 24. Devuelve `null` si la máscara no es contigua. */
export function maskToPrefix(mask: IPv4Number): number | null {
  const m = mask >>> 0;
  const inverted = ~m >>> 0;
  // Una máscara válida tiene la forma 1…10…0: su complemento + 1 es potencia de 2.
  if ((inverted & (inverted + 1)) !== 0) return null;
  let bits = 0;
  for (let i = 31; i >= 0; i--) if ((m >>> i) & 1) bits++;
  return bits;
}

export function networkAddress(ip: IPv4Number, prefix: number): IPv4Number {
  return (ip & prefixToMask(prefix)) >>> 0;
}

export function isInNetwork(ip: IPv4Number, network: IPv4Number, prefix: number): boolean {
  return networkAddress(ip, prefix) === networkAddress(network, prefix);
}

export function sameSubnet(a: IPv4Number, b: IPv4Number, prefix: number): boolean {
  return networkAddress(a, prefix) === networkAddress(b, prefix);
}

/** 32 caracteres '0'/'1'. */
export function toBits(value: IPv4Number): string {
  return (value >>> 0).toString(2).padStart(32, '0');
}

/** "11000000.10101000.00000001.00001010" */
export function toDottedBinary(value: IPv4Number): string {
  const bits = toBits(value);
  return [0, 8, 16, 24].map((i) => bits.slice(i, i + 8)).join('.');
}

export type AddressKind = 'normal' | 'p2p31' | 'host32';
export type AddressRole = 'red' | 'broadcast' | 'host';

export interface SubnetResult {
  ip: IPv4Number;
  prefix: number;
  mask: IPv4Number;
  wildcard: IPv4Number;
  network: IPv4Number;
  /** `null` en /31 y /32: no existe dirección de broadcast. */
  broadcast: IPv4Number | null;
  firstHost: IPv4Number;
  lastHost: IPv4Number;
  totalAddresses: number;
  usableHosts: number;
  kind: AddressKind;
  /** Qué representa la dirección introducida dentro de su subred. */
  role: AddressRole;
  isPrivate: boolean;
  /** Clase histórica (solo informativa: el direccionamiento actual es sin clases). */
  historicClass: 'A' | 'B' | 'C' | 'D' | 'E';
}

export function calculateSubnet(ip: IPv4Number, prefix: number): SubnetResult {
  const mask = prefixToMask(prefix);
  const wildcard = ~mask >>> 0;
  const network = (ip & mask) >>> 0;
  const lastAddress = (network | wildcard) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);

  let kind: AddressKind = 'normal';
  let broadcast: IPv4Number | null = lastAddress;
  let firstHost = (network + 1) >>> 0;
  let lastHost = (lastAddress - 1) >>> 0;
  let usableHosts = totalAddresses - 2;

  if (prefix === 32) {
    // Una sola dirección: identifica un host concreto (loopbacks, rutas de host).
    kind = 'host32';
    broadcast = null;
    firstHost = network;
    lastHost = network;
    usableHosts = 1;
  } else if (prefix === 31) {
    // RFC 3021: enlaces punto a punto, ambas direcciones son utilizables.
    kind = 'p2p31';
    broadcast = null;
    firstHost = network;
    lastHost = lastAddress;
    usableHosts = 2;
  }

  let role: AddressRole = 'host';
  if (kind === 'normal') {
    if (ip === network) role = 'red';
    else if (ip === lastAddress) role = 'broadcast';
  }

  return {
    ip: ip >>> 0,
    prefix,
    mask,
    wildcard,
    network,
    broadcast,
    firstHost,
    lastHost,
    totalAddresses,
    usableHosts,
    kind,
    role,
    isPrivate: isPrivateIPv4(ip),
    historicClass: historicClass(ip),
  };
}

/** RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. */
export function isPrivateIPv4(ip: IPv4Number): boolean {
  return (
    isInNetwork(ip, 0x0a000000, 8) || isInNetwork(ip, 0xac100000, 12) || isInNetwork(ip, 0xc0a80000, 16)
  );
}

export function historicClass(ip: IPv4Number): SubnetResult['historicClass'] {
  const first = ip >>> 24;
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D';
  return 'E';
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Valida la entrada del usuario para la calculadora. */
export function parseSubnetInput(ipText: string, prefixText: string): ParseResult<{ ip: IPv4Number; prefix: number }> {
  let ipPart = ipText.trim();
  let prefixPart = prefixText.trim();

  // Permite escribir "10.0.0.1/8" en el campo de dirección.
  if (ipPart.includes('/')) {
    const [a = '', b = '', ...rest] = ipPart.split('/');
    if (rest.length > 0) return { ok: false, error: 'Formato inválido: usa una sola barra, por ejemplo 192.168.1.10/24.' };
    ipPart = a.trim();
    prefixPart = b.trim();
  }

  if (ipPart === '') return { ok: false, error: 'Escribe una dirección IPv4.' };
  const ip = parseIPv4(ipPart);
  if (ip === null) {
    return {
      ok: false,
      error: 'Dirección IPv4 inválida: deben ser 4 números de 0 a 255 separados por puntos, sin ceros a la izquierda.',
    };
  }
  if (prefixPart === '') return { ok: false, error: 'Escribe un prefijo entre 0 y 32.' };
  const cleaned = prefixPart.replace(/^\//, '');
  if (!/^\d{1,2}$/.test(cleaned)) return { ok: false, error: 'El prefijo debe ser un número entero entre 0 y 32.' };
  const prefix = Number(cleaned);
  if (!isValidPrefix(prefix)) return { ok: false, error: 'El prefijo debe estar entre 0 y 32.' };
  return { ok: true, value: { ip, prefix } };
}

/** Formatea un número grande con separador de miles en español. */
export function formatCount(n: number): string {
  return n.toLocaleString('es-MX');
}
