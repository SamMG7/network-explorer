import { type RefObject, useEffect, useMemo, useRef } from 'react';
import { Background, BackgroundVariant, Controls, type EdgeTypes, type NodeTypes, ReactFlow, useReactFlow } from '@xyflow/react';
import type { TopologyStep, Track } from '../../engine/types/scenario';
import type { NetworkSnapshot } from '../../engine/simulation/snapshot';
import type { Theme } from '../../hooks/useTheme';
import { DeviceNode } from './DeviceNode';
import { LinkEdge } from './LinkEdge';
import { buildTopology, type TopologyOptions } from './buildTopology';

const nodeTypes: NodeTypes = { device: DeviceNode };
const edgeTypes: EdgeTypes = { link: LinkEdge };
const FIT = { padding: 0.22, maxZoom: 1.25 } as const;

interface TopologyCanvasProps extends Omit<TopologyOptions, never> {
  track: Track;
  step: TopologyStep | undefined;
  snapshot: NetworkSnapshot;
  theme: Theme;
  label: string;
}

export function TopologyCanvas({ track, step, snapshot, theme, label, ...options }: TopologyCanvasProps) {
  const { selectedDeviceId, vlan, vlanColors, animate, speed, onSelectDevice, onSelectPacket } = options;
  const { nodes, edges } = useMemo(
    () => buildTopology(track, step, snapshot, { selectedDeviceId, vlan, vlanColors, animate, speed, onSelectDevice, onSelectPacket }),
    [track, step, snapshot, selectedDeviceId, vlan, vlanColors, animate, speed, onSelectDevice, onSelectPacket],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="h-full w-full" role="region" aria-label={`Topología: ${label}. Usa la rueda o los controles para hacer zoom.`}>
      <ReactFlow
        key={track.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={FIT}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} />
        <Controls showInteractive={false} position="bottom-left" aria-label="Controles de zoom" />
        <FitOnResize containerRef={containerRef} />
      </ReactFlow>
    </div>
  );
}

function FitOnResize({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const { fitView } = useReactFlow();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => void fitView(FIT), 150);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [fitView, containerRef]);
  return null;
}
