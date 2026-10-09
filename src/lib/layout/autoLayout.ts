import type { AppNode, AppEdge } from '../../types/network';

export function autoLayoutNodes(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
  if (nodes.length === 0) return [];

  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  // Assign column ranks based on topological BFS from leftmost host
  const ranks = new Map<string, number>();
  const visited = new Set<string>();

  const startNode = nodes.find((n) => n.data.deviceType === 'host') || nodes[0];
  const queue: Array<{ id: string; rank: number }> = [
    { id: startNode.id, rank: 0 },
  ];
  visited.add(startNode.id);
  ranks.set(startNode.id, 0);

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    for (const neighborId of adj.get(id) || []) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        ranks.set(neighborId, rank + 1);
        queue.push({ id: neighborId, rank: rank + 1 });
      }
    }
  }

  let unvisitedRank = Math.max(0, ...Array.from(ranks.values())) + 1;
  for (const n of nodes) {
    if (!ranks.has(n.id)) {
      ranks.set(n.id, unvisitedRank++);
    }
  }

  const rankGroups = new Map<number, AppNode[]>();
  for (const n of nodes) {
    const r = ranks.get(n.id) || 0;
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(n);
  }

  const startX = 140;
  const startY = 220;
  const xSpacing = 320;
  const ySpacing = 200;

  const updatedNodes: AppNode[] = [];
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  sortedRanks.forEach((rank, colIdx) => {
    const group = rankGroups.get(rank)!;
    const totalHeight = (group.length - 1) * ySpacing;
    const colStartY = Math.max(80, startY - totalHeight / 2);

    group.forEach((node, rowIdx) => {
      updatedNodes.push({
        ...node,
        position: {
          x: Math.round(startX + colIdx * xSpacing),
          y: Math.round(colStartY + rowIdx * ySpacing),
        },
      });
    });
  });

  return updatedNodes;
}
