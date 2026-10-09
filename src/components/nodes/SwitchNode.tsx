import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Network, Trash2 } from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import type { SwitchNodeData } from '../../types/network';

export const SwitchNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const switchData = data as unknown as SwitchNodeData;
  const removeNode = useNetworkStore((state) => state.removeNode);
  const activePathNodeId = useNetworkStore((state) => state.activePathNodeId);
  const isPacketHere = activePathNodeId === id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  const portCount = switchData.ports || 8;

  return (
    <div
      className={`group relative rounded-xl border bg-zinc-900 p-3 w-60 min-w-[240px] shadow-lg transition-all duration-200 ${
        isPacketHere
          ? 'border-indigo-400 ring-2 ring-indigo-400/60 shadow-indigo-950/30'
          : selected
          ? 'border-indigo-500/80 ring-2 ring-indigo-500/30'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-indigo-400 !border-2 !border-zinc-950 transition-colors"
      />

      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-semibold text-zinc-100 leading-tight truncate"
              title={switchData.label || 'Switch'}
            >
              {switchData.label || 'Switch'}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400/90 font-medium truncate">
              Layer 2 Switch
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
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

      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 font-mono text-[11px] gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans shrink-0">MAC</span>
          <span
            className="text-zinc-300 text-[10px] truncate text-right"
            title={switchData.mac || '00:00:00:00:00:00'}
          >
            {switchData.mac || '00:00:00:00:00:00'}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1 px-0.5">
            <span className="text-zinc-500 uppercase tracking-wider">Ports</span>
            <span className="text-indigo-400/90 font-mono font-medium">{portCount} GbE</span>
          </div>
          <div className="grid grid-cols-8 gap-1 p-1.5 rounded bg-zinc-950 border border-zinc-800/80">
            {Array.from({ length: portCount }).map((_, idx) => (
              <div
                key={idx}
                title={`Port ${idx + 1}`}
                className="h-3 rounded-xs bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center hover:bg-indigo-500/20 transition-colors"
              >
                <div className="w-1 h-1 rounded-full bg-indigo-400/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
