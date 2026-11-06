import { memo, type CSSProperties } from 'react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { DeviceIcon, PDU_COLOR, TONE_COLOR } from '../shared/visuals';
import { packetKind } from '../../engine/types/packet';
import type { DeviceFlowNode } from './flowTypes';

const ICON_COLOR = {
  pc: 'var(--accent)',
  server: 'var(--ok)',
  switch: 'var(--cyan)',
  router: 'var(--orange)',
  cloud: 'var(--muted)',
} as const;

function DeviceNodeComponent({ data }: NodeProps<DeviceFlowNode>) {
  const { device } = data;
  const toneColor = TONE_COLOR[data.tone];
  const style = {
    '--pulse-color': toneColor,
    borderColor: data.active ? toneColor : data.selected ? 'var(--accent)' : data.vlanColor ?? 'var(--line)',
    opacity: data.dimmed ? 0.4 : 1,
  } as CSSProperties;

  return (
    <div className="relative flex w-[132px] flex-col items-center" data-testid={`device-${device.id}`}>
      {/* Handle central: los enlaces se dibujan de centro a centro. */}
      <Handle type="source" position={Position.Top} id="c" className="device-handle" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="c" className="device-handle" isConnectable={false} />

      <button
        type="button"
        onClick={() => data.onSelectDevice(device.id)}
        aria-pressed={data.selected}
        aria-label={`${device.hostname} (${device.type})${data.active ? ', activo en este paso' : ''}. Inspeccionar dispositivo.`}
        className={`nodrag nopan flex size-[64px] cursor-pointer items-center justify-center rounded-2xl border-2 bg-panel transition-[opacity,border-color] duration-300 ${data.active ? 'node-active' : ''}`}
        style={{ ...style, color: ICON_COLOR[device.type] }}
      >
        <DeviceIcon type={device.type} size={30} />
      </button>

      <div className="mt-1.5 text-center" style={{ opacity: data.dimmed ? 0.5 : 1 }}>
        <p className="text-[12px] leading-tight font-semibold text-fg">{device.hostname}</p>
        {data.addresses.map((a) => (
          <p key={a} className="font-mono text-[10px] leading-tight text-muted">
            {a}
          </p>
        ))}
        {device.caption && <p className="text-[10px] leading-tight text-muted italic">{device.caption}</p>}
      </div>

      {data.packet && (
        <button
          type="button"
          onClick={() => data.onSelectPacket(data.packet!.id)}
          className="nodrag nopan animate-fade-in absolute -top-8 left-1/2 -translate-x-1/2 cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm"
          style={{ borderColor: PDU_COLOR[packetKind(data.packet)], color: PDU_COLOR[packetKind(data.packet)], background: 'var(--panel)' }}
          aria-label={`PDU en ${device.hostname}: ${data.packet.label}. Inspeccionar.`}
        >
          {data.packet.label}
        </button>
      )}
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeComponent);
