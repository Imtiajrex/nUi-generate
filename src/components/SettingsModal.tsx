import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, Key, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    apiKey, setApiKey, 
    openRouterApiKey, setOpenRouterApiKey,
    openRouterModel, setOpenRouterModel
  } = useAppStore();

  const [tempKey, setTempKey] = useState(apiKey);
  const [tempOpenRouterKey, setTempOpenRouterKey] = useState(openRouterApiKey);
  const [tempOpenRouterModel, setTempOpenRouterModel] = useState(openRouterModel);

  const handleSave = () => {
    setApiKey(tempKey);
    setOpenRouterApiKey(tempOpenRouterKey);
    setOpenRouterModel(tempOpenRouterModel);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Settings</h2>
              <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gemini Configuration</h3>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="password"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder="Enter Gemini API key..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">OpenRouter Configuration</h3>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="password"
                      value={tempOpenRouterKey}
                      onChange={(e) => setTempOpenRouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    Custom Model
                  </label>
                  <div className="relative">
                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={tempOpenRouterModel}
                      onChange={(e) => setTempOpenRouterModel(e.target.value)}
                      placeholder="e.g., anthropic/claude-3.5-sonnet"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-lg shadow-blue-600/20"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
