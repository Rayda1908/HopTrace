import type { NodeTypes } from '@xyflow/react';
import { HostNode } from './HostNode';
import { SwitchNode } from './SwitchNode';
import { RouterNode } from './RouterNode';

export const nodeTypes: NodeTypes = {
  host: HostNode,
  switch: SwitchNode,
  router: RouterNode,
};

export { HostNode, SwitchNode, RouterNode };
