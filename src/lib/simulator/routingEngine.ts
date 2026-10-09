export interface SimHostData {
  label: string;
  deviceType: 'host';
  ip: string;
  cidr: number;
  mac: string;
  gateway: string;
  status?: 'online' | 'offline';
}

export interface SimSwitchData {
  label: string;
  deviceType: 'switch';
  mac: string;
  ports: number;
  status?: 'online' | 'offline';
}

export interface SimRouterInterface {
  id: string;
  name: string;
  ip: string;
  cidr: number;
  mac: string;
}

export interface SimRouterData {
  label: string;
  deviceType: 'router';
  mac: string;
  interfaces: SimRouterInterface[];
  status?: 'online' | 'offline';
}

export type SimDeviceData = SimHostData | SimSwitchData | SimRouterData;

export interface SimNode {
  id: string;
  data: SimDeviceData;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
}

export type SimStepType =
  | 'arp'
  | 'switch'
  | 'route'
  | 'ttl'
  | 'reply'
  | 'drop'
  | 'info';

export interface SimLogStep {
  stepNumber: number;
  type: SimStepType;
  sourceId: string;
  targetId?: string;
  description: string;
  details?: string;
}

export interface SimulationResult {
  status: 'success' | 'dropped';
  sourceHostId: string;
  destHostId: string;
  isSameSubnet: boolean;
  ttlRemaining: number;
  dropReason?: string;
  steps: SimLogStep[];
  pathNodeIds: string[];
  pathEdgeIds: string[];
  roundTripMs: number;
}

export function ipToLong(ip: string): number {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return 0;
  }
  return (
    (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>>
      0)
  );
}

export function cidrToMaskLong(cidr: number): number {
  if (cidr <= 0) return 0;
  if (cidr >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

export function isSameSubnet(ip1: string, ip2: string, cidr: number): boolean {
  if (cidr <= 0) return true;
  const mask = cidrToMaskLong(cidr);
  return (ipToLong(ip1) & mask) === (ipToLong(ip2) & mask);
}

export function getSubnetAddress(ip: string, cidr: number): string {
  const net = (ipToLong(ip) & cidrToMaskLong(cidr)) >>> 0;
  return [
    (net >>> 24) & 255,
    (net >>> 16) & 255,
    (net >>> 8) & 255,
    net & 255,
  ].join('.');
}

export function findL2Path(
  fromId: string,
  toId: string,
  nodes: SimNode[],
  edges: SimEdge[]
): { nodeIds: string[]; edgeIds: string[] } | null {
  if (fromId === toId) {
    return { nodeIds: [fromId], edgeIds: [] };
  }

  const nodeMap = new Map<string, SimNode>(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, Array<{ neighborId: string; edgeId: string }>>();

  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push({ neighborId: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ neighborId: edge.source, edgeId: edge.id });
  }

  const queue: string[] = [fromId];
  const visited = new Set<string>([fromId]);
  const parent = new Map<
    string,
    { prevNodeId: string; edgeId: string } | null
  >();
  parent.set(fromId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];
      let curr: string | null = toId;

      while (curr !== null) {
        nodeIds.unshift(curr);
        const p = parent.get(curr);
        if (p) {
          edgeIds.unshift(p.edgeId);
          curr = p.prevNodeId;
        } else {
          curr = null;
        }
      }
      return { nodeIds, edgeIds };
    }

    const neighbors = adj.get(current) || [];
    for (const { neighborId, edgeId } of neighbors) {
      if (visited.has(neighborId)) continue;

      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      const isIntermediateValid =
        neighborId === toId || neighborNode.data.deviceType === 'switch';

      if (isIntermediateValid) {
        visited.add(neighborId);
        parent.set(neighborId, { prevNodeId: current, edgeId });
        queue.push(neighborId);
      }
    }
  }

  return null;
}

