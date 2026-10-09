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
      if (connection.source === connection.target) {
        return false;
      }
      return !edges.some(
        (e) =>
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source)
      );
    },
    [edges]
  );

  const renderedEdges = React.useMemo(() => {
    if (!simulationResult) return edges;

    return edges.map((edge) => {
      const isTraversing = edge.id === activePathEdgeId;
      const isPartOfPath = simulationResult.pathEdgeIds.includes(edge.id);

      if (isTraversing) {
        return {
          ...edge,
          animated: true,
          style: {
            stroke: simulationResult.status === 'success' ? '#10b981' : '#f43f5e',
            strokeWidth: 4,
            filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.9))',
          },
        };
      }

      if (isPartOfPath) {
        return {
          ...edge,
          animated: true,
          style: {
            stroke: simulationResult.status === 'success' ? '#38bdf8' : '#f43f5e',
            strokeWidth: 3,
            filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))',
          },
        };
      }

      return {
        ...edge,
        animated: false,
        style: {
          ...edge.style,
          stroke: '#3f3f46',
          opacity: isSimulating ? 0.25 : 0.6,
        },
      };
    });
  }, [edges, simulationResult, activePathEdgeId, isSimulating]);

  const theme = useNetworkStore((state) => state.theme);
  const isBlueprint = theme === 'blueprint';

  return (
    <div
      className={`w-full h-full relative overflow-hidden select-none transition-colors duration-300 ${
        isBlueprint ? 'bg-[#0a1128]' : 'bg-zinc-950'
      }`}
    >
      {/* Subtle ambient radial glow mesh layer */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ${
          isBlueprint
            ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.16),rgba(30,58,138,0.06),rgba(0,0,0,0))]'
            : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),rgba(255,255,255,0))]'
        }`}
      />

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
        maxZoom={2.5}
        connectionRadius={35}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: isBlueprint ? '#60a5fa' : '#38bdf8',
          strokeWidth: 2.5,
          strokeDasharray: '5,5',
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: isBlueprint ? '#60a5fa' : '#38bdf8', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          size={1}
          color={isBlueprint ? '#1e3a8a' : '#27272a'}
          className="bg-transparent"
        />
        <Controls
          showInteractive={false}
          className="!bg-zinc-900/90 !backdrop-blur-md !border !border-zinc-800 !rounded-xl !shadow-2xl overflow-hidden [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-800"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            if (n.type === 'host') return '#10b981';
            if (n.type === 'switch') return '#6366f1';
            if (n.type === 'router') return '#f59e0b';
            return '#71717a';
          }}
          maskColor="rgba(9, 9, 11, 0.75)"
          className="!bg-zinc-950/90 !backdrop-blur-md !border !border-zinc-800 !rounded-xl !shadow-xl overflow-hidden hidden md:block"
        />
      </ReactFlow>
    </div>
  );
};
