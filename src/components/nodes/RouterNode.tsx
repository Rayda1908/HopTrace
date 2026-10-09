import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Router as RouterIcon, Trash2 } from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import type { RouterNodeData } from '../../types/network';

export const RouterNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const routerData = data as unknown as RouterNodeData;
  const removeNode = useNetworkStore((state) => state.removeNode);
  const activePathNodeId = useNetworkStore((state) => state.activePathNodeId);
  const isPacketHere = activePathNodeId === id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  const interfaces = routerData.interfaces || [];

  return (
    <div
      className={`group relative rounded-xl border bg-zinc-900 p-3 w-64 min-w-[250px] shadow-lg transition-all duration-200 ${
        isPacketHere
          ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-950/30'
          : selected
          ? 'border-amber-500/80 ring-2 ring-amber-500/30'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-amber-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-amber-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-amber-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-amber-400 !border-2 !border-zinc-950 transition-colors"
      />

      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <RouterIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-semibold text-zinc-100 leading-tight truncate"
              title={routerData.label || 'Router'}
            >
              {routerData.label || 'Router'}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 font-medium truncate">
              Layer 3 Gateway
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete node"
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 font-mono text-[11px] gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans shrink-0">MAC</span>
          <span
            className="text-zinc-300 text-[10px] truncate text-right"
            title={routerData.mac || '00:00:00:00:00:00'}
          >
            {routerData.mac || '00:00:00:00:00:00'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-0.5">
            Interfaces
          </div>
          {interfaces.map((iface) => (
            <div
              key={iface.id || iface.name}
              className="flex items-center justify-between text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 font-mono text-[11px] gap-2"
            >
              <span className="text-amber-400/90 font-medium truncate shrink-0">{iface.name}</span>
              <span
                className="text-zinc-200 truncate text-right"
                title={`${iface.ip}/${iface.cidr}`}
              >
                {iface.ip}/{iface.cidr}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
