import { z } from 'zod';
import type { Node, Edge } from '@xyflow/react';

export const MAX_NODES = 100;
export const MAX_EDGES = 200;

export const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;

export const MAC_REGEX = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/;

export const ipv4Schema = z
  .string()
  .regex(IPV4_REGEX, 'Invalid IPv4 address: must be 4 octets (0-255) with no leading zeroes');

export const cidrSchema = z
  .number()
  .int('CIDR must be an integer')
  .min(0, 'CIDR cannot be negative')
  .max(32, 'CIDR cannot exceed 32');

export const macSchema = z
  .string()
  .regex(MAC_REGEX, 'Invalid MAC address format (XX:XX:XX:XX:XX:XX)');

export const nodeNameSchema = z
  .string()
  .trim()
  .min(1, 'Node name is required')
  .max(32, 'Node name must not exceed 32 characters');

export const portsSchema = z
  .number()
  .int('Port count must be an integer')
  .min(1, 'Port count must be at least 1')
  .max(64, 'Port count cannot exceed 64');

export function cidrToSubnetMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) return '255.255.255.0';
  if (cidr === 0) return '0.0.0.0';
  if (cidr === 32) return '255.255.255.255';
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  return [
    (mask >>> 24) & 255,
    (mask >>> 16) & 255,
    (mask >>> 8) & 255,
    mask & 255,
  ].join('.');
}

export type DeviceType = 'host' | 'switch' | 'router';

export interface HostNodeData {
  label: string;
  deviceType: 'host';
  ip: string;
  subnetMask: string;
  cidr: number;
  mac: string;
  gateway: string;
  status: 'online' | 'offline';
  [key: string]: unknown;
}

export interface SwitchNodeData {
  label: string;
  deviceType: 'switch';
  mac: string;
  ports: number;
  status: 'online' | 'offline';
  [key: string]: unknown;
}

export interface RouterInterface {
  id: string;
  name: string;
  ip: string;
  cidr: number;
  mac: string;
}

export interface RouterNodeData {
  label: string;
  deviceType: 'router';
  mac: string;
  interfaces: RouterInterface[];
  status: 'online' | 'offline';
  [key: string]: unknown;
}

export type DeviceNodeData = HostNodeData | SwitchNodeData | RouterNodeData;

export type AppNode = Node<DeviceNodeData, 'host' | 'switch' | 'router'>;
export type AppEdge = Edge;

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const hostNodeDataSchema = z.object({
  label: nodeNameSchema,
  deviceType: z.literal('host'),
  ip: ipv4Schema,
  subnetMask: z.string().optional().default('255.255.255.0'),
  cidr: cidrSchema,
  mac: macSchema,
  gateway: z.string().default(''),
  status: z.enum(['online', 'offline']).default('online'),
});

export const switchNodeDataSchema = z.object({
  label: nodeNameSchema,
  deviceType: z.literal('switch'),
  mac: macSchema,
  ports: portsSchema,
  status: z.enum(['online', 'offline']).default('online'),
});

export const routerInterfaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ip: ipv4Schema,
  cidr: cidrSchema,
  mac: macSchema,
});

export const routerNodeDataSchema = z.object({
  label: nodeNameSchema,
  deviceType: z.literal('router'),
  mac: macSchema,
  interfaces: z.array(routerInterfaceSchema),
  status: z.enum(['online', 'offline']).default('online'),
});

export const appNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(['host', 'switch', 'router']),
  position: positionSchema,
  data: z.union([hostNodeDataSchema, switchNodeDataSchema, routerNodeDataSchema]),
});

export const appEdgeSchema = z.object({
  id: z.string().min(1).max(128),
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

export const topologyExportSchema = z.object({
  version: z.string().optional().default('1.0'),
  timestamp: z.string().optional(),
  nodes: z.array(appNodeSchema).max(MAX_NODES, `Topology cannot exceed ${MAX_NODES} nodes`),
  edges: z.array(appEdgeSchema).max(MAX_EDGES, `Topology cannot exceed ${MAX_EDGES} edges`),
});

export type TopologyExportData = z.infer<typeof topologyExportSchema>;

export type PresetType = 'simple-switch' | 'dual-routed' | 'unreachable-gateway';
