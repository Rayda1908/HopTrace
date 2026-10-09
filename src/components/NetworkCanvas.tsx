import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  type Connection,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useNetworkStore } from '../store/networkStore';
import { nodeTypes } from './nodes';

export const NetworkCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    simulationResult,
    activePathEdgeId,
    isSimulating,
  } = useNetworkStore();

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes && selectedNodes.length > 0) {
        setSelectedNodeId(selectedNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
    [setSelectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      // Prevent self-connection
      if (connection.source === connection.target) {
        return false;
      }
      const srcH = connection.sourceHandle ?? null;
      const tgtH = connection.targetHandle ?? null;

      // Prevent duplicate edge between same handle pair
      return !edges.some((e) => {
        const eSrcH = e.sourceHandle ?? null;
        const eTgtH = e.targetHandle ?? null;
        const sameDirect =
          e.source === connection.source &&
          e.target === connection.target &&
          eSrcH === srcH &&
          eTgtH === tgtH;
        const sameReverse =
          e.source === connection.target &&
          e.target === connection.source &&
          eSrcH === tgtH &&
          eTgtH === srcH;
        const unhandledDuplicate =
          srcH === null &&
          tgtH === null &&
          ((e.source === connection.source && e.target === connection.target) ||
           (e.source === connection.target && e.target === connection.source));
        return sameDirect || sameReverse || unhandledDuplicate;
      });
    },
    [edges]
  );

  const theme = useNetworkStore((state) => state.theme);
  const isBlueprint = theme === 'blueprint';

  const renderedEdges = React.useMemo(() => {
    if (!simulationResult) {
      return edges.map((e) => ({
        ...e,
        style: {
          ...e.style,
          stroke: isBlueprint ? '#3b82f6' : '#52525b',
          strokeWidth: 2,
          vectorEffect: 'non-scaling-stroke' as const,
        },
      }));
    }

    return edges.map((edge) => {
      const isTraversing = edge.id === activePathEdgeId;
      const isPartOfPath = simulationResult.pathEdgeIds.includes(edge.id);

      if (isTraversing) {
        return {
          ...edge,
          animated: true,
          style: {
            stroke: simulationResult.status === 'success' ? '#10b981' : '#f43f5e',
            strokeWidth: 3,
            vectorEffect: 'non-scaling-stroke' as const,
          },
        };
      }

      if (isPartOfPath) {
        return {
          ...edge,
          animated: true,
          style: {
            stroke: simulationResult.status === 'success' ? '#38bdf8' : '#f43f5e',
            strokeWidth: 2.5,
            vectorEffect: 'non-scaling-stroke' as const,
          },
        };
      }

      return {
        ...edge,
        animated: false,
        style: {
          ...edge.style,
          stroke: '#27272a',
          opacity: isSimulating ? 0.35 : 0.6,
          vectorEffect: 'non-scaling-stroke' as const,
        },
      };
    });
  }, [edges, simulationResult, activePathEdgeId, isSimulating, isBlueprint]);

  return (
    <div
      className={`w-full h-full relative overflow-hidden select-none transition-colors duration-300 ${
        isBlueprint ? 'bg-[#0a1128]' : 'bg-[#09090b]'
      }`}
    >
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2.0}
        connectionRadius={35}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: isBlueprint ? '#60a5fa' : '#71717a',
          strokeWidth: 2,
          strokeDasharray: '4,4',
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: isBlueprint ? '#60a5fa' : '#52525b',
            strokeWidth: 2,
            vectorEffect: 'non-scaling-stroke' as const,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color={isBlueprint ? '#1e3a8a' : '#27272a'}
          className="bg-transparent"
        />
        <Controls
          showInteractive={false}
          position="top-left"
          style={{ marginTop: '72px', marginLeft: '12px' }}
          className="!bg-zinc-900 !border !border-zinc-800 !rounded-xl !shadow-xl overflow-hidden [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-800"
        />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(n) => {
            if (n.type === 'host') return '#10b981';
            if (n.type === 'switch') return '#6366f1';
            if (n.type === 'router') return '#f59e0b';
            return '#71717a';
          }}
          maskColor="rgba(9, 9, 11, 0.75)"
          className="!bg-zinc-950 !border !border-zinc-800 !rounded-xl !shadow-xl overflow-hidden hidden md:block"
        />
      </ReactFlow>
    </div>
  );
};
