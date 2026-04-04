import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Target, Layout, Image as ImageIcon, X, Edit2, Save, Upload, Loader2, Clipboard } from 'lucide-react';
import { compressImage, extractScreenBlueprint } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface ScreenPrimaryInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenPrimaryInfo: React.FC<ScreenPrimaryInfoProps> = ({ isOpen, onClose }) => {
  const { 
    projects, 
    activeProjectId, 
    updateScreenPrimaryInfo,
    apiKey,
    selectedModel,
    openRouterApiKey,
    openRouterModel
  } = useAppStore();
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreen = activeProject?.screens.find(s => s.id === activeProject.activeScreenId);

  const [objective, setObjective] = useState(activeScreen?.primaryObjective || '');
  const [components, setComponents] = useState(activeScreen?.primaryComponents || '');
  const [image, setImage] = useState(activeScreen?.primaryImage || '');
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (activeScreen && isOpen) {
      setObjective(activeScreen.primaryObjective || '');
      setComponents(activeScreen.primaryComponents || '');
      setImage(activeScreen.primaryImage || '');
    }
  }, [activeScreen?.id, isOpen]);

  const handleSave = () => {
    if (activeProject && activeScreen) {
      updateScreenPrimaryInfo(activeProject.id, activeScreen.id, {
        primaryObjective: objective,
        primaryComponents: components,
        primaryImage: image
      });
      onClose();
    }
  };

  const processImage = async (base64: string) => {
    setIsExtracting(true);
    try {
      const compressed = await compressImage(base64);
      setImage(compressed);
      
      const { objective: extractedObjective, components: extractedComponents } = await extractScreenBlueprint(
        compressed,
        selectedModel,
        apiKey,
        { apiKey: openRouterApiKey, model: openRouterModel }
      );
      
      if (extractedObjective) setObjective(extractedObjective);
      if (extractedComponents) setComponents(extractedComponents);
    } catch (err) {
      console.error('Failed to extract blueprint:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            await processImage(base64);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, [selectedModel, apiKey, openRouterApiKey, openRouterModel]);

  if (!activeProject || !activeScreen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onPaste={handlePaste}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest">Screen Blueprint</h2>
                  <p className="text-[10px] text-zinc-500 font-medium">Define the core DNA of this screen</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      Primary Objective
                    </label>
                    <textarea 
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="What is the main goal of this screen?"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 resize-none min-h-[100px] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      Key Components
                    </label>
                    <textarea 
                      value={components}
                      onChange={(e) => setComponents(e.target.value)}
                      placeholder="List main sections, buttons, or features..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 resize-none min-h-[150px] transition-all font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Right Side: Image Reference */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    Primary Reference Design
                  </label>
                  <div className="relative aspect-[4/3] bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-all">
                    {image ? (
                      <>
                        <img src={image} className="w-full h-full object-cover" alt="Primary Ref" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setImage('')}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <label className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg cursor-pointer">
                            <Upload className="w-5 h-5" />
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600 p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-400">Paste or Upload Reference</p>
                          <p className="text-[10px] text-zinc-600 leading-relaxed">AI will automatically extract objective and components from your image</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}

                    {isExtracting && (
                      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-white">AI Analyzing...</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Extracting Blueprint</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
                        <Clipboard className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Pro Tip</p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Paste a screenshot of a design you like. AI will analyze it and fill out the objective and components for you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                Save Blueprint
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
