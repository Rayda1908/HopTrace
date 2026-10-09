import type { AppNode, AppEdge, PresetType } from '../../types/network';

export interface TopologyPreset {
  id: PresetType;
  title: string;
  description: string;
  nodes: AppNode[];
  edges: AppEdge[];
}

export const TOPOLOGY_PRESETS: Record<PresetType, TopologyPreset> = {
  'simple-switch': {
    id: 'simple-switch',
    title: 'Simple Switch LAN',
    description: '2 Hosts connected via 1 Switch on 192.168.1.0/24 demonstrating pure L2 switching and ARP discovery.',
    nodes: [
      {
        id: 'host-1',
        type: 'host',
        position: { x: 160, y: 220 },
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
        position: { x: 500, y: 220 },
        data: {
          label: 'Switch-1',
          deviceType: 'switch',
          mac: '00:1A:2B:3C:5E:01',
          ports: 8,
          status: 'online',
        },
      },
      {
        id: 'host-2',
        type: 'host',
        position: { x: 840, y: 220 },
        data: {
          label: 'Host-2',
          deviceType: 'host',
          ip: '192.168.1.20',
          subnetMask: '255.255.255.0',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:02',
          gateway: '192.168.1.1',
          status: 'online',
        },
      },
    ],
    edges: [
      {
        id: 'edge-h1-sw1',
        source: 'host-1',
        target: 'switch-1',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      },
      {
        id: 'edge-sw1-h2',
        source: 'switch-1',
        target: 'host-2',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      },
    ],
  },

  'dual-routed': {
    id: 'dual-routed',
    title: 'Dual Routed Subnets',
    description: 'Host-1 (192.168.1.0/24) -> Switch-1 -> Router-1 -> Host-2 (10.0.0.0/24) demonstrating L3 gateway traversal & TTL decrement.',
    nodes: [
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
    ],
    edges: [
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
    ],
  },

  'unreachable-gateway': {
    id: 'unreachable-gateway',
    title: 'Unreachable Gateway',
    description: 'Host-1 configured with an unreachable gateway IP (192.168.1.254) demonstrating ARP timeout and dropped packet mechanics.',
    nodes: [
      {
        id: 'host-1',
        type: 'host',
        position: { x: 180, y: 220 },
        data: {
          label: 'Host-1',
          deviceType: 'host',
          ip: '192.168.1.10',
          subnetMask: '255.255.255.0',
          cidr: 24,
          mac: '00:1A:2B:3C:4D:01',
          gateway: '192.168.1.254',
          status: 'online',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 500, y: 220 },
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
        position: { x: 820, y: 220 },
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
        position: { x: 1120, y: 220 },
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
    ],
    edges: [
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
    ],
  },
};
