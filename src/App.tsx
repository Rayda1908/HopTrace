import React from 'react';
import { Toolbar } from './components/Toolbar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { NodeConfigDrawer } from './components/panels/NodeConfigDrawer';
import { PacketInspector } from './components/panels/PacketInspector';
import { GuideModal } from './components/modals/GuideModal';
import { PingModal } from './components/modals/PingModal';
import { ClearConfirmModal } from './components/modals/ClearConfirmModal';
import { WiresharkModal } from './components/modals/WiresharkModal';
import { useNetworkStore } from './store/networkStore';

export const App: React.FC = () => {
  const { nodes, edges, theme, isInspectorOpen } = useNetworkStore();

  return (
    <main
      className={`w-screen h-screen relative overflow-hidden flex flex-col font-sans text-zinc-100 transition-colors duration-300 ${
        theme === 'blueprint' ? 'bg-[#0a1128]' : 'bg-[#09090b]'
      }`}
    >
      <Toolbar />
      <div className="flex-1 w-full h-full relative">
        <NetworkCanvas />
        <NodeConfigDrawer />
        <GuideModal />
        <PingModal />
        <PacketInspector />
        <ClearConfirmModal />
        <WiresharkModal />
      </div>

      {!isInspectorOpen && (
        <footer className="fixed bottom-3 left-4 z-30 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono shadow-lg">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Topology Active
          </span>
          <span className="text-zinc-600">|</span>
          <span>{nodes.length} Nodes</span>
          <span className="text-zinc-600">|</span>
          <span>{edges.length} Links</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 font-sans">Drag handles to connect links</span>
        </footer>
      )}
    </main>
  );
};

export default App;
