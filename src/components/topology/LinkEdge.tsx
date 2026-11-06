import { memo, type ReactNode } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { PDU_COLOR, TONE_COLOR } from '../shared/visuals';
import { packetKind } from '../../engine/types/packet';
import type { LinkFlowEdge } from './flowTypes';

/** Distancia desde el centro del dispositivo hasta la etiqueta de interfaz. */
const LABEL_OFFSET = 58;
/** Radio aproximado del icono: el trazo empieza fuera de él. */
const NODE_RADIUS = 34;

/**
 * Enlace recto entre dispositivos con etiquetas de interfaz en cada extremo.
 * Si en el paso viaja una PDU, un marcador recorre el enlace en el sentido
 * correcto y una etiqueta clicable abre el inspector de paquetes.
 */
function LinkEdgeComponent({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<LinkFlowEdge>) {
  if (!data) return null;
  // Los handles están arriba del nodo; el centro del icono está 32 px más abajo.
  const sx = sourceX;
  const sy = sourceY + 32;
  const tx = targetX;
  const ty = targetY + 32;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const x1 = sx + ux * NODE_RADIUS;
  const y1 = sy + uy * NODE_RADIUS;
  const x2 = tx - ux * NODE_RADIUS;
  const y2 = ty - uy * NODE_RADIUS;
  const path = `M ${x1} ${y1} L ${x2} ${y2}`;

  const isTrunk = data.link.kind === 'trunk';
  const isInternet = data.link.kind === 'internet';
  const baseColor = data.vlanColor ?? (isTrunk ? 'var(--muted)' : 'var(--line)');
  const color = data.active ? TONE_COLOR[data.tone] : baseColor;
  const transit = data.transit;
  const pduColor = transit ? PDU_COLOR[packetKind(transit.packet)] : color;
  const travel = 1.6 / Math.max(0.25, data.speed);

  const aPos = { x: sx + ux * LABEL_OFFSET, y: sy + uy * LABEL_OFFSET };
  const bPos = { x: tx - ux * LABEL_OFFSET, y: ty - uy * LABEL_OFFSET };
  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: isTrunk ? 4 : data.active ? 2.6 : 1.8,
          strokeDasharray: isInternet ? '6 6' : undefined,
          opacity: data.dimmed ? 0.3 : 1,
          transition: 'stroke 300ms, opacity 300ms',
        }}
      />
      {transit && data.animate && (
        <>
          <path d={path} fill="none" stroke={pduColor} strokeWidth={5} strokeLinecap="round" opacity={0.3} className={`edge-flow ${transit.reverse ? 'reverse' : ''}`} aria-hidden="true" />
          <rect x={-9} y={-6} width={18} height={12} rx={3} fill={pduColor} aria-hidden="true">
            <animateMotion dur={`${travel}s`} repeatCount="indefinite" path={path} keyPoints={transit.reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
          </rect>
        </>
      )}
      <EdgeLabelRenderer>
        <IfaceLabel x={aPos.x} y={aPos.y} text={data.aLabel} dimmed={data.dimmed} />
        <IfaceLabel x={bPos.x} y={bPos.y} text={data.bLabel} dimmed={data.dimmed} />
        {isTrunk && (
          <Floating x={mid.x} y={mid.y - (transit ? 26 : 0)}>
            <span className="rounded border border-line bg-panel px-1 font-mono text-[9px] text-muted">{data.link.label ?? 'trunk 802.1Q'}</span>
          </Floating>
        )}
        {!isTrunk && data.link.label && !transit && (
          <Floating x={mid.x} y={mid.y}>
            <span className="rounded border border-line bg-panel px-1 font-mono text-[9px] text-muted">{data.link.label}</span>
          </Floating>
        )}
        {transit && (
          <Floating x={mid.x} y={mid.y} interactive>
            <button
              type="button"
              onClick={() => data.onSelectPacket(transit.packet.id)}
              className="animate-fade-in cursor-pointer rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm"
              style={{ borderColor: pduColor, color: pduColor, background: 'var(--panel)' }}
              aria-label={`PDU en tránsito: ${transit.packet.label}. Inspeccionar.`}
            >
              {transit.reverse ? '← ' : ''}
              {transit.packet.label}
              {transit.reverse ? '' : ' →'}
            </button>
          </Floating>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

function Floating({ x, y, children, interactive }: { x: number; y: number; children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={`nodrag nopan absolute ${interactive ? '' : 'pointer-events-none'}`}
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: interactive ? 'all' : 'none', zIndex: interactive ? 20 : 5 }}
    >
      {children}
    </div>
  );
}

function IfaceLabel({ x, y, text, dimmed }: { x: number; y: number; text: string; dimmed: boolean }) {
  if (!text) return null;
  return (
    <Floating x={x} y={y}>
      <span className="rounded bg-app/85 px-1 font-mono text-[9.5px] text-muted" style={{ opacity: dimmed ? 0.4 : 1 }}>
        {text}
      </span>
    </Floating>
  );
}

export const LinkEdge = memo(LinkEdgeComponent);
