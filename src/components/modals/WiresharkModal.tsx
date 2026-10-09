import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  FileCode,
  Download,
  Filter,
} from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';
import {
  dissectSimulationResult,
  createDefaultDissectedPackets,
  formatHexDump,
} from '../../lib/simulator/packetDissector';
import type { DissectedPacket, DissectorTreeSection } from '../../types/dissector';

export const WiresharkModal: React.FC = () => {
  const isWiresharkOpen = useNetworkStore((state) => state.isWiresharkOpen);
  const setIsWiresharkOpen = useNetworkStore((state) => state.setIsWiresharkOpen);
  const simulationResult = useNetworkStore((state) => state.simulationResult);
  const nodes = useNetworkStore((state) => state.nodes);

  const [selectedPacketIndex, setSelectedPacketIndex] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '0': true,
    '1': true,
    '2': true,
    '3': true,
  });

  const packets: DissectedPacket[] = useMemo(() => {
    if (simulationResult) {
      const simNodes = nodes.map((n) => ({
        id: n.id,
        data: n.data,
      }));
      const dissected = dissectSimulationResult(simulationResult, simNodes);
      if (dissected.length > 0) return dissected;
    }
    return createDefaultDissectedPackets();
  }, [simulationResult, nodes]);

  const filteredPackets = useMemo(() => {
    if (!filterText.trim()) return packets;
    const lower = filterText.toLowerCase().trim();
    return packets.filter(
      (p) =>
        p.protocol.toLowerCase().includes(lower) ||
        p.source.toLowerCase().includes(lower) ||
        p.destination.toLowerCase().includes(lower) ||
        p.info.toLowerCase().includes(lower)
    );
  }, [packets, filterText]);

  const activePacket = filteredPackets[selectedPacketIndex] || filteredPackets[0] || packets[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWiresharkOpen(false);
      }
    };
    if (isWiresharkOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWiresharkOpen, setIsWiresharkOpen]);

  if (!isWiresharkOpen) return null;

  const hexLines = activePacket ? formatHexDump(activePacket.rawBytes) : [];

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleExportPcapText = () => {
    if (!activePacket) return;
    const exportContent = packets
      .map((p) => {
        const lines = formatHexDump(p.rawBytes);
        return `Frame ${p.no} (${p.length} bytes, ${p.protocol}):\n` +
          lines.map((l) => `${l.offset}  ${l.hex}  ${l.ascii}`).join('\n');
      })
      .join('\n\n');

    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoptrace-dissection-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Packet Dissector"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="flex flex-col w-full max-w-6xl h-[92vh] max-h-[850px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-100 tracking-wide">
                  HopTrace Packet Dissector
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Wireshark View
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Layer 2-4 Deep Packet Inspection • Raw Frame Decode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportPcapText}
              title="Export packet hex dump to text"
              aria-label="Export packet hex dump"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Export Capture</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWiresharkOpen(false)}
              aria-label="Close dissector"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Filter Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/95 border-b border-zinc-800/80 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-400 pl-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-[11px] text-zinc-300">Filter:</span>
          </div>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setSelectedPacketIndex(0);
              }}
              placeholder="Apply display filter (e.g. icmp, arp, 192.168.1.10)..."
              className="w-full pl-8 pr-16 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => {
                  setFilterText('');
                  setSelectedPacketIndex(0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-500 px-2 shrink-0">
            <span>Packets: {packets.length}</span>
            <span>•</span>
            <span>Shown: {filteredPackets.length}</span>
          </div>
        </div>

        {/* 3-Pane Split Layout */}
        <div className="flex flex-col flex-1 min-h-0 divide-y divide-zinc-800">
          {/* Top Pane: Packet List */}
          <div className="h-[38%] min-h-[140px] overflow-auto bg-zinc-950">
            <table className="w-full border-collapse font-mono text-[11px] text-left select-none">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-sans tracking-wider z-10">
                <tr>
                  <th className="py-1.5 px-3 w-14">No.</th>
                  <th className="py-1.5 px-2 w-24">Time (s)</th>
                  <th className="py-1.5 px-2 w-36">Source</th>
                  <th className="py-1.5 px-2 w-36">Destination</th>
                  <th className="py-1.5 px-2 w-20">Protocol</th>
                  <th className="py-1.5 px-2 w-16">Length</th>
                  <th className="py-1.5 px-3">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 font-sans">
                      No packets match the display filter &ldquo;{filterText}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((pkt, index) => {
                    const isSelected = activePacket?.no === pkt.no;
                    return (
                      <tr
                        key={pkt.no}
                        onClick={() => setSelectedPacketIndex(index)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-medium'
                            : index % 2 === 0
                            ? 'bg-zinc-950/80 hover:bg-zinc-800/60 text-zinc-300'
                            : 'bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <td className="py-1 px-3 text-zinc-400 group-[.selected]:text-white">
                          {pkt.no}
                        </td>
                        <td className="py-1 px-2">{pkt.timeSec.toFixed(6)}</td>
                        <td className="py-1 px-2 truncate max-w-[140px]" title={pkt.source}>
                          {pkt.source}
                        </td>
                        <td className="py-1 px-2 truncate max-w-[140px]" title={pkt.destination}>
                          {pkt.destination}
                        </td>
                        <td className="py-1 px-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              isSelected
                                ? 'bg-blue-800 text-white'
                                : pkt.protocol === 'ARP'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="py-1 px-2">{pkt.length}</td>
                        <td className="py-1 px-3 truncate" title={pkt.info}>
                          {pkt.info}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Split: Details (Left) + Hex Dump (Right) */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
            {/* Bottom-Left Pane: Packet Details Tree */}
            <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-zinc-900">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-300 shrink-0">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Packet Details</span>
                {activePacket && (
                  <span className="text-zinc-500 font-mono text-[10px]">
                    (Frame #{activePacket.no} • {activePacket.protocol})
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs">
                {activePacket ? (
                  activePacket.summaryTree.map((section: DissectorTreeSection, secIdx: number) => {
                    const isExpanded = !!expandedSections[secIdx];
                    return (
                      <div
                        key={secIdx}
                        className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(secIdx)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer select-none"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px] leading-tight truncate">
                            {section.title}
                          </span>
                        </button>

                        {isExpanded && section.fields && (
                          <div className="px-4 py-1.5 pb-2 border-t border-zinc-800/60 bg-zinc-950/80 space-y-0.5 text-[11px]">
                            {section.fields.map((field, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-start justify-between py-0.5 text-zinc-400 hover:text-zinc-200"
                              >
                                <span className="text-zinc-500 shrink-0 mr-2">
                                  {field.label}:
                                </span>
                                <span className="text-zinc-300 font-mono text-right truncate">
                                  {field.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-zinc-500 font-sans text-xs">
                    No packet selected.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom-Right Pane: 16-byte Hex Dump */}
            <div className="w-full md:w-1/2 flex flex-col min-h-0 bg-zinc-950">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-300 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Raw Packet Hex Dump (16-byte offset)</span>
                </div>
                {activePacket && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    {activePacket.rawBytes.length} bytes
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed select-text bg-[#08080a]">
                {hexLines.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 font-sans text-xs">
                    No packet byte data available.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {hexLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 text-zinc-400 hover:bg-blue-950/30 hover:text-zinc-200 px-1 rounded transition-colors"
                      >
                        <span className="text-zinc-500 select-none w-10 shrink-0 font-semibold">
                          {line.offset}
                        </span>
                        <span className="text-sky-300/90 whitespace-pre shrink-0">
                          {line.hex}
                        </span>
                        <span className="text-emerald-400/90 whitespace-pre font-semibold">
                          {line.ascii}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-t border-zinc-800 text-[11px] font-mono text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Ready</span>
            <span>•</span>
            <span>Mode: Wireshark Dissector</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Selected: Frame #{activePacket ? activePacket.no : 0} (
              {activePacket ? activePacket.protocol : 'None'})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
