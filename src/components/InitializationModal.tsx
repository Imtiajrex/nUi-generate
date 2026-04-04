import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Upload, Key, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InitializationModal: React.FC = () => {
  const { 
    apiKey, setApiKey, 
    openRouterApiKey, setOpenRouterApiKey,
    openRouterModel, setOpenRouterModel,
    createProject, importProject, projects,
    _hasHydrated
  } = useAppStore();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempOpenRouterKey, setTempOpenRouterKey] = useState(openRouterApiKey);
  const [tempOpenRouterModel, setTempOpenRouterModel] = useState(openRouterModel);
  const [useOpenRouter, setUseOpenRouter] = useState(false);

  React.useEffect(() => {
    if (_hasHydrated) {
      const shouldShow = projects.length === 0 || (!apiKey && !openRouterApiKey);
      setShow(shouldShow);
      setTempKey(apiKey);
      setTempOpenRouterKey(openRouterApiKey);
      setTempOpenRouterModel(openRouterModel);
    }
  }, [_hasHydrated, projects.length, apiKey, openRouterApiKey, openRouterModel]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (!useOpenRouter && !tempKey && !process.env.API_KEY && !process.env.GEMINI_API_KEY) {
      // Allow empty key if environment variable exists
    } else if (!useOpenRouter && !tempKey && !process.env.API_KEY && !process.env.GEMINI_API_KEY) {
      return;
    }
    if (useOpenRouter && !tempOpenRouterKey) return;

    setApiKey(tempKey);
    setOpenRouterApiKey(tempOpenRouterKey);
    setOpenRouterModel(tempOpenRouterModel);
    if (useOpenRouter) {
      useAppStore.getState().setSelectedModel('openrouter');
    }
    createProject(name, desc);
    setShow(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string);
        importProject(project);
        setShow(false);
      } catch (err) {
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      {show && (
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
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-500" />
                Welcome to Gemini UI Forge
              </h2>
              <p className="text-zinc-400 text-sm mt-1">Get started by creating or importing a project.</p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-4">
                <button
                  type="button"
                  onClick={() => setUseOpenRouter(false)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${!useOpenRouter ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setUseOpenRouter(true)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${useOpenRouter ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                >
                  OpenRouter
                </button>
              </div>

              {!useOpenRouter ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder="Enter your Gemini API key..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                      OpenRouter API Key
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        value={tempOpenRouterKey}
                        onChange={(e) => setTempOpenRouterKey(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        required={useOpenRouter}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                      OpenRouter Model
                    </label>
                    <input
                      type="text"
                      value={tempOpenRouterModel}
                      onChange={(e) => setTempOpenRouterModel(e.target.value)}
                      placeholder="e.g., anthropic/claude-3.5-sonnet"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      required={useOpenRouter}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/50">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., E-commerce Dashboard"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What are you building?"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
                <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import JSON
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
