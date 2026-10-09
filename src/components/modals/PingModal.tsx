import React, { useState } from 'react';
import {
  X,
  Send,
  ArrowDownUp,
  AlertTriangle,
  Network,
  Zap,
} from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import { isSameSubnet, getSubnetAddress } from '../../lib/simulator/routingEngine';
import type { HostNodeData } from '../../types/network';

export const PingModal: React.FC = () => {
  const isPingModalOpen = useNetworkStore((state) => state.isPingModalOpen);
  const setIsPingModalOpen = useNetworkStore((state) => state.setIsPingModalOpen);
  const nodes = useNetworkStore((state) => state.nodes);
  const runPingSimulation = useNetworkStore((state) => state.runPingSimulation);

  const hostNodes = nodes.filter((n) => n.data.deviceType === 'host');

  const [sourceId, setSourceId] = useState<string>(
    hostNodes[0]?.id || ''
  );
  const [destId, setDestId] = useState<string>(
    hostNodes[1]?.id || hostNodes[0]?.id || ''
  );

  if (!isPingModalOpen) return null;

  const currentSourceId = hostNodes.some((h) => h.id === sourceId)
    ? sourceId
    : hostNodes[0]?.id || '';

  const currentDestId = hostNodes.some((h) => h.id === destId)
    ? destId
    : hostNodes[1]?.id || hostNodes[0]?.id || '';

  const srcNode = hostNodes.find((h) => h.id === currentSourceId);
  const dstNode = hostNodes.find((h) => h.id === currentDestId);

  const srcData = srcNode?.data as HostNodeData | undefined;
  const dstData = dstNode?.data as HostNodeData | undefined;

  const handleSwap = () => {
    setSourceId(currentDestId);
    setDestId(currentSourceId);
  };

  const handleSendPing = () => {
    if (!currentSourceId || !currentDestId) return;
    runPingSimulation(currentSourceId, currentDestId);
    setIsPingModalOpen(false);
  };

  const sameSubnet =
    srcData && dstData
      ? isSameSubnet(srcData.ip, dstData.ip, srcData.cidr) &&
        isSameSubnet(srcData.ip, dstData.ip, dstData.cidr)
      : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ping-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="ping-modal-title"
                className="text-base font-semibold text-zinc-100 leading-tight"
              >
                Simulate ICMP Ping
              </h2>
              <p className="text-xs text-zinc-400">
                Trace end-to-end packet transmission and hop-by-hop forwarding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPingModalOpen(false)}
            aria-label="Close ping modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {hostNodes.length < 2 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                Please spawn at least two Host devices from the toolbar to simulate ping connectivity.
              </span>
            </div>
          ) : (
            <>
              {/* Host Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Source Host */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
                    Source Host
                  </label>
                  <div className="relative">
                    <select
                      value={currentSourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-100 focus:outline-none focus:border-purple-500/80 cursor-pointer"
                    >
                      {hostNodes.map((h) => {
                        const d = h.data as HostNodeData;
                        return (
                          <option key={h.id} value={h.id}>
                            {d.label || h.id} ({d.ip || '0.0.0.0'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {srcData && (
                    <div className="px-2 py-1 rounded bg-zinc-950/60 border border-zinc-800/60 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                      <span className="text-zinc-500">Subnet:</span>
                      <span className="text-zinc-300">
                        {getSubnetAddress(srcData.ip, srcData.cidr)}/{srcData.cidr}
                      </span>
                    </div>
                  )}
                </div>

                {/* Swap Button */}
                <div className="flex justify-center pt-5 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleSwap}
                    title="Swap Source and Destination"
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700/60 cursor-pointer"
                  >
                    <ArrowDownUp className="w-4 h-4" />
                  </button>
                </div>

                {/* Destination Host */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider font-mono">
                    Destination Host
                  </label>
                  <div className="relative">
                    <select
                      value={currentDestId}
                      onChange={(e) => setDestId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-100 focus:outline-none focus:border-purple-500/80 cursor-pointer"
                    >
                      {hostNodes.map((h) => {
                        const d = h.data as HostNodeData;
                        return (
                          <option key={h.id} value={h.id}>
                            {d.label || h.id} ({d.ip || '0.0.0.0'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {dstData && (
                    <div className="px-2 py-1 rounded bg-zinc-950/60 border border-zinc-800/60 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                      <span className="text-zinc-500">Subnet:</span>
                      <span className="text-zinc-300">
                        {getSubnetAddress(dstData.ip, dstData.cidr)}/{dstData.cidr}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subnet Analysis Preview Card */}
              {srcData && dstData && (
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      {sameSubnet ? (
                        <>
                          <Network className="w-4 h-4 text-emerald-400" />
                          <span>Same Subnet: Direct L2 Switching</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>Inter-Subnet: Layer 3 Gateway Routing</span>
                        </>
                      )}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        sameSubnet
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {sameSubnet ? 'L2 Local Broadcast' : 'L3 Router Hop'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {sameSubnet
                      ? `Both hosts reside on subnet ${getSubnetAddress(srcData.ip, srcData.cidr)}/${srcData.cidr}. Packets switch directly via ARP broadcast.`
                      : `Source is on ${getSubnetAddress(srcData.ip, srcData.cidr)}/${srcData.cidr} while Destination is on ${getSubnetAddress(dstData.ip, dstData.cidr)}/${dstData.cidr}. Traffic will forward to Default Gateway ${srcData.gateway || 'None'}.`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-zinc-800/80 bg-zinc-950/60">
          <button
            type="button"
            onClick={() => setIsPingModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSendPing}
            disabled={hostNodes.length < 2 || currentSourceId === currentDestId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-zinc-950 bg-gradient-to-r from-purple-400 to-sky-400 hover:from-purple-300 hover:to-sky-300 transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send ICMP Ping</span>
          </button>
        </div>
      </div>
    </div>
  );
};
