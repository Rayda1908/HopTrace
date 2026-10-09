import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from '../store/networkStore';
import {
  topologyExportSchema,
  MAX_NODES,
  type AppNode,
  type AppEdge,
} from '../types/network';
import { TOPOLOGY_PRESETS } from '../lib/presets/topologyPresets';
import { autoLayoutNodes } from '../lib/layout/autoLayout';

describe('Theme, Presets, Layout & Workspace Export/Import', () => {
  beforeEach(() => {
    useNetworkStore.getState().clearCanvas();
  });

  describe('Topology Validation & Import/Export Schema', () => {
    const validTopology = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes: [
        {
          id: 'host-1',
          type: 'host',
          position: { x: 100, y: 150 },
          data: {
            label: 'Host-Alpha',
            deviceType: 'host',
            ip: '192.168.1.10',
            subnetMask: '255.255.255.0',
            cidr: 24,
            mac: '00:11:22:33:44:55',
            gateway: '192.168.1.1',
            status: 'online',
          },
        },
      ],
      edges: [],
    };

    it('validates legitimate topology export structures', () => {
      const result = topologyExportSchema.safeParse(validTopology);
      expect(result.success).toBe(true);
    });

    it('rejects topologies with invalid IPs or out-of-bounds CIDR', () => {
      const badIpTopology = {
        ...validTopology,
        nodes: [
          {
            ...validTopology.nodes[0],
            data: {
              ...validTopology.nodes[0].data,
              ip: '999.999.999.999',
            },
          },
        ],
      };
      expect(topologyExportSchema.safeParse(badIpTopology).success).toBe(false);

      const badCidrTopology = {
        ...validTopology,
        nodes: [
          {
            ...validTopology.nodes[0],
            data: {
              ...validTopology.nodes[0].data,
              cidr: 33,
            },
          },
        ],
      };
      expect(topologyExportSchema.safeParse(badCidrTopology).success).toBe(false);
    });

    it('rejects topologies exceeding MAX_NODES limit', () => {
      const excessiveNodes = Array.from({ length: MAX_NODES + 1 }).map((_, i) => ({
        id: `h-${i}`,
        type: 'host',
        position: { x: i * 10, y: 10 },
        data: {
          label: `Host-${i}`,
          deviceType: 'host',
          ip: '192.168.1.1',
          subnetMask: '255.255.255.0',
          cidr: 24,
          mac: '00:00:00:00:00:01',
          gateway: '',
          status: 'online',
        },
      }));

      const oversizedTopology = {
        ...validTopology,
        nodes: excessiveNodes,
      };
      expect(topologyExportSchema.safeParse(oversizedTopology).success).toBe(false);
    });
  });

  describe('Topology Presets', () => {
    it('instantiates Simple Switch LAN preset with correct subnets and links', () => {
      const store = useNetworkStore.getState();
      store.loadPreset('simple-switch');

      const current = useNetworkStore.getState();
      expect(current.nodes.length).toBe(3);
      expect(current.edges.length).toBe(2);

      const hosts = current.nodes.filter((n) => n.data.deviceType === 'host');
      const sw = current.nodes.find((n) => n.data.deviceType === 'switch');
      expect(hosts.length).toBe(2);
      expect(sw).toBeDefined();
    });

    it('instantiates Dual Routed Subnets preset with multi-interface router', () => {
      const store = useNetworkStore.getState();
      store.loadPreset('dual-routed');

      const current = useNetworkStore.getState();
      expect(current.nodes.length).toBe(4);
      expect(current.edges.length).toBe(3);

      const router = current.nodes.find((n) => n.data.deviceType === 'router');
      expect(router).toBeDefined();
      if (router && router.data.deviceType === 'router') {
        expect(router.data.interfaces.length).toBe(2);
      }
    });

    it('instantiates Unreachable Gateway preset', () => {
      const store = useNetworkStore.getState();
      store.loadPreset('unreachable-gateway');

      const current = useNetworkStore.getState();
      expect(current.nodes.length).toBe(4);
      const h1 = current.nodes.find((n) => n.id === 'host-1');
      expect(h1?.data.gateway).toBe('192.168.1.254');
    });
  });

  describe('Auto Layout / Tidy Engine', () => {
    it('calculates neat spaced column positions for active nodes', () => {
      const preset = TOPOLOGY_PRESETS['dual-routed'];
      const reordered = autoLayoutNodes(preset.nodes, preset.edges);

      expect(reordered.length).toBe(preset.nodes.length);
      // All nodes have numbers for x and y
      for (const node of reordered) {
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      }

      // X positions are positioned logically from left to right
      const xPositions = reordered.map((n) => n.position.x);
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      expect(maxX).toBeGreaterThan(minX);
    });
  });

  describe('Engineering Theme Switcher', () => {
    it('toggles theme state between obsidian and blueprint', () => {
      const store = useNetworkStore.getState();
      store.setTheme('blueprint');
      expect(useNetworkStore.getState().theme).toBe('blueprint');

      store.setTheme('obsidian');
      expect(useNetworkStore.getState().theme).toBe('obsidian');
    });
  });

  describe('Workspace Import & Clear Confirmation', () => {
    it('loads custom validated topology into workspace store', () => {
      const store = useNetworkStore.getState();
      const customNodes: AppNode[] = [
        {
          id: 'node-x',
          type: 'host',
          position: { x: 50, y: 50 },
          data: {
            label: 'Node-X',
            deviceType: 'host',
            ip: '10.10.10.10',
            subnetMask: '255.255.255.0',
            cidr: 24,
            mac: 'AA:BB:CC:DD:EE:FF',
            gateway: '',
            status: 'online',
          },
        },
      ];
      const customEdges: AppEdge[] = [];

      store.loadTopology(customNodes, customEdges);
      const current = useNetworkStore.getState();
      expect(current.nodes.length).toBe(1);
      expect(current.nodes[0].id).toBe('node-x');
    });

    it('toggles clear confirmation modal open state', () => {
      const store = useNetworkStore.getState();
      expect(store.isClearConfirmOpen).toBe(false);

      store.setIsClearConfirmOpen(true);
      expect(useNetworkStore.getState().isClearConfirmOpen).toBe(true);

      store.clearCanvas();
      expect(useNetworkStore.getState().isClearConfirmOpen).toBe(false);
    });
  });
});
