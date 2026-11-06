import type { Edge, Node } from '@xyflow/react';
import type { Device, Link } from '../../engine/types/network';
import type { Packet } from '../../engine/types/packet';
import type { Tone } from '../../engine/types/scenario';

export interface DeviceNodeData extends Record<string, unknown> {
  device: Device;
  /** IPs efectivas en este paso (pueden venir de DHCP). */
  addresses: string[];
  active: boolean;
  dimmed: boolean;
  selected: boolean;
  tone: Tone;
  /** PDU detenida en este dispositivo (encapsulación). */
  packet?: Packet;
  vlanColor?: string;
  onSelectDevice: (id: string) => void;
  onSelectPacket: (id: string) => void;
}

export interface LinkEdgeData extends Record<string, unknown> {
  link: Link;
  aLabel: string;
  bLabel: string;
  active: boolean;
  dimmed: boolean;
  tone: Tone;
  transit?: { packet: Packet; reverse: boolean };
  vlanColor?: string;
  animate: boolean;
  speed: number;
  onSelectPacket: (id: string) => void;
}

export type DeviceFlowNode = Node<DeviceNodeData, 'device'>;
export type LinkFlowEdge = Edge<LinkEdgeData, 'link'>;
