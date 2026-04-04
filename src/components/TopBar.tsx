import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Download, Upload, ChevronDown, Sparkles, Zap, Box, ArrowLeft, Palette, Settings, Cpu } from 'lucide-react';
import { ModelType } from '../types';
import { DesignSystemModal } from './DesignSystemModal';
import { GoogleSync } from './GoogleSync';
import { SettingsModal } from './SettingsModal';

export const TopBar: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    selectProject, 
    selectedModel, 
    setSelectedModel, 
    importProject,
    isDesignSystemOpen,
    setIsDesignSystemOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    openRouterModel
  } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleExport = () => {
    if (!activeProject) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeProject));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-project.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string);
        importProject(project);
      } catch (err) {
        console.error('Invalid project file:', err);
      }
    };
    reader.readAsText(file);
  };

  const getModelInfo = (model: ModelType) => {
    switch (model) {
      case 'gemini-3.1-pro-preview':
        return { name: 'Gemini 3.1 Pro', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> };
      case 'gemini-3.1-flash-lite-preview':
        return { name: 'Gemini 3.1 Flash Lite', icon: <Zap className="w-3.5 h-3.5 text-blue-400" /> };
      case 'gemini-3-flash-preview':
        return { name: 'Gemini 3 Flash', icon: <Zap className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'openrouter':
        return { name: openRouterModel || 'OpenRouter', icon: <Cpu className="w-3.5 h-3.5 text-orange-400" /> };
      default:
        return { name: 'Gemini 3 Flash', icon: <Zap className="w-3.5 h-3.5 text-emerald-400" /> };
    }
  };

  const modelInfo = getModelInfo(selectedModel);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-40">
      <div className="flex items-center gap-4">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => selectProject(null)}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            {activeProjectId ? <ArrowLeft className="w-5 h-5 text-white" /> : <Box className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none uppercase">nUi</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">
              {activeProjectId ? 'Back to Projects' : 'Design with ai'}
            </p>
          </div>
        </div>
        
        {activeProject && (
          <div className="h-8 w-px bg-zinc-800 mx-2" />
        )}
        
        {activeProject && (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200">{activeProject.name}</span>
            <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">{activeProject.description || 'No description'}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <GoogleSync />
        <div className="h-6 w-px bg-zinc-800" />
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors border border-zinc-700/50">
            {modelInfo.icon}
            {modelInfo.name}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-50">
            {(['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'openrouter'] as ModelType[]).map((m) => {
              const info = getModelInfo(m);
              return (
                <button 
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`w-full px-4 py-2 text-left text-xs hover:bg-zinc-800 flex items-center gap-2 ${selectedModel === m ? 'text-white bg-zinc-800/50' : 'text-zinc-400'}`}
                >
                  {info.icon}
                  {info.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800" />

        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        <div className="h-6 w-px bg-zinc-800" />

        <button 
          onClick={() => setIsDesignSystemOpen(true)}
          disabled={!activeProject}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Design System"
        >
          <Palette className="w-4.5 h-4.5" />
        </button>

        <button 
          onClick={handleExport}
          disabled={!activeProject}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export Project"
        >
          <Download className="w-4.5 h-4.5" />
        </button>
        
        <label className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Import Project">
          <Upload className="w-4.5 h-4.5" />
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>
    </header>
  );
};
