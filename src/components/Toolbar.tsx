import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Network,
  Router as RouterIcon,
  Plus,
  Trash2,
  Activity,
  HelpCircle,
  Send,
  Layers,
  Sparkles,
  Download,
  Upload,
  Palette,
  ChevronDown,
  Check,
  Binary,
} from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import {
  MAX_NODES,
  topologyExportSchema,
  type TopologyExportData,
  type AppNode,
  type AppEdge,
  type PresetType,
} from '../types/network';

export const Toolbar: React.FC = () => {
  const {
    nodes,
    edges,
    addNode,
    setIsClearConfirmOpen,
    setIsGuideOpen,
    setIsPingModalOpen,
    setIsWiresharkOpen,
    theme,
    setTheme,
    loadPreset,
    autoLayout,
    loadTopology,
  } = useNetworkStore();

  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const isMaxReached = nodes.length >= MAX_NODES;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        presetsRef.current &&
        !presetsRef.current.contains(e.target as HTMLElement)
      ) {
        setIsPresetsOpen(false);
      }
      if (
        themeRef.current &&
        !themeRef.current.contains(e.target as HTMLElement)
      ) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    const data: TopologyExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoptrace-topology-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (
          Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
          Object.prototype.hasOwnProperty.call(parsed, 'constructor') ||
          Object.prototype.hasOwnProperty.call(parsed, 'prototype')
        ) {
          alert('Security violation: Malformed JSON object structure detected.');
          return;
        }

        const validation = topologyExportSchema.safeParse(parsed);
        if (!validation.success) {
          const firstError =
            validation.error.issues[0]?.message ||
            'Invalid topology JSON schema structure';
          alert(`Topology Import Error: ${firstError}`);
          return;
        }

        const validData = validation.data;
        loadTopology(
          validData.nodes as AppNode[],
          validData.edges as AppEdge[]
        );
      } catch {
        alert('Invalid file format: Please provide a valid HopTrace JSON topology.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSelectPreset = (presetId: PresetType) => {
    loadPreset(presetId);
    setIsPresetsOpen(false);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 px-2.5 sm:px-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 select-none">
        {/* Brand & Stats */}
        <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-xs font-semibold tracking-wide text-zinc-100">
              HopTrace
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {nodes.length}/{MAX_NODES} nodes
            </span>
          </div>
        </div>

        {/* Equipment Palette */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => addNode('host')}
            disabled={isMaxReached}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Add Host</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('switch')}
            disabled={isMaxReached}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-indigo-950/40 hover:text-indigo-300 hover:border-indigo-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Add Switch</span>
          </button>

          <button
            type="button"
            onClick={() => addNode('router')}
            disabled={isMaxReached}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-amber-950/40 hover:text-amber-300 hover:border-amber-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <RouterIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Add Router</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="pl-1.5 border-l border-zinc-800 flex items-center gap-1 sm:gap-1.5">
          {/* Simulate Ping */}
          <button
            type="button"
            onClick={() => setIsPingModalOpen(true)}
            title="Simulate ICMP Ping"
            aria-label="Simulate ICMP Ping"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-purple-300 bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/50 hover:text-purple-200 hover:border-purple-400 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Simulate Ping</span>
          </button>

          {/* Wireshark Packet Dissector */}
          <button
            type="button"
            onClick={() => setIsWiresharkOpen(true)}
            title="Wireshark / Deep Packet Inspection"
            aria-label="Wireshark / Deep Packet Inspection"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-blue-300 bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 hover:text-blue-200 hover:border-blue-400 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Binary className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Wireshark</span>
          </button>

          {/* Presets Dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              type="button"
              onClick={() => setIsPresetsOpen((prev) => !prev)}
              title="Topology Presets"
              aria-label="Topology Presets"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Presets</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isPresetsOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('simple-switch')}
                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-zinc-100">
                    Simple Switch LAN
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    2 Hosts connected via 1 Switch on 192.168.1.0/24 (L2 switching).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('dual-routed')}
                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-zinc-100">
                    Dual Routed Subnets
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    Host-1 -&gt; Switch-1 -&gt; Router-1 -&gt; Host-2 (L3 gateway routing).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('unreachable-gateway')}
                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-zinc-100">
                    Unreachable Gateway
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    Host with unresolvable gateway demonstrating packet drop.
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Auto Layout / Tidy */}
          <button
            type="button"
            onClick={autoLayout}
            title="Auto Layout / Tidy Canvas"
            aria-label="Auto Layout / Tidy Canvas"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Tidy</span>
          </button>

          {/* Export Topology */}
          <button
            type="button"
            onClick={handleExport}
            title="Export Topology JSON"
            aria-label="Export Topology JSON"
            className="p-1.5 sm:px-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Import Topology */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import Topology JSON"
            aria-label="Import Topology JSON"
            className="p-1.5 sm:px-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Theme Switcher Dropdown */}
          <div className="relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => setIsThemeOpen((prev) => !prev)}
              title="Theme Switcher"
              aria-label="Theme Switcher"
              className="p-1.5 sm:px-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Palette className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {isThemeOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('obsidian');
                    setIsThemeOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-700" />
                    <span className="text-zinc-200">Obsidian Grid</span>
                  </div>
                  {theme === 'obsidian' && (
                    <Check className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme('blueprint');
                    setIsThemeOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-600" />
                    <span className="text-zinc-200">Lab Blueprint</span>
                  </div>
                  {theme === 'blueprint' && (
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Guide Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            title="How to use HopTrace Guide"
            aria-label="How to use HopTrace Guide"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-sky-300 bg-sky-950/40 border border-sky-500/30 hover:bg-sky-900/50 hover:text-sky-200 hover:border-sky-400 active:scale-95 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">Guide</span>
          </button>

          {/* Clear Canvas with Confirmation */}
          {nodes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              title="Clear all nodes"
              aria-label="Clear all nodes"
              className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
