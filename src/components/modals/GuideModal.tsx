import React, { useState, useEffect } from 'react';
import {
  X,
  Network,
  Sliders,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Monitor,
  Router as RouterIcon,
  Sparkles,
} from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';

const STORAGE_KEY = 'hoptrace_guide_dismissed';

export const GuideModal: React.FC = () => {
  const isGuideOpen = useNetworkStore((state) => state.isGuideOpen);
  const setIsGuideOpen = useNetworkStore((state) => state.setIsGuideOpen);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setIsGuideOpen(true);
      }
    } catch {
      // Storage access gracefully handled in sandboxed contexts
    }
  }, [setIsGuideOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setIsGuideOpen(false);
  };

  if (!isGuideOpen) return null;

  const steps = [
    {
      stepNumber: 1,
      title: 'Build Your Topology',
      subtitle: 'Spawn Hosts, Switches, and Routers from the toolbar and drag between ports to connect them.',
      badge: 'Step 1 • Topology Canvas',
      color: 'sky',
      icon: Network,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-1.5">
              <Monitor className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">PC Host</span>
              <span className="text-[10px] text-zinc-400 font-mono">End Device</span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center gap-1.5">
              <Network className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">L2 Switch</span>
              <span className="text-[10px] text-zinc-400 font-mono">Port Multiplexer</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-1.5">
              <RouterIcon className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">L3 Router</span>
              <span className="text-[10px] text-zinc-400 font-mono">Default Gateway</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Click & Drag Connection Handles:</strong> Drag from any handle to connect equipment. Handles snap automatically within a 35px radius.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Connection Validation:</strong> Duplicate links and self-connections are rejected to protect topology structure.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Smooth-step Edge Routing:</strong> Animated data-flow cables visualize real-time link states and port connections.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 2,
      title: 'Configure Interfaces',
      subtitle: 'Click any equipment to inspect and edit IPs, CIDR subnets, and Default Gateways with real-time validation.',
      badge: 'Step 2 • Real-Time Validation',
      color: 'emerald',
      icon: Sliders,
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
              <span className="font-sans font-medium text-zinc-300">Host-1 Interface Drawer</span>
              <span className="text-emerald-400 font-semibold">Live Validated</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-sans">IPv4 Address:</span>
              <span className="text-emerald-400 font-medium">192.168.1.10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-sans">Subnet Mask:</span>
              <span className="text-zinc-300">/24 (255.255.255.0)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-sans">Default Gateway:</span>
              <span className="text-zinc-300">192.168.1.1</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Instant Canvas Sync:</strong> Valid input updates automatically sync back to canvas cards and node headers without a page refresh.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Zod Schema Guardrails:</strong> Leading zeroes (e.g. 01.1.1.1), out-of-range octets (&gt; 255), and invalid CIDR masks are caught immediately.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Multi-Interface Router Table:</strong> Add or remove routed interfaces (<code className="text-amber-400 font-mono">eth0</code>, <code className="text-amber-400 font-mono">eth1</code>) with distinct IP subnets and MAC addresses.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 3,
      title: 'Simulate & Trace Packets',
      subtitle: 'Trigger ICMP pings and inspect L2/L3 header transformations hop-by-hop.',
      badge: 'Step 3 • Hop-by-Hop Tracing',
      color: 'amber',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-sans">Simulation Pipeline:</span>
              <span className="text-amber-400">ICMP Echo Request</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono py-1 px-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="text-emerald-400 font-semibold">Host-1</span>
              <span className="text-zinc-500">→</span>
              <span className="text-indigo-400 font-semibold">Switch-1</span>
              <span className="text-zinc-500">→</span>
              <span className="text-amber-400 font-semibold">Router-1</span>
              <span className="text-zinc-500">→</span>
              <span className="text-emerald-400 font-semibold">Host-2</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">L2 Address Resolution (ARP):</strong> Observe dynamic MAC table discovery and frame encapsulation across collision domains.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">L3 Routing Decision & TTL:</strong> Routers look up destination routing tables, decrement TTL counters, and re-encapsulate Ethernet frames.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-100">Packet Drop Detection:</strong> Immediate visual alerts when subnets are mismatched or a gateway is unreachable.
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[activeStep];
  const StepIcon = current.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="guide-modal-title"
                className="text-base font-semibold text-zinc-100 leading-tight"
              >
                How to use HopTrace
              </h2>
              <p className="text-xs text-zinc-400">
                Interactive Network Topology & Packet Simulation Guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close guide modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-5 pt-3 gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.stepNumber}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`flex-1 pb-3 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeStep === idx
                  ? 'border-sky-500 text-sky-300 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  activeStep === idx
                    ? 'bg-sky-500 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {s.stepNumber}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[10px] uppercase font-mono tracking-wider text-sky-300">
              {current.badge}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{current.title}</h3>
              <p className="text-xs text-zinc-400">{current.subtitle}</p>
            </div>
          </div>

          <div className="pt-2">{current.content}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">v0.1.0-alpha</span>
          </div>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => prev - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 bg-zinc-800/60 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
