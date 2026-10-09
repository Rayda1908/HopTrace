import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import {
  type AppNode,
  type AppEdge,
  type DeviceType,
  type DeviceNodeData,
  type PresetType,
  MAX_NODES,
  MAX_EDGES,
} from '../types/network';
import {
  simulatePing,
  type SimulationResult,
} from '../lib/simulator/routingEngine';
import { TOPOLOGY_PRESETS } from '../lib/presets/topologyPresets';
import { autoLayoutNodes } from '../lib/layout/autoLayout';

export type EngineeringTheme = 'obsidian' | 'blueprint';

export interface NetworkState {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeId: string | null;
  theme: EngineeringTheme;
  isClearConfirmOpen: boolean;
  isGuideOpen: boolean;
  isPingModalOpen: boolean;
  isInspectorOpen: boolean;
  simulationResult: SimulationResult | null;
  activePathEdgeId: string | null;
  activePathNodeId: string | null;
  isSimulating: boolean;
  counts: {
    host: number;
    switch: number;
    router: number;
  };

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: DeviceType, position?: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  updateNodeData: (id: string, partial: Partial<DeviceNodeData>) => void;
  setSelectedNodeId: (id: string | null) => void;
  setTheme: (theme: EngineeringTheme) => void;
  setIsClearConfirmOpen: (open: boolean) => void;
  setIsGuideOpen: (open: boolean) => void;
  setIsPingModalOpen: (open: boolean) => void;
  setIsInspectorOpen: (open: boolean) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  runPingSimulation: (sourceId: string, destId: string) => SimulationResult;
  loadPreset: (presetId: PresetType) => void;
  autoLayout: () => void;
  loadTopology: (nodes: AppNode[], edges: AppEdge[]) => void;
  clearCanvas: () => void;
}

const formatHexByte = (val: number): string =>
  val.toString(16).padStart(2, '0').toUpperCase();

const initialNodes: AppNode[] = [
  {
    id: 'host-1',
    type: 'host',
    position: { x: 120, y: 220 },
    data: {
      label: 'Host-1',
      deviceType: 'host',
      ip: '192.168.1.10',
      subnetMask: '255.255.255.0',
      cidr: 24,
      mac: '00:1A:2B:3C:4D:01',
      gateway: '192.168.1.1',
      status: 'online',
    },
  },
  {
    id: 'switch-1',
    type: 'switch',
    position: { x: 420, y: 220 },
    data: {
      label: 'Switch-1',
      deviceType: 'switch',
      mac: '00:1A:2B:3C:5E:01',
      ports: 8,
      status: 'online',
    },
  },
  {
    id: 'router-1',
    type: 'router',
    position: { x: 720, y: 220 },
    data: {
      label: 'Router-1',
      deviceType: 'router',
      mac: '00:1A:2B:3C:6F:01',
      interfaces: [
        {
          id: 'iface-1',
          name: 'eth0',
          ip: '192.168.1.1',
          cidr: 24,
          mac: '00:1A:2B:3C:6F:1A',
        },
        {
          id: 'iface-2',
          name: 'eth1',
          ip: '10.0.0.1',
          cidr: 24,
          mac: '00:1A:2B:3C:6F:1B',
        },
      ],
      status: 'online',
    },
  },
  {
    id: 'host-2',
    type: 'host',
    position: { x: 1020, y: 220 },
    data: {
      label: 'Host-2',
      deviceType: 'host',
      ip: '10.0.0.10',
      subnetMask: '255.255.255.0',
      cidr: 24,
      mac: '00:1A:2B:3C:4D:02',
      gateway: '10.0.0.1',
      status: 'online',
    },
  },
];

const initialEdges: AppEdge[] = [
  {
    id: 'edge-host1-switch1',
    source: 'host-1',
    target: 'switch-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  },
  {
    id: 'edge-switch1-router1',
    source: 'switch-1',
    target: 'router-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#818cf8', strokeWidth: 2 },
  },
  {
    id: 'edge-router1-host2',
    source: 'router-1',
    target: 'host-2',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  },
];

