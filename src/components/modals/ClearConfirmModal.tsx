import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useNetworkStore } from '../../store/networkStore';

export const ClearConfirmModal: React.FC = () => {
  const isClearConfirmOpen = useNetworkStore(
    (state) => state.isClearConfirmOpen
  );
  const setIsClearConfirmOpen = useNetworkStore(
    (state) => state.setIsClearConfirmOpen
  );
  const clearCanvas = useNetworkStore((state) => state.clearCanvas);

  if (!isClearConfirmOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="clear-modal-title"
              className="text-sm font-semibold text-zinc-100"
            >
              Clear Canvas?
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              This will remove all active nodes and links from the topology.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(false)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => clearCanvas()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-rose-100 bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-950/40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
