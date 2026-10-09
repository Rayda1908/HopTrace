import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from '../store/networkStore';
import {
  ipv4Schema,
  cidrSchema,
  macSchema,
  nodeNameSchema,
  portsSchema,
  cidrToSubnetMask,
  type HostNodeData,
  type SwitchNodeData,
  type RouterNodeData,
} from '../types/network';

describe('Node Configuration Drawer Logic & Store Synchronization', () => {
  beforeEach(() => {
    useNetworkStore.getState().clearCanvas();
  });

  describe('Validation Schemas & Helpers', () => {
    it('converts CIDR prefix integers to correct dotted-decimal subnet masks', () => {
      expect(cidrToSubnetMask(0)).toBe('0.0.0.0');
      expect(cidrToSubnetMask(8)).toBe('255.0.0.0');
      expect(cidrToSubnetMask(16)).toBe('255.255.0.0');
      expect(cidrToSubnetMask(24)).toBe('255.255.255.0');
      expect(cidrToSubnetMask(28)).toBe('255.255.255.240');
      expect(cidrToSubnetMask(30)).toBe('255.255.255.252');
      expect(cidrToSubnetMask(32)).toBe('255.255.255.255');
      expect(cidrToSubnetMask(33)).toBe('255.255.255.0');
      expect(cidrToSubnetMask(-1)).toBe('255.255.255.0');
    });

    it('validates switch port counts within 1-64', () => {
      expect(portsSchema.safeParse(8).success).toBe(true);
      expect(portsSchema.safeParse(24).success).toBe(true);
      expect(portsSchema.safeParse(48).success).toBe(true);
      expect(portsSchema.safeParse(0).success).toBe(false);
      expect(portsSchema.safeParse(-8).success).toBe(false);
      expect(portsSchema.safeParse(65).success).toBe(false);
      expect(portsSchema.safeParse(8.5).success).toBe(false);
    });

    it('validates device labels with trimming and character bounds', () => {
      expect(nodeNameSchema.safeParse('Host-Alpha').success).toBe(true);
      expect(nodeNameSchema.safeParse('  Switch-1  ').success).toBe(true);
      expect(nodeNameSchema.safeParse('').success).toBe(false);
      expect(nodeNameSchema.safeParse('   ').success).toBe(false);
      expect(nodeNameSchema.safeParse('a'.repeat(33)).success).toBe(false);
    });

    it('rejects invalid octets and malformed CIDRs', () => {
      expect(ipv4Schema.safeParse('192.168.1.256').success).toBe(false);
      expect(ipv4Schema.safeParse('01.1.1.1').success).toBe(false);
      expect(ipv4Schema.safeParse('192.168.1.1.1').success).toBe(false);
      expect(cidrSchema.safeParse(-5).success).toBe(false);
      expect(cidrSchema.safeParse(35).success).toBe(false);
    });
  });

  describe('Canvas Selection & Drawer Synchronization', () => {
    it('sets selectedNodeId and synchronizes node selection state', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');
      store.addNode('router');

      const [host, router] = useNetworkStore.getState().nodes;

      store.setSelectedNodeId(host.id);
      let current = useNetworkStore.getState();
      expect(current.selectedNodeId).toBe(host.id);
      expect(current.nodes.find((n) => n.id === host.id)?.selected).toBe(true);
      expect(current.nodes.find((n) => n.id === router.id)?.selected).toBe(false);

      // Deselect (clicking canvas background)
      store.setSelectedNodeId(null);
      current = useNetworkStore.getState();
      expect(current.selectedNodeId).toBeNull();
      expect(current.nodes.find((n) => n.id === host.id)?.selected).toBe(false);
      expect(current.nodes.find((n) => n.id === router.id)?.selected).toBe(false);
    });
  });

  describe('Host Node Configuration Updates', () => {
    it('updates host IP, CIDR mask, gateway, and MAC address', () => {
      const store = useNetworkStore.getState();
      store.addNode('host');
      const host = useNetworkStore.getState().nodes[0];

      const newIp = '10.50.1.25';
      const newCidr = 28;
      const newGateway = '10.50.1.1';
      const newMac = 'AA:BB:CC:DD:EE:01';
      const newLabel = 'Workstation-A';

      expect(ipv4Schema.safeParse(newIp).success).toBe(true);
      expect(cidrSchema.safeParse(newCidr).success).toBe(true);
      expect(macSchema.safeParse(newMac).success).toBe(true);
      expect(nodeNameSchema.safeParse(newLabel).success).toBe(true);

      store.updateNodeData(host.id, {
        label: newLabel,
        ip: newIp,
        cidr: newCidr,
        subnetMask: cidrToSubnetMask(newCidr),
        gateway: newGateway,
        mac: newMac,
      });

      const updatedHost = useNetworkStore.getState().nodes[0];
      const data = updatedHost.data as HostNodeData;
      expect(data.label).toBe(newLabel);
      expect(data.ip).toBe(newIp);
      expect(data.cidr).toBe(28);
      expect(data.subnetMask).toBe('255.255.255.240');
      expect(data.gateway).toBe(newGateway);
      expect(data.mac).toBe(newMac);
    });
  });

  describe('Switch Node Configuration & Connected Nodes', () => {
    it('updates switch port count and derives connected node topology', () => {
      const store = useNetworkStore.getState();
      store.addNode('switch');
      store.addNode('host');

      const [sw, host] = useNetworkStore.getState().nodes;

      store.updateNodeData(sw.id, {
        label: 'Core-Switch-1',
        ports: 24,
        mac: '11:22:33:44:55:66',
      });

      store.onConnect({
        source: sw.id,
        target: host.id,
        sourceHandle: 'right',
        targetHandle: 'left',
      });

      const state = useNetworkStore.getState();
      const swData = state.nodes.find((n) => n.id === sw.id)?.data as SwitchNodeData;
      expect(swData.ports).toBe(24);
      expect(swData.label).toBe('Core-Switch-1');

      const connectedEdges = state.edges.filter(
        (e) => e.source === sw.id || e.target === sw.id
      );
      expect(connectedEdges.length).toBe(1);

      const connectedTargetId =
        connectedEdges[0].source === sw.id
          ? connectedEdges[0].target
          : connectedEdges[0].source;
      expect(connectedTargetId).toBe(host.id);

      // Disconnect link
      store.removeEdge(connectedEdges[0].id);
      expect(useNetworkStore.getState().edges.length).toBe(0);
    });
  });

  describe('Router Node Interface Table', () => {
    it('manages router interfaces: updates IP/mask, adds interfaces, and deletes interfaces', () => {
      const store = useNetworkStore.getState();
      store.addNode('router');

      const router = useNetworkStore.getState().nodes[0];
      const routerData = router.data as RouterNodeData;
      expect(routerData.interfaces.length).toBeGreaterThan(0);

      const modifiedInterfaces = routerData.interfaces.map((iface, idx) => {
        if (idx === 0) {
          return {
            ...iface,
            name: 'eth0',
            ip: '172.16.0.1',
            cidr: 16,
            mac: '00:1A:2B:3C:6F:99',
          };
        }
        return iface;
      });

      store.updateNodeData(router.id, {
        label: 'Gateway-Router',
        interfaces: modifiedInterfaces,
      });

      let updatedData = useNetworkStore.getState().nodes[0].data as RouterNodeData;
      expect(updatedData.label).toBe('Gateway-Router');
      expect(updatedData.interfaces[0].ip).toBe('172.16.0.1');
      expect(updatedData.interfaces[0].cidr).toBe(16);

      // Add new interface
      const newIface = {
        id: 'iface-new-1',
        name: 'eth2',
        ip: '10.200.0.1',
        cidr: 24,
        mac: '00:1A:2B:3C:6F:CC',
      };
      store.updateNodeData(router.id, {
        interfaces: [...updatedData.interfaces, newIface],
      });

      updatedData = useNetworkStore.getState().nodes[0].data as RouterNodeData;
      expect(updatedData.interfaces.length).toBe(modifiedInterfaces.length + 1);

      // Delete interface
      const trimmedInterfaces = updatedData.interfaces.filter(
        (i) => i.id !== 'iface-new-1'
      );
      store.updateNodeData(router.id, {
        interfaces: trimmedInterfaces,
      });

      updatedData = useNetworkStore.getState().nodes[0].data as RouterNodeData;
      expect(updatedData.interfaces.length).toBe(modifiedInterfaces.length);
    });
  });

  describe('Delete Device Action', () => {
    it('deletes selected node, removes connected links, and resets selectedNodeId', () => {
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

      store.setSelectedNodeId(host.id);
      expect(useNetworkStore.getState().selectedNodeId).toBe(host.id);

      // Delete device
      store.removeNode(host.id);

      const finalState = useNetworkStore.getState();
      expect(finalState.nodes.length).toBe(1);
      expect(finalState.nodes[0].id).toBe(sw.id);
      expect(finalState.edges.length).toBe(0);
      expect(finalState.selectedNodeId).toBeNull();
    });
  });
});