const getInitialTheme = (): EngineeringTheme => {
  try {
    const saved = localStorage.getItem('hoptrace_theme');
    if (saved === 'blueprint' || saved === 'obsidian') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'obsidian';
};

const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme);
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  theme: initialTheme,
  isClearConfirmOpen: false,
  isGuideOpen: false,
  isPingModalOpen: false,
  isInspectorOpen: false,
  simulationResult: null,
  activePathEdgeId: null,
  activePathNodeId: null,
  isSimulating: false,
  counts: {
    host: 2,
    switch: 1,
    router: 1,
  },

  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    const { edges } = get();
    if (edges.length >= MAX_EDGES) {
      return;
    }
    if (connection.source === connection.target) {
      return;
    }
    const exists = edges.some(
      (e) =>
        (e.source === connection.source && e.target === connection.target) ||
        (e.source === connection.target && e.target === connection.source)
    );
    if (exists) {
      return;
    }

    const newEdge: AppEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    };

    set({
      edges: addEdge(newEdge, edges),
    });
  },

  addNode: (type: DeviceType, position?: { x: number; y: number }) => {
    const { nodes, counts } = get();
    if (nodes.length >= MAX_NODES) {
      return;
    }

    const nextCount = counts[type] + 1;
    const offsetIndex = nodes.length % 8;
    const defaultPosition = position ?? {
      x: 200 + offsetIndex * 60,
      y: 150 + offsetIndex * 50,
    };

    let newNode: AppNode;

    if (type === 'host') {
      const hostByte = nextCount + 9;
      newNode = {
        id: `host-${Date.now()}`,
        type: 'host',
        position: defaultPosition,
        data: {
          label: `Host-${nextCount}`,
          deviceType: 'host',
          ip: `192.168.1.${hostByte}`,
          subnetMask: '255.255.255.0',
          cidr: 24,
          mac: `00:1A:2B:3C:4D:${formatHexByte(nextCount)}`,
          gateway: '192.168.1.1',
          status: 'online',
        },
      };
    } else if (type === 'switch') {
      newNode = {
        id: `switch-${Date.now()}`,
        type: 'switch',
        position: defaultPosition,
        data: {
          label: `Switch-${nextCount}`,
          deviceType: 'switch',
          mac: `00:1A:2B:3C:5E:${formatHexByte(nextCount)}`,
          ports: 8,
          status: 'online',
        },
      };
    } else {
      newNode = {
        id: `router-${Date.now()}`,
        type: 'router',
        position: defaultPosition,
        data: {
          label: `Router-${nextCount}`,
          deviceType: 'router',
          mac: `00:1A:2B:3C:6F:${formatHexByte(nextCount)}`,
          interfaces: [
            {
              id: `iface-${Date.now()}-1`,
              name: 'eth0',
              ip: `192.168.${nextCount}.1`,
              cidr: 24,
              mac: `00:1A:2B:3C:6F:${formatHexByte(nextCount + 10)}`,
            },
            {
              id: `iface-${Date.now()}-2`,
              name: 'eth1',
              ip: `10.${nextCount}.0.1`,
              cidr: 24,
              mac: `00:1A:2B:3C:6F:${formatHexByte(nextCount + 20)}`,
            },
          ],
          status: 'online',
        },
      };
    }

    set({
      nodes: [...nodes, newNode],
      counts: {
        ...counts,
        [type]: nextCount,
      },
    });
  },

  removeNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  removeEdge: (id: string) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    }));
  },

  updateNodeData: (id: string, partial: Partial<DeviceNodeData>) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...partial,
            } as DeviceNodeData,
          };
        }
        return node;
      }),
    }));
  },

  setSelectedNodeId: (id: string | null) => {
    set((state) => ({
      selectedNodeId: id,
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: id !== null ? node.id === id : false,
      })),
    }));
  },

  setIsGuideOpen: (open: boolean) => {
    set({ isGuideOpen: open });
  },

  setIsPingModalOpen: (open: boolean) => {
    set({ isPingModalOpen: open });
  },

  setIsInspectorOpen: (open: boolean) => {
    set({ isInspectorOpen: open });
  },

  setSimulationResult: (result: SimulationResult | null) => {
    set({ simulationResult: result });
  },

  runPingSimulation: (sourceId: string, destId: string) => {
    const { nodes, edges } = get();
    const simNodes = nodes.map((n) => ({
      id: n.id,
      data: n.data,
    }));
    const simEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    const result = simulatePing(sourceId, destId, simNodes, simEdges);
    set({
      simulationResult: result,
      isInspectorOpen: true,
      isSimulating: true,
      activePathEdgeId: null,
      activePathNodeId: sourceId,
    });

    if (result.pathEdgeIds.length > 0) {
      let currentHop = 0;
      const interval = setInterval(() => {
        if (currentHop < result.pathEdgeIds.length) {
          const edgeId = result.pathEdgeIds[currentHop];
          const nextNodeId = result.pathNodeIds[currentHop + 1] || null;
          set({
            activePathEdgeId: edgeId,
            activePathNodeId: nextNodeId,
          });
          currentHop++;
        } else {
          clearInterval(interval);
          set({
            isSimulating: false,
            activePathEdgeId: null,
            activePathNodeId: null,
          });
        }
      }, 500);
    } else {
      set({
        isSimulating: false,
        activePathNodeId: null,
      });
    }

    return result;
  },

  setTheme: (theme: EngineeringTheme) => {
    try {
      localStorage.setItem('hoptrace_theme', theme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {
      // Ignore storage errors
    }
    set({ theme });
  },

  setIsClearConfirmOpen: (open: boolean) => {
    set({ isClearConfirmOpen: open });
  },

  loadPreset: (presetId: PresetType) => {
    const preset = TOPOLOGY_PRESETS[presetId];
    if (!preset) return;

    let hostCount = 0;
    let switchCount = 0;
    let routerCount = 0;
    for (const n of preset.nodes) {
      if (n.data.deviceType === 'host') hostCount++;
      if (n.data.deviceType === 'switch') switchCount++;
      if (n.data.deviceType === 'router') routerCount++;
    }

    set({
      nodes: preset.nodes,
      edges: preset.edges,
      selectedNodeId: null,
      simulationResult: null,
      activePathEdgeId: null,
      activePathNodeId: null,
      isSimulating: false,
      isInspectorOpen: false,
      counts: {
        host: hostCount,
        switch: switchCount,
        router: routerCount,
      },
    });
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    const organized = autoLayoutNodes(nodes, edges);
    set({ nodes: organized });
  },

  loadTopology: (nodes: AppNode[], edges: AppEdge[]) => {
    let hostCount = 0;
    let switchCount = 0;
    let routerCount = 0;
    for (const n of nodes) {
      if (n.data.deviceType === 'host') hostCount++;
      if (n.data.deviceType === 'switch') switchCount++;
      if (n.data.deviceType === 'router') routerCount++;
    }

    set({
      nodes,
      edges,
      selectedNodeId: null,
      simulationResult: null,
      activePathEdgeId: null,
      activePathNodeId: null,
      isSimulating: false,
      isInspectorOpen: false,
      counts: {
        host: hostCount,
        switch: switchCount,
        router: routerCount,
      },
    });
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      simulationResult: null,
      activePathEdgeId: null,
      activePathNodeId: null,
      isSimulating: false,
      isInspectorOpen: false,
      isClearConfirmOpen: false,
    });
  },
}));
