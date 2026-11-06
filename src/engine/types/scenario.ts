import type { Device, Link } from './network';
import type { Packet } from './packet';
import type { NatProtocol } from '../../services/network/nat';

export type Tone = 'info' | 'ok' | 'warn' | 'deny';
export type Difficulty = 'básico' | 'intermedio' | 'avanzado';
export type OsiLayer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Áreas del temario CCNA 200-301. */
export type CcnaCategoryId = 'fundamentos' | 'acceso' | 'conectividad-ip' | 'servicios-ip';

// ------------------------------------------------------------------ eventos
/**
 * Eventos de estado. El estado de cada paso se RECONSTRUYE aplicando, en orden,
 * los eventos de todos los pasos hasta el actual (ver engine/simulation/snapshot.ts).
 */
export type SimEvent =
  | { type: 'mac-learn'; device: string; vlan: number; mac: string; port: string }
  | { type: 'arp-set'; device: string; ip: string; mac: string }
  | { type: 'nat-translate'; device: string; protocol: NatProtocol; srcIp: string; srcPort: number; dstIp: string; dstPort: number }
  | { type: 'ip-assign'; device: string; iface: string; ip: string; prefix: number; gateway: string; dns: string }
  | { type: 'dhcp-bind'; device: string; ip: string; mac: string; leaseSeconds: number };

// ---------------------------------------------------------------- decisiones
/**
 * Decisión que toma un dispositivo en el paso. No es texto fijo: el motor la
 * CALCULA con la lógica de red y el estado del paso. `expect` se verifica en
 * las pruebas para garantizar que el guion del escenario coincide con la lógica.
 */
export type StepDecision =
  | { kind: 'local-or-remote'; device: string; dstIp: string; expect: 'local' | 'remote' }
  | { kind: 'arp-lookup'; device: string; ip: string; expect: 'hit' | 'miss' }
  | { kind: 'switch-forward'; device: string; inPort: string; vlan: number; dstMac: string; expect: { action: 'flood'; ports: string[] } | { action: 'forward'; port: string } | { action: 'filter' } }
  | { kind: 'route-lookup'; device: string; dstIp: string; expect: { iface: string; nextHop?: string } | 'drop' }
  | { kind: 'nat-out'; device: string; protocol: NatProtocol; srcIp: string; srcPort: number; dstIp: string; dstPort: number; expect: { insideGlobal: string } }
  | { kind: 'nat-in'; device: string; protocol: NatProtocol; srcIp: string; srcPort: number; dstIp: string; dstPort: number; expect: { insideLocal: string } | 'drop' };

// --------------------------------------------------------------------- pasos
export interface Transit {
  link: string;
  /** Sentido b → a del enlace. */
  reverse?: boolean;
  packet: Packet;
  tone?: Tone;
}

export interface EducationalStep {
  id: string;
  title: string;
  /** ¿Qué ocurre? */
  what: string;
  /** ¿Por qué ocurre? */
  why: string;
  /** Protocolo que interviene. */
  protocol: string;
  /** Capas OSI involucradas. */
  layers: OsiLayer[];
  /** Id del dispositivo que procesa la información (o etiqueta libre). */
  device: string;
  /** ¿Qué decide el dispositivo? (explicación) */
  decisionText: string;
  /** Resultado del paso. */
  result: string;
  /** ¿Qué pasaría con un error de configuración? */
  misconfig: string;
  /** Ids del glosario. */
  concepts: string[];
  durationMs: number;
  tone?: Tone;
  simplification?: string;
}

export interface TopologyStep extends EducationalStep {
  activeDevices: string[];
  activeLinks?: Array<{ id: string; tone?: Tone }>;
  /** PDUs que viajan por enlaces en este paso (copias en caso de inundación). */
  transits?: Transit[];
  /** PDU detenida en un dispositivo (encapsulación/desencapsulación). */
  packetAt?: { device: string; packet: Packet };
  events?: SimEvent[];
  decision?: StepDecision;
  /** Capa resaltada en el diagrama OSI/TCP-IP (escenario de encapsulación). */
  stackLayer?: OsiLayer;
  /** Muestra la tabla resumen por salto (escenario de routing). */
  hopSummary?: boolean;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  devices: Device[];
  links: Link[];
  steps: TopologyStep[];
}

interface ScenarioBase {
  id: string;
  title: string;
  summary: string;
  category: CcnaCategoryId;
  difficulty: Difficulty;
  /** Temas del examen 200-301 relacionados (referencia informativa). */
  examTopics: string[];
  estimatedMinutes: number;
  objectives: string[];
  simplifications: string[];
}

export interface TopologyScenario extends ScenarioBase {
  kind: 'topology';
  tracks: Track[];
  /** Muestra el selector de VLAN. */
  vlanFilter?: Array<{ id: number; name: string; color: string }>;
  /** Muestra el diagrama de capas OSI/TCP-IP. */
  showStack?: boolean;
}

export interface SubnettingScenario extends ScenarioBase {
  kind: 'subnetting';
  examples: Array<{ label: string; ip: string; prefix: number; note: string }>;
}

export type Scenario = TopologyScenario | SubnettingScenario;

export interface CcnaCategory {
  id: CcnaCategoryId;
  label: string;
}