export function simulatePing(
  sourceHostId: string,
  destHostId: string,
  nodes: SimNode[],
  edges: SimEdge[]
): SimulationResult {
  const steps: SimLogStep[] = [];
  let stepIndex = 1;

  const nodeMap = new Map<string, SimNode>(nodes.map((n) => [n.id, n]));
  const srcNode = nodeMap.get(sourceHostId);
  const dstNode = nodeMap.get(destHostId);

  if (!srcNode || srcNode.data.deviceType !== 'host') {
    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: 'Source host not found in topology',
      steps: [
        {
          stepNumber: stepIndex++,
          type: 'drop',
          sourceId: sourceHostId,
          description: 'Simulation aborted: Source host not found in topology.',
        },
      ],
      pathNodeIds: [],
      pathEdgeIds: [],
      roundTripMs: 0,
    };
  }

  if (!dstNode || dstNode.data.deviceType !== 'host') {
    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: 'Destination host not found in topology',
      steps: [
        {
          stepNumber: stepIndex++,
          type: 'drop',
          sourceId: sourceHostId,
          description: 'Simulation aborted: Destination host not found in topology.',
        },
      ],
      pathNodeIds: [sourceHostId],
      pathEdgeIds: [],
      roundTripMs: 0,
    };
  }

  const srcHost = srcNode.data as SimHostData;
  const dstHost = dstNode.data as SimHostData;

  const sameSubnet =
    isSameSubnet(srcHost.ip, dstHost.ip, srcHost.cidr) &&
    isSameSubnet(srcHost.ip, dstHost.ip, dstHost.cidr);

  let ttl = 64;

  if (sameSubnet) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'arp',
      sourceId: srcNode.id,
      description: `[01] ARP Request: Who has ${dstHost.ip}? Tell ${srcHost.label}`,
      details: `Destination is on local subnet ${getSubnetAddress(srcHost.ip, srcHost.cidr)}/${srcHost.cidr}. Direct L2 delivery initiated.`,
    });

    const l2Path = findL2Path(srcNode.id, dstNode.id, nodes, edges);

    if (!l2Path) {
      steps.push({
        stepNumber: stepIndex++,
        type: 'drop',
        sourceId: srcNode.id,
        description: `[02] ARP Request timed out: Destination host ${dstHost.label} unreachable on local link`,
        details: 'No active Layer 2 switch path connects source and destination.',
      });

      return {
        status: 'dropped',
        sourceHostId,
        destHostId,
        isSameSubnet: true,
        ttlRemaining: 0,
        dropReason: `Destination host ${dstHost.label} unreachable on local link`,
        steps,
        pathNodeIds: [srcNode.id],
        pathEdgeIds: [],
        roundTripMs: 0,
      };
    }

    for (let i = 1; i < l2Path.nodeIds.length - 1; i++) {
      const swId = l2Path.nodeIds[i];
      const swNode = nodeMap.get(swId);
      const swLabel = swNode?.data.label || 'Switch';
      steps.push({
        stepNumber: stepIndex++,
        type: 'switch',
        sourceId: swId,
        targetId: l2Path.nodeIds[i + 1],
        description: `[0${stepIndex - 1}] Frame forwarded through ${swLabel}`,
        details: `CAM table lookup: learned source MAC ${srcHost.mac}, switching broadcast frame toward target port.`,
      });
    }

    steps.push({
      stepNumber: stepIndex++,
      type: 'arp',
      sourceId: dstNode.id,
      targetId: srcNode.id,
      description: `[0${stepIndex - 1}] ARP Reply: ${dstHost.ip} is at ${dstHost.mac}`,
      details: 'Target host answered ARP broadcast and updated its local ARP cache.',
    });

    steps.push({
      stepNumber: stepIndex++,
      type: 'reply',
      sourceId: dstNode.id,
      targetId: srcNode.id,
      description: `[0${stepIndex - 1}] Echo Reply received from ${dstHost.label}: Success (0% packet loss)`,
      details: `Direct L2 ICMP Echo Round-Trip verified. TTL=${ttl}.`,
    });

    return {
      status: 'success',
      sourceHostId,
      destHostId,
      isSameSubnet: true,
      ttlRemaining: ttl,
      steps,
      pathNodeIds: l2Path.nodeIds,
      pathEdgeIds: l2Path.edgeIds,
      roundTripMs: 1.2,
    };
  }

  // Routed delivery across different subnets
  const gatewayIp = srcHost.gateway.trim();
  if (!gatewayIp) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'drop',
      sourceId: srcNode.id,
      description: `[01] Routing failure: Source host ${srcHost.label} has no Default Gateway configured`,
      details: `Destination ${dstHost.ip} is on an external subnet (${getSubnetAddress(dstHost.ip, dstHost.cidr)}/${dstHost.cidr}). An egress gateway is required.`,
    });

    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: 'No default gateway configured on source host',
      steps,
      pathNodeIds: [srcNode.id],
      pathEdgeIds: [],
      roundTripMs: 0,
    };
  }

  let gatewayRouterNode: SimNode | null = null;
  let ingressInterface: SimRouterInterface | null = null;

  for (const node of nodes) {
    if (node.data.deviceType === 'router') {
      const routerData = node.data as SimRouterData;
      const matchingIface = (routerData.interfaces || []).find(
        (iface) => iface.ip === gatewayIp
      );
      if (matchingIface) {
        gatewayRouterNode = node;
        ingressInterface = matchingIface;
        break;
      }
    }
  }

  if (!gatewayRouterNode || !ingressInterface) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'drop',
      sourceId: srcNode.id,
      description: `[01] ARP Request: Who has gateway ${gatewayIp}? Tell ${srcHost.label}`,
      details: `No active router interface found configured with IP ${gatewayIp}.`,
    });

    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: `Default gateway ${gatewayIp} not found in topology`,
      steps,
      pathNodeIds: [srcNode.id],
      pathEdgeIds: [],
      roundTripMs: 0,
    };
  }

  const srcToGwPath = findL2Path(
    srcNode.id,
    gatewayRouterNode.id,
    nodes,
    edges
  );

  if (!srcToGwPath) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'drop',
      sourceId: srcNode.id,
      description: `[01] ARP Request timed out: Gateway ${gatewayIp} is physically unreachable`,
      details: 'No Layer 2 link path connects the source host to the router gateway interface.',
    });

    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: `Default gateway ${gatewayIp} unreachable on local link`,
      steps,
      pathNodeIds: [srcNode.id],
      pathEdgeIds: [],
      roundTripMs: 0,
    };
  }

  steps.push({
    stepNumber: stepIndex++,
    type: 'arp',
    sourceId: srcNode.id,
    targetId: gatewayRouterNode.id,
    description: `[01] ARP Request: Who has ${gatewayIp}? Tell ${srcHost.label}`,
    details: `Resolving MAC for Default Gateway ${gatewayIp} (${ingressInterface.name}).`,
  });

  for (let i = 1; i < srcToGwPath.nodeIds.length - 1; i++) {
    const swId = srcToGwPath.nodeIds[i];
    const swNode = nodeMap.get(swId);
    const swLabel = swNode?.data.label || 'Switch';
    steps.push({
      stepNumber: stepIndex++,
      type: 'switch',
      sourceId: swId,
      description: `[0${stepIndex - 1}] Frame forwarded through ${swLabel}`,
      details: `Forwarding ARP/ICMP frame to router port.`,
    });
  }

  ttl -= 1;
  const gwRouterData = gatewayRouterNode.data as SimRouterData;
  steps.push({
    stepNumber: stepIndex++,
    type: 'ttl',
    sourceId: gatewayRouterNode.id,
    description: `[0${stepIndex - 1}] ${gwRouterData.label} received packet; decremented TTL to ${ttl}`,
    details: `Ingress interface: ${ingressInterface.name} (${ingressInterface.ip}). IP checksum recomputed.`,
  });

  if (ttl <= 0) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'drop',
      sourceId: gatewayRouterNode.id,
      description: 'Simulation dropped: TTL expired in transit (TTL <= 0).',
    });

    return {
      status: 'dropped',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: 0,
      dropReason: 'TTL expired in transit',
      steps,
      pathNodeIds: srcToGwPath.nodeIds,
      pathEdgeIds: srcToGwPath.edgeIds,
      roundTripMs: 0,
    };
  }

  // Look for egress interface on gateway router or connected routers
  let egressInterface: SimRouterInterface | null = null;
  let egressRouterNode: SimNode = gatewayRouterNode;

  for (const iface of gwRouterData.interfaces || []) {
    if (isSameSubnet(iface.ip, dstHost.ip, iface.cidr)) {
      egressInterface = iface;
      break;
    }
  }

  // If directly connected to destination subnet from this router:
  if (egressInterface) {
    steps.push({
      stepNumber: stepIndex++,
      type: 'route',
      sourceId: gatewayRouterNode.id,
      targetId: dstNode.id,
      description: `[0${stepIndex - 1}] ${gwRouterData.label} routed to subnet ${getSubnetAddress(
        dstHost.ip,
        egressInterface.cidr
      )}/${egressInterface.cidr} via ${egressInterface.name}`,
      details: `Next hop resolved directly on connected interface ${egressInterface.name} (${egressInterface.ip}).`,
    });

    const gwToDstPath = findL2Path(
      gatewayRouterNode.id,
      dstNode.id,
      nodes,
      edges
    );

    if (!gwToDstPath) {
      steps.push({
        stepNumber: stepIndex++,
        type: 'drop',
        sourceId: gatewayRouterNode.id,
        description: `[0${stepIndex - 1}] Host unreachable: No L2 path from router ${gwRouterData.label} to destination host ${dstHost.label}`,
      });

      return {
        status: 'dropped',
        sourceHostId,
        destHostId,
        isSameSubnet: false,
        ttlRemaining: ttl,
        dropReason: `Destination host unreachable from router egress interface ${egressInterface.name}`,
        steps,
        pathNodeIds: srcToGwPath.nodeIds,
        pathEdgeIds: srcToGwPath.edgeIds,
        roundTripMs: 0,
      };
    }

    for (let i = 1; i < gwToDstPath.nodeIds.length - 1; i++) {
      const swId = gwToDstPath.nodeIds[i];
      const swNode = nodeMap.get(swId);
      const swLabel = swNode?.data.label || 'Switch';
      steps.push({
        stepNumber: stepIndex++,
        type: 'switch',
        sourceId: swId,
        description: `[0${stepIndex - 1}] Frame forwarded through ${swLabel}`,
        details: 'Switch forwarded Ethernet frame toward destination host.',
      });
    }

    steps.push({
      stepNumber: stepIndex++,
      type: 'reply',
      sourceId: dstNode.id,
      targetId: srcNode.id,
      description: `[0${stepIndex - 1}] Echo Reply received from ${dstHost.label}: Success (0% packet loss)`,
      details: `Inter-subnet ICMP Echo Round-Trip verified. TTL remaining=${ttl}.`,
    });

    const fullPathNodes = [
      ...srcToGwPath.nodeIds,
      ...gwToDstPath.nodeIds.slice(1),
    ];
    const fullPathEdges = [...srcToGwPath.edgeIds, ...gwToDstPath.edgeIds];

    return {
      status: 'success',
      sourceHostId,
      destHostId,
      isSameSubnet: false,
      ttlRemaining: ttl,
      steps,
      pathNodeIds: fullPathNodes,
      pathEdgeIds: fullPathEdges,
      roundTripMs: 3.8,
    };
  }

  // Inter-router search if router does not have direct interface
  const routerQueue: Array<{
    routerNode: SimNode;
    accumulatedNodes: string[];
    accumulatedEdges: string[];
    currentTtl: number;
  }> = [
    {
      routerNode: gatewayRouterNode,
      accumulatedNodes: srcToGwPath.nodeIds,
      accumulatedEdges: srcToGwPath.edgeIds,
      currentTtl: ttl,
    },
  ];

  const visitedRouters = new Set<string>([gatewayRouterNode.id]);
  let foundResult: SimulationResult | null = null;

  while (routerQueue.length > 0) {
    const current = routerQueue.shift()!;
    const curRouterData = current.routerNode.data as SimRouterData;

    for (const iface of curRouterData.interfaces || []) {
      if (isSameSubnet(iface.ip, dstHost.ip, iface.cidr)) {
        egressInterface = iface;
        egressRouterNode = current.routerNode;

        const routerToDst = findL2Path(
          egressRouterNode.id,
          dstNode.id,
          nodes,
          edges
        );
        if (routerToDst) {
          steps.push({
            stepNumber: stepIndex++,
            type: 'route',
            sourceId: egressRouterNode.id,
            targetId: dstNode.id,
            description: `[0${stepIndex - 1}] ${curRouterData.label} routed to subnet ${getSubnetAddress(
              dstHost.ip,
              egressInterface.cidr
            )}/${egressInterface.cidr} via ${egressInterface.name}`,
          });

          steps.push({
            stepNumber: stepIndex++,
            type: 'reply',
            sourceId: dstNode.id,
            targetId: srcNode.id,
            description: `[0${stepIndex - 1}] Echo Reply received from ${dstHost.label}: Success (0% packet loss)`,
          });

          foundResult = {
            status: 'success',
            sourceHostId,
            destHostId,
            isSameSubnet: false,
            ttlRemaining: current.currentTtl,
            steps,
            pathNodeIds: [
              ...current.accumulatedNodes,
              ...routerToDst.nodeIds.slice(1),
            ],
            pathEdgeIds: [...current.accumulatedEdges, ...routerToDst.edgeIds],
            roundTripMs: 5.4,
          };
          break;
        }
      }
    }

    if (foundResult) break;

    // Explore neighboring routers
    for (const otherNode of nodes) {
      if (
        otherNode.data.deviceType === 'router' &&
        !visitedRouters.has(otherNode.id)
      ) {
        const link = findL2Path(
          current.routerNode.id,
          otherNode.id,
          nodes,
          edges
        );
        if (link && current.currentTtl > 1) {
          visitedRouters.add(otherNode.id);
          const nextTtl = current.currentTtl - 1;
          steps.push({
            stepNumber: stepIndex++,
            type: 'ttl',
            sourceId: otherNode.id,
            description: `[0${stepIndex - 1}] ${otherNode.data.label} decremented TTL to ${nextTtl}`,
          });
          routerQueue.push({
            routerNode: otherNode,
            accumulatedNodes: [
              ...current.accumulatedNodes,
              ...link.nodeIds.slice(1),
            ],
            accumulatedEdges: [...current.accumulatedEdges, ...link.edgeIds],
            currentTtl: nextTtl,
          });
        }
      }
    }
  }

  if (foundResult) {
    return foundResult;
  }

  steps.push({
    stepNumber: stepIndex++,
    type: 'drop',
    sourceId: gatewayRouterNode.id,
    description: `[0${stepIndex - 1}] Destination network unreachable: No router path to subnet of ${dstHost.ip}`,
    details: 'The routing table on the gateway router has no matching route entry.',
  });

  return {
    status: 'dropped',
    sourceHostId,
    destHostId,
    isSameSubnet: false,
    ttlRemaining: 0,
    dropReason: `No route to destination subnet for ${dstHost.ip}`,
    steps,
    pathNodeIds: srcToGwPath.nodeIds,
    pathEdgeIds: srcToGwPath.edgeIds,
    roundTripMs: 0,
  };
}
