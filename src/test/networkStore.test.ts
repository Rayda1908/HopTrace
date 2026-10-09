import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from '../store/networkStore';
import {
  ipv4Schema,
  macSchema,
  cidrSchema,
  MAX_NODES,
  type RouterNodeData,
} from '../types/network';

describe('Network Topology Validation & Store', () => {
  beforeEach(() => {
    useNetworkStore.getState().clearCanvas();
  });

  describe('Zod Schema Validation', () => {
    it('validates strictly valid IPv4 addresses and rejects leading zeroes or out-of-range octets', () => {
      expect(ipv4Schema.safeParse('192.168.1.1').success).toBe(true);
      expect(ipv4Schema.safeParse('10.0.0.1').success).toBe(true);
      expect(ipv4Schema.safeParse('255.255.255.255').success).toBe(true);
      expect(ipv4Schema.safeParse('0.0.0.0').success).toBe(true);

      // Rejections
      expect(ipv4Schema.safeParse('01.1.1.1').success).toBe(false);
      expect(ipv4Schema.safeParse('192.168.01.1').success).toBe(false);
      expect(ipv4Schema.safeParse('256.0.0.1').success).toBe(false);
      expect(ipv4Schema.safeParse('invalid-ip').success).toBe(false);
    });

    it('validates strictly valid MAC addresses', () => {
      expect(macSchema.safeParse('00:1A:2B:3C:4D:01').success).toBe(true);
      expect(macSchema.safeParse('aa:bb:cc:dd:ee:ff').success).toBe(true);

      // Rejections
      expect(macSchema.safeParse('00:1A:2B:3C:4D').success).toBe(false);
      expect(macSchema.safeParse('00:1G:2B:3C:4D:01').success).toBe(false);
    });

    it('validates strictly integer CIDR between 0 and 32', () => {
      expect(cidrSchema.safeParse(0).success).toBe(true);
      expect(cidrSchema.safeParse(24).success).toBe(true);
      expect(cidrSchema.safeParse(32).success).toBe(true);

      expect(cidrSchema.safeParse(-1).success).toBe(false);
      expect(cidrSchema.safeParse(33).success).toBe(false);
      expect(cidrSchema.safeParse(24.5).success).toBe(false);
    });
  });

  describe('Zustand networkStore', () => {
    it('spawns Host node with default IP and MAC values', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');

      const updated = useNetworkStore.getState().nodes;
      expect(updated.length).toBe(1);
      const host = updated[0];
      expect(host.type).toBe('host');
      expect(host.data.deviceType).toBe('host');
      expect(host.data.label).toMatch(/^Host-/);
      expect(ipv4Schema.safeParse(host.data.ip).success).toBe(true);
      expect(macSchema.safeParse(host.data.mac).success).toBe(true);
    });

    it('spawns Switch node with MAC and port indicators', () => {
      const store = useNetworkStore.getState();
      store.addNode('switch');

      const updated = useNetworkStore.getState().nodes;
      expect(updated.length).toBe(1);
      const sw = updated[0];
      expect(sw.type).toBe('switch');
      expect(sw.data.deviceType).toBe('switch');
      expect(sw.data.label).toMatch(/^Switch-/);
      expect(macSchema.safeParse(sw.data.mac).success).toBe(true);
      expect(sw.data.ports).toBe(8);
    });

    it('spawns Router node with interfaces and MAC', () => {
      const store = useNetworkStore.getState();
      store.addNode('router');

      const updated = useNetworkStore.getState().nodes;
      expect(updated.length).toBe(1);
      const router = updated[0];
      expect(router.type).toBe('router');
      expect(router.data.deviceType).toBe('router');
      expect(router.data.label).toMatch(/^Router-/);
      expect(macSchema.safeParse(router.data.mac).success).toBe(true);
      const routerData = router.data as RouterNodeData;
      expect(Array.isArray(routerData.interfaces)).toBe(true);
      expect(routerData.interfaces.length).toBeGreaterThan(0);
      expect(ipv4Schema.safeParse(routerData.interfaces[0].ip).success).toBe(true);
    });

    it('removes node and connected edges correctly', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');
      store.addNode('switch');

      const [host, sw] = useNetworkStore.getState().nodes;
      store.onConnect({
        source: host.id,
        target: sw.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });

      expect(useNetworkStore.getState().edges.length).toBe(1);

      store.removeNode(host.id);
      expect(useNetworkStore.getState().nodes.length).toBe(1);
      expect(useNetworkStore.getState().edges.length).toBe(0);
    });

    it('respects MAX_NODES limit', () => {
      const store = useNetworkStore.getState();
      for (let i = 0; i < MAX_NODES + 10; i++) {
        store.addNode('host');
      }

      expect(useNetworkStore.getState().nodes.length).toBe(MAX_NODES);
    });

    it('prevents self-connections and duplicate edges', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');
      store.addNode('switch');
      const [host, sw] = useNetworkStore.getState().nodes;

      // Attempt self-connection
      store.onConnect({
        source: host.id,
        target: host.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });
      expect(useNetworkStore.getState().edges.length).toBe(0);

      // Connect host to switch
      store.onConnect({
        source: host.id,
        target: sw.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });
      expect(useNetworkStore.getState().edges.length).toBe(1);

      // Duplicate connection attempt
      store.onConnect({
        source: sw.id,
        target: host.id,
        sourceHandle: 'left',
        targetHandle: 'right',
      });
      expect(useNetworkStore.getState().edges.length).toBe(1);
    });

    it('toggles guide modal open/close state', () => {
      const store = useNetworkStore.getState();
      expect(store.isGuideOpen).toBe(false);

      store.setIsGuideOpen(true);
      expect(useNetworkStore.getState().isGuideOpen).toBe(true);

      store.setIsGuideOpen(false);
      expect(useNetworkStore.getState().isGuideOpen).toBe(false);
    });

    it('toggles ping modal and inspector state', () => {
      const store = useNetworkStore.getState();
      expect(store.isPingModalOpen).toBe(false);
      expect(store.isInspectorOpen).toBe(false);

      store.setIsPingModalOpen(true);
      expect(useNetworkStore.getState().isPingModalOpen).toBe(true);

      store.setIsInspectorOpen(true);
      expect(useNetworkStore.getState().isInspectorOpen).toBe(true);
    });

    it('executes runPingSimulation and populates simulationResult', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');
      store.addNode('switch');
      store.addNode('host');
      const [h1, sw, h2] = useNetworkStore.getState().nodes;

      store.onConnect({
        source: h1.id,
        target: sw.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });
      store.onConnect({
        source: sw.id,
        target: h2.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });

      const res = store.runPingSimulation(h1.id, h2.id);
      expect(res).toBeDefined();
      expect(useNetworkStore.getState().simulationResult).toBe(res);
      expect(useNetworkStore.getState().isInspectorOpen).toBe(true);
    });
  });
});
