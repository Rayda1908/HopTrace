import { describe, it, expect } from 'vitest';
import {
  ipToLong,
  cidrToMaskLong,
  isSameSubnet,
  getSubnetAddress,
  findL2Path,
  simulatePing,
  type SimNode,
  type SimEdge,
} from '../lib/simulator/routingEngine';

describe('Routing Engine & Packet Simulation', () => {
  describe('IP Subnet Calculations', () => {
    it('calculates 32-bit unsigned integer from IPv4 address', () => {
      expect(ipToLong('0.0.0.0')).toBe(0);
      expect(ipToLong('192.168.1.1')).toBe(3232235777);
      expect(ipToLong('255.255.255.255')).toBe(4294967295);
      expect(ipToLong('invalid.ip')).toBe(0);
    });

    it('generates correct 32-bit netmask for CIDR prefixes', () => {
      expect(cidrToMaskLong(0)).toBe(0);
      expect(cidrToMaskLong(8)).toBe(0xff000000 >>> 0);
      expect(cidrToMaskLong(16)).toBe(0xffff0000 >>> 0);
      expect(cidrToMaskLong(24)).toBe(0xffffff00 >>> 0);
      expect(cidrToMaskLong(32)).toBe(0xffffffff >>> 0);
    });

    it('determines whether two IPs share the same subnet', () => {
      expect(isSameSubnet('192.168.1.10', '192.168.1.50', 24)).toBe(true);
      expect(isSameSubnet('192.168.1.10', '192.168.2.10', 24)).toBe(false);
      expect(isSameSubnet('10.0.5.1', '10.0.8.20', 16)).toBe(true);
      expect(isSameSubnet('10.1.5.1', '10.2.5.1', 16)).toBe(false);
    });

    it('computes correct network base address', () => {
      expect(getSubnetAddress('192.168.1.105', 24)).toBe('192.168.1.0');
      expect(getSubnetAddress('10.128.5.1', 9)).toBe('10.128.0.0');
      expect(getSubnetAddress('172.16.20.1', 12)).toBe('172.16.0.0');
    });
  });

  describe('Layer 2 Path Finding', () => {
    const testNodes: SimNode[] = [
      {
        id: 'h1',
        data: {
          label: 'Host-1',
          deviceType: 'host',
          ip: '192.168.1.10',
          cidr: 24,
          mac: '00:00:00:00:00:01',
          gateway: '192.168.1.1',
        },
      },
      {
        id: 'sw1',
        data: {
          label: 'Switch-1',
          deviceType: 'switch',
          mac: '00:00:00:00:00:02',
          ports: 8,
        },
      },
      {
        id: 'h2',
        data: {
          label: 'Host-2',
          deviceType: 'host',
          ip: '192.168.1.20',
          cidr: 24,
          mac: '00:00:00:00:00:03',
          gateway: '192.168.1.1',
        },
      },
    ];

    const testEdges: SimEdge[] = [
      { id: 'e1', source: 'h1', target: 'sw1' },
      { id: 'e2', source: 'sw1', target: 'h2' },
    ];

    it('resolves path through intermediate switches', () => {
      const result = findL2Path('h1', 'h2', testNodes, testEdges);
      expect(result).not.toBeNull();
      expect(result?.nodeIds).toEqual(['h1', 'sw1', 'h2']);
      expect(result?.edgeIds).toEqual(['e1', 'e2']);
    });

    it('returns null if no physical link exists between segments', () => {
      const disconnectedNodes: SimNode[] = [
        ...testNodes,
        {
          id: 'isolated',
          data: {
            label: 'Isolated',
            deviceType: 'host',
            ip: '192.168.1.99',
            cidr: 24,
            mac: '00:00:00:00:00:99',
            gateway: '192.168.1.1',
          },
        },
      ];
      const result = findL2Path('h1', 'isolated', disconnectedNodes, testEdges);
      expect(result).toBeNull();
    });
  });

  describe('Deterministic Ping Simulation', () => {
    const topologyNodes: SimNode[] = [
      {
        id: 'host-1',
        data: {
          label: 'Host-1',
          deviceType: 'host',
          ip: '192.168.1.10',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:01',
          gateway: '192.168.1.1',
        },
      },
      {
        id: 'switch-1',
        data: {
          label: 'Switch-1',
          deviceType: 'switch',
          mac: '00:1A:2B:3C:5E:01',
          ports: 8,
        },
      },
      {
        id: 'router-1',
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
        },
      },
      {
        id: 'host-2',
        data: {
          label: 'Host-2',
          deviceType: 'host',
          ip: '10.0.0.10',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:02',
          gateway: '10.0.0.1',
        },
      },
      {
        id: 'host-same-sub',
        data: {
          label: 'Host-Same',
          deviceType: 'host',
          ip: '192.168.1.50',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:03',
          gateway: '192.168.1.1',
        },
      },
    ];

    const topologyEdges: SimEdge[] = [
      { id: 'e-h1-sw1', source: 'host-1', target: 'switch-1' },
      { id: 'e-same-sw1', source: 'host-same-sub', target: 'switch-1' },
      { id: 'e-sw1-r1', source: 'switch-1', target: 'router-1' },
      { id: 'e-r1-h2', source: 'router-1', target: 'host-2' },
    ];

    it('simulates direct L2 ping on the same subnet', () => {
      const result = simulatePing(
        'host-1',
        'host-same-sub',
        topologyNodes,
        topologyEdges
      );

      expect(result.status).toBe('success');
      expect(result.isSameSubnet).toBe(true);
      expect(result.ttlRemaining).toBe(64);
      expect(result.pathNodeIds).toEqual([
        'host-1',
        'switch-1',
        'host-same-sub',
      ]);
      expect(result.pathEdgeIds).toEqual(['e-h1-sw1', 'e-same-sw1']);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps.some((s) => s.type === 'arp')).toBe(true);
      expect(result.steps.some((s) => s.type === 'reply')).toBe(true);
    });

    it('simulates L3 routing across subnets via gateway router', () => {
      const result = simulatePing(
        'host-1',
        'host-2',
        topologyNodes,
        topologyEdges
      );

      expect(result.status).toBe('success');
      expect(result.isSameSubnet).toBe(false);
      expect(result.ttlRemaining).toBe(63);
      expect(result.pathNodeIds).toEqual([
        'host-1',
        'switch-1',
        'router-1',
        'host-2',
      ]);
      expect(result.pathEdgeIds).toEqual(['e-h1-sw1', 'e-sw1-r1', 'e-r1-h2']);

      // Check step diagnostics
      const ttlStep = result.steps.find((s) => s.type === 'ttl');
      expect(ttlStep).toBeDefined();
      expect(ttlStep?.description).toContain('decremented TTL to 63');

      const routeStep = result.steps.find((s) => s.type === 'route');
      expect(routeStep).toBeDefined();
      expect(routeStep?.description).toContain('routed to subnet 10.0.0.0/24 via eth1');

      const replyStep = result.steps.find((s) => s.type === 'reply');
      expect(replyStep).toBeDefined();
      expect(replyStep?.description).toContain('0% packet loss');
    });

    it('drops packet when source host has no default gateway configured', () => {
      const nodesWithoutGw: SimNode[] = topologyNodes.map((n) =>
        n.id === 'host-1'
          ? { ...n, data: { ...n.data, gateway: '' } as SimNode['data'] }
          : n
      );

      const result = simulatePing('host-1', 'host-2', nodesWithoutGw, topologyEdges);
      expect(result.status).toBe('dropped');
      expect(result.dropReason).toBe('No default gateway configured on source host');
      expect(result.steps.some((s) => s.type === 'drop')).toBe(true);
    });

    it('drops packet when default gateway is unreachable', () => {
      const nodesWithBadGw: SimNode[] = topologyNodes.map((n) =>
        n.id === 'host-1'
          ? {
              ...n,
              data: { ...n.data, gateway: '192.168.1.254' } as SimNode['data'],
            }
          : n
      );

      const result = simulatePing('host-1', 'host-2', nodesWithBadGw, topologyEdges);
      expect(result.status).toBe('dropped');
      expect(result.dropReason).toContain('not found in topology');
    });

    it('drops packet when destination host is physically disconnected', () => {
      const disconnectedEdges = topologyEdges.filter((e) => e.id !== 'e-r1-h2');
      const result = simulatePing(
        'host-1',
        'host-2',
        topologyNodes,
        disconnectedEdges
      );
      expect(result.status).toBe('dropped');
      expect(result.dropReason).toContain('unreachable');
    });
  });
});
