import type { Route } from '../../services/network/routing';
import type { ArpEntry } from '../../services/network/arp';
import type { MacEntry } from '../../services/network/switching';
import type { PatConfig } from '../../services/network/nat';

export type DeviceType = 'pc' | 'server' | 'switch' | 'router' | 'cloud';

export interface Interface {
  /** Nombre como en IOS: Fa0/1, G0/0… o "NIC" en hosts. */
  name: string;
  /** Formato Cisco: 0050.7966.6801 */
  mac?: string;
  ip?: string;
  prefix?: number;
  /** Puertos de switch. */
  mode?: 'access' | 'trunk';
  vlan?: number;
  allowed?: number[];
  native?: number;
  /** Rol NAT de una interfaz de router. */
  nat?: 'inside' | 'outside';
  description?: string;
}

export interface DhcpPool {
  name: string;
  network: string;
  prefix: number;
  defaultRouter: string;
  dns: string;
  leaseSeconds: number;
  excluded: string;
}

export interface Device {
  id: string;
  type: DeviceType;
  hostname: string;
  position: { x: number; y: number };
  interfaces: Interface[];
  gateway?: string;
  dns?: string;
  /** Configuración IPv4 obtenida por DHCP (el cliente empieza sin IP). */
  dhcpClient?: boolean;
  routes?: Route[];
  vlans?: Array<{ id: number; name: string }>;
  pat?: PatConfig & { acl: string };
  dhcpPool?: DhcpPool;
  /** Tablas iniciales (antes del primer paso). */
  initialArp?: ArpEntry[];
  initialMac?: MacEntry[];
  initialDhcpBindings?: Array<{ ip: string; mac: string; leaseSeconds: number }>;
  /** Nota breve visible en el canvas (p. ej. "Servidor web :80"). */
  caption?: string;
}

export interface LinkEnd {
  device: string;
  iface: string;
}

export interface Link {
  id: string;
  a: LinkEnd;
  b: LinkEnd;
  /** Tipo lógico del enlace para estilo y validaciones. */
  kind: 'access' | 'trunk' | 'routed' | 'internet';
  label?: string;
}
