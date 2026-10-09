
import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Monitor, Trash2 } from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import type { HostNodeData } from '../../types/network';

export const HostNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const hostData = data as unknown as HostNodeData;
  const removeNode = useNetworkStore((state) => state.removeNode);
  const activePathNodeId = useNetworkStore((state) => state.activePathNodeId);
  const isPacketHere = activePathNodeId === id;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  return (
    <div
      className={`group relative rounded-xl border bg-zinc-900/95 p-3 min-w-[230px] shadow-xl backdrop-blur-md transition-all duration-300 ${
        isPacketHere
          ? 'border-sky-400 ring-4 ring-sky-400/70 shadow-2xl shadow-sky-500/50 scale-105'
          : selected
          ? 'border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-emerald-950/40 shadow-lg'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-emerald-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-emerald-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-emerald-400 !border-2 !border-zinc-950 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-700 hover:!bg-emerald-400 !border-2 !border-zinc-950 transition-colors"
      />

      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100 leading-tight">
              {hostData.label || 'Host'}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/90 font-medium">
              PC Host
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete node"
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-zinc-400 bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/50">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">IP</span>
          <span className="text-zinc-200 font-medium">{hostData.ip || '0.0.0.0'}/{hostData.cidr || 24}</span>
        </div>

        <div className="flex items-center justify-between text-zinc-400 bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/50">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">MAC</span>
          <span className="text-zinc-300 text-[10px]">{hostData.mac || '00:00:00:00:00:00'}</span>
        </div>

        <div className="flex items-center justify-between text-zinc-400 bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/50">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">GW</span>
          <span className="text-zinc-400">{hostData.gateway || 'None'}</span>
        </div>
      </div>
    </div>
  );
};
