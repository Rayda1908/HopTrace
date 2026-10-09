import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Terminal,
  Binary,
} from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';

export const PacketInspector: React.FC = () => {
  const simulationResult = useNetworkStore((state) => state.simulationResult);
  const isInspectorOpen = useNetworkStore((state) => state.isInspectorOpen);
  const setIsInspectorOpen = useNetworkStore((state) => state.setIsInspectorOpen);
  const setIsWiresharkOpen = useNetworkStore((state) => state.setIsWiresharkOpen);
  const isSimulating = useNetworkStore((state) => state.isSimulating);
  const runPingSimulation = useNetworkStore((state) => state.runPingSimulation);

  const [isMinimized, setIsMinimized] = useState(false);

  if (!isInspectorOpen || !simulationResult) return null;

  const isSuccess = simulationResult.status === 'success';

  const handleReplay = () => {
    runPingSimulation(
      simulationResult.sourceHostId,
      simulationResult.destHostId
    );
  };

  const getStepBadge = (type: string) => {
    switch (type) {
      case 'arp':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-400">
            ARP
          </span>
        );
      case 'switch':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            SWITCH
          </span>
        );
      case 'route':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-400">
            ROUTE
          </span>
        );
      case 'ttl':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            TTL
          </span>
        );
      case 'reply':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            REPLY
          </span>
        );
      case 'drop':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            DROP
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 border border-zinc-700 text-zinc-400">
            INFO
          </span>
        );
    }
  };

  return (
    <section
      aria-label="Packet Inspector Diagnostics"
      className="fixed bottom-0 left-0 right-0 z-40 max-w-4xl mx-auto px-4 pb-3"
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col transition-all duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 shrink-0">
              <Terminal className="w-4 h-4 text-sky-400" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs font-semibold text-zinc-100 font-sans tracking-wide shrink-0">
                Packet Inspector
              </h2>
              <span className="text-zinc-600 hidden md:inline">|</span>
              <span className="text-[11px] font-mono text-zinc-400 hidden md:inline truncate">
                ICMP Trace Diagnostics
              </span>
            </div>

            {/* Status Pill */}
            {isSuccess ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-medium shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Success (0% loss)</span>
                <span className="sm:hidden">0% Loss</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[11px] font-medium shrink-0">
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dropped (100% loss)</span>
                <span className="sm:hidden">Dropped</span>
              </span>
            )}

            {isSimulating && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[10px] animate-pulse shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="hidden sm:inline">Traversing...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsWiresharkOpen(true)}
              title="Open in Wireshark Packet Dissector"
              aria-label="Open in Wireshark Packet Dissector"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-300 bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 hover:text-blue-200 transition-colors cursor-pointer"
            >
              <Binary className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Wireshark</span>
            </button>

            <button
              type="button"
              onClick={handleReplay}
              title="Replay packet trace"
              aria-label="Replay packet trace"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              title={isMinimized ? 'Expand inspector' : 'Minimize inspector'}
              aria-label={isMinimized ? 'Expand inspector' : 'Minimize inspector'}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsInspectorOpen(false)}
              title="Close inspector"
              aria-label="Close inspector"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Diagnostic Body */}
        {!isMinimized && (
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-zinc-800/80 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-sans">
                  Round Trip Time
                </span>
                <span className="text-zinc-200 font-semibold">
                  ~{simulationResult.roundTripMs} ms
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-sans">
                  TTL Remaining
                </span>
                <span className="text-amber-400 font-semibold">
                  {simulationResult.ttlRemaining}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-sans">
                  Path Length
                </span>
                <span className="text-sky-400 font-semibold">
                  {simulationResult.pathEdgeIds.length} Hops
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-sans">
                  Routing Scope
                </span>
                <span className="text-purple-400 font-semibold">
                  {simulationResult.isSameSubnet ? 'Layer 2 Local' : 'Layer 3 Routed'}
                </span>
              </div>
            </div>

            {/* Diagnostic Events Feed */}
            <div className="space-y-2 font-mono text-xs">
              {simulationResult.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1 hover:border-zinc-700/80 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-200">
                      {step.description}
                    </span>
                    {getStepBadge(step.type)}
                  </div>
                  {step.details && (
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {step.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
