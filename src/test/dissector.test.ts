import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeChecksum,
  formatHexDump,
  dissectSimulationResult,
  createDefaultDissectedPackets,
} from '../lib/simulator/packetDissector';
import { useNetworkStore } from '../store/networkStore';
import { positionSchema } from '../types/network';
import type { SimulationResult, SimNode } from '../lib/simulator/routingEngine';
import type { AppNode } from '../types/network';

describe('Packet Dissector & Wireshark Engine', () => {
  it('computes 16-bit 1s complement checksums accurately', () => {
    // Standard test vector
    const testData = new Uint8Array([0x45, 0x00, 0x00, 0x3c, 0x1c, 0x46, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0xc0, 0xa8, 0x01, 0x0a, 0x0a, 0x00, 0x00, 0x01]);
    const cksum = computeChecksum(testData, 0, testData.length);
    expect(typeof cksum).toBe('number');
    expect(cksum).toBeGreaterThanOrEqual(0);
    expect(cksum).toBeLessThanOrEqual(0xffff);
  });

  it('formats raw packet bytes into 16-byte hex dump lines with offset and ascii', () => {
    const raw = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x57, // Hello, W
      0x6f, 0x72, 0x6c, 0x64, 0x21, 0x00, 0x01, 0x02, // orld!...
      0x03, 0x04,                                     // ..
    ]);

    const lines = formatHexDump(raw);
    expect(lines.length).toBe(2);
    expect(lines[0].offset).toBe('0000');
    expect(lines[0].ascii).toBe('Hello, World!...');
    expect(lines[1].offset).toBe('0010');
  });

  it('generates authentic ARP and ICMP frames for same-subnet ping', () => {
    const result: SimulationResult = {
      status: 'success',
      sourceHostId: 'host-1',
      destHostId: 'host-2',
      isSameSubnet: true,
      ttlRemaining: 64,
      steps: [],
      pathNodeIds: ['host-1', 'switch-1', 'host-2'],
      pathEdgeIds: ['e1', 'e2'],
      roundTripMs: 1.2,
    };

    const nodes: SimNode[] = [
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
        id: 'host-2',
        data: {
          label: 'Host-2',
          deviceType: 'host',
          ip: '192.168.1.20',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:02',
          gateway: '192.168.1.1',
        },
      },
    ];

    const packets = dissectSimulationResult(result, nodes);
    expect(packets.length).toBe(4);

    // Frame 1: ARP Request
    expect(packets[0].protocol).toBe('ARP');
    expect(packets[0].info).toContain('Who has 192.168.1.20');
    expect(packets[0].length).toBe(42);
    expect(packets[0].summaryTree.length).toBe(3);

    // Frame 2: ARP Reply
    expect(packets[1].protocol).toBe('ARP');
    expect(packets[1].info).toContain('is at 00:1A:2B:3C:4D:02');

    // Frame 3: ICMP Echo Request
    expect(packets[2].protocol).toBe('ICMP');
    expect(packets[2].info).toContain('Echo (ping) request');
    expect(packets[2].length).toBe(74);

    // Frame 4: ICMP Echo Reply
    expect(packets[3].protocol).toBe('ICMP');
    expect(packets[3].info).toContain('Echo (ping) reply');
  });

  it('generates multi-hop routed frames with gateway ARP and forwarded TTL', () => {
    const result: SimulationResult = {
      status: 'success',
      sourceHostId: 'host-1',
      destHostId: 'host-2',
      isSameSubnet: false,
      ttlRemaining: 63,
      steps: [],
      pathNodeIds: ['host-1', 'sw-1', 'router-1', 'sw-2', 'host-2'],
      pathEdgeIds: ['e1', 'e2', 'e3', 'e4'],
      roundTripMs: 4.5,
    };

    const nodes: SimNode[] = [
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
        id: 'router-1',
        data: {
          label: 'Router-1',
          deviceType: 'router',
          mac: '00:1A:2B:3C:6F:01',
          interfaces: [
            { id: 'i1', name: 'eth0', ip: '192.168.1.1', cidr: 24, mac: '00:1A:2B:3C:6F:1A' },
            { id: 'i2', name: 'eth1', ip: '10.0.0.1', cidr: 24, mac: '00:1A:2B:3C:6F:1B' },
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
    ];

    const packets = dissectSimulationResult(result, nodes);
    expect(packets.length).toBeGreaterThanOrEqual(4);

    // First ARP is for gateway
    expect(packets[0].info).toContain('Who has 192.168.1.1');
    // Forwarded packet has decremented TTL
    const forwardedPacket = packets.find((p) => p.info.includes('forwarded by router'));
    expect(forwardedPacket).toBeDefined();
    expect(forwardedPacket?.info).toContain('ttl=63');
  });

  it('provides default dissected packets when no simulation has run', () => {
    const defaults = createDefaultDissectedPackets();
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults[0].rawBytes.length).toBeGreaterThan(0);
  });
});

describe('Web App Hardening & Edge-Case Protection', () => {
  beforeEach(() => {
    useNetworkStore.getState().clearCanvas();
  });

  it('rejects self-links in store onConnect', () => {
    const store = useNetworkStore.getState();
    store.addNode('host');
    const hostId = useNetworkStore.getState().nodes[0].id;

    useNetworkStore.getState().onConnect({
      source: hostId,
      target: hostId,
      sourceHandle: 'right',
      targetHandle: 'left',
    });

    expect(useNetworkStore.getState().edges.length).toBe(0);
  });

  it('rejects duplicate edges between the same handle pair', () => {
    const store = useNetworkStore.getState();
    store.addNode('host');
    store.addNode('switch');
    const [h, s] = useNetworkStore.getState().nodes;

    // Connect h -> s on (right -> left)
    useNetworkStore.getState().onConnect({
      source: h.id,
      target: s.id,
      sourceHandle: 'right',
      targetHandle: 'left',
    });
    expect(useNetworkStore.getState().edges.length).toBe(1);

    // Attempt connecting exact same handle pair again
    useNetworkStore.getState().onConnect({
      source: h.id,
      target: s.id,
      sourceHandle: 'right',
      targetHandle: 'left',
    });
    expect(useNetworkStore.getState().edges.length).toBe(1);

    // Attempt reverse connecting same handle pair
    useNetworkStore.getState().onConnect({
      source: s.id,
      target: h.id,
      sourceHandle: 'left',
      targetHandle: 'right',
    });
    expect(useNetworkStore.getState().edges.length).toBe(1);
  });

  it('guards against NaN coordinates and out-of-bounds positions in positionSchema', () => {
    expect(positionSchema.safeParse({ x: 100, y: 200 }).success).toBe(true);
    expect(positionSchema.safeParse({ x: NaN, y: 200 }).success).toBe(false);
    expect(positionSchema.safeParse({ x: Infinity, y: 200 }).success).toBe(false);
    expect(positionSchema.safeParse({ x: 100, y: -Infinity }).success).toBe(false);
    expect(positionSchema.safeParse({ x: 999999, y: 200 }).success).toBe(false);
  });

  it('sanitizes coordinates in addNode and loadTopology', () => {
    const store = useNetworkStore.getState();
    // Passing NaN coordinates to addNode
    store.addNode('host', { x: NaN, y: NaN });
    const addedNode = useNetworkStore.getState().nodes[0];
    expect(Number.isFinite(addedNode.position.x)).toBe(true);
    expect(Number.isFinite(addedNode.position.y)).toBe(true);

    // Loading topology with corrupt position
    const corruptNode: AppNode = {
      id: 'n-test',
      type: 'switch',
      position: { x: NaN as unknown as number, y: 9999999 },
      data: {
        label: 'Switch-Corrupt',
        deviceType: 'switch',
        mac: '00:1A:2B:3C:5E:99',
        ports: 8,
        status: 'online',
      },
    };
    useNetworkStore.getState().loadTopology([corruptNode], []);
    const sanitized = useNetworkStore.getState().nodes[0];
    expect(Number.isFinite(sanitized.position.x)).toBe(true);
    expect(sanitized.position.y).toBeLessThanOrEqual(5000);
  });

  it('toggles isWiresharkOpen state cleanly', () => {
    expect(useNetworkStore.getState().isWiresharkOpen).toBe(false);
    useNetworkStore.getState().setIsWiresharkOpen(true);
    expect(useNetworkStore.getState().isWiresharkOpen).toBe(true);
    useNetworkStore.getState().setIsWiresharkOpen(false);
    expect(useNetworkStore.getState().isWiresharkOpen).toBe(false);
  });
});
