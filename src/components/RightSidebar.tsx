import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Layout, CheckCircle, Clock, Trash2, Plus, ChevronRight, Star, Target, Edit2 } from 'lucide-react';
import { ScreenPrimaryInfo } from './ScreenPrimaryInfo';

export const RightSidebar: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    addScreen, 
    deleteScreen, 
    selectScreen, 
    toggleApproveScreen, 
    deleteIteration,
    selectedIterationIds,
    toggleIterationSelection
  } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreen = activeProject?.screens.find(s => s.id === activeProject.activeScreenId);
  const [activeTab, setActiveTab] = useState<'all' | 'approved'>('all');
  const [newScreenName, setNewScreenName] = useState('');
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);

  const screens = activeProject?.screens.filter(s => activeTab === 'all' || s.isApproved) || [];

  const getScreenTotalCost = (screen: any) => {
    return screen.iterations.reduce((sum: number, it: any) => sum + (it.cost || 0), 0);
  };

  const getProjectTotalCost = () => {
    return activeProject?.screens.reduce((sum, screen) => sum + getScreenTotalCost(screen), 0) || 0;
  };

  const handleAddScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScreenName || !activeProjectId) return;
    addScreen(activeProjectId, newScreenName);
    setNewScreenName('');
  };

  return (
    <aside className="w-72 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'all' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          All Screens
        </button>
        <button 
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'approved' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Approved
        </button>
      </div>

      <div className="p-4 space-y-3">
        {activeScreen && (
          <button 
            onClick={() => setIsBlueprintOpen(true)}
            className="w-full group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-800/50"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Screen Blueprint</span>
              </div>
              <Edit2 className="w-3 h-3 text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-[10px] text-zinc-500 line-clamp-1 italic">
              {activeScreen.primaryObjective || 'Define screen objective and components...'}
            </p>
          </button>
        )}
        
        <ScreenPrimaryInfo 
          isOpen={isBlueprintOpen} 
          onClose={() => setIsBlueprintOpen(false)} 
        />
        
        <form onSubmit={handleAddScreen} className="relative">
          <input 
            type="text"
            value={newScreenName}
            onChange={(e) => setNewScreenName(e.target.value)}
            placeholder="New screen name..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-blue-500">
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {screens.map((screen) => (
          <div 
            key={screen.id}
            className={`group rounded-xl border transition-all overflow-hidden ${activeProject?.activeScreenId === screen.id ? 'bg-zinc-800/50 border-zinc-700' : 'border-transparent hover:bg-zinc-800/30'}`}
          >
            {/* Screen Header - Clickable to select screen */}
            <div 
              onClick={() => selectScreen(activeProject!.id, screen.id)}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layout className={`w-4 h-4 ${activeProject?.activeScreenId === screen.id ? 'text-blue-500' : 'text-zinc-600'}`} />
                  <span className={`text-xs font-medium ${activeProject?.activeScreenId === screen.id ? 'text-white' : 'text-zinc-400'}`}>
                    {screen.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleApproveScreen(activeProject!.id, screen.id); }}
                    className={`p-1 rounded hover:bg-zinc-700 ${screen.isApproved ? 'text-amber-500' : 'text-zinc-500'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${screen.isApproved ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteScreen(activeProject!.id, screen.id); }}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {screen.iterations?.length || 0} versions
                </div>
                {getScreenTotalCost(screen) > 0 && (
                  <div className="flex items-center gap-1 text-emerald-500/70">
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    ${getScreenTotalCost(screen).toFixed(4)}
                  </div>
                )}
                {screen.isApproved && (
                  <div className="flex items-center gap-1 text-emerald-500/70">
                    <CheckCircle className="w-3 h-3" />
                    Approved
                  </div>
                )}
              </div>
            </div>

            {/* Iterations List - Only for active screen */}
            {activeProject?.activeScreenId === screen.id && (screen.iterations?.length || 0) > 0 && (
              <div className="px-3 pb-3 space-y-1">
                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  {screen.iterations.slice().reverse().map((it, idx) => {
                    const actualIdx = (screen.iterations?.length || 0) - 1 - idx;
                    const isActive = screen.activeIterationIndex === actualIdx;
                    const isSelected = selectedIterationIds.includes(it.id);
                    return (
                      <div 
                        key={it.id} 
                        onClick={() => useAppStore.getState().setIterationIndex(activeProject!.id, screen.id, actualIdx)}
                        className={`group/it flex items-center justify-between text-[9px] py-1.5 px-2 rounded transition-colors cursor-pointer border ${
                          isActive 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIterationSelection(it.id);
                            }}
                            className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'bg-zinc-900 border-zinc-700'
                            }`}
                          >
                            {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
                          </button>
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <span className="truncate font-medium">{it.prompt}</span>
                            <div className="flex items-center gap-2 opacity-60">
                              <span>{new Date(it.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {it.cost && (
                                <span className="text-emerald-500 font-mono">${it.cost.toFixed(4)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteIteration(activeProject!.id, screen.id, it.id);
                          }}
                          className="p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover/it:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {screens.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Layout className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] uppercase tracking-widest font-bold">No screens found</p>
          </div>
        )}
      </div>

      {activeProject && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project Total</span>
            <span className="text-xs font-mono font-bold text-emerald-500">${getProjectTotalCost().toFixed(4)}</span>
          </div>
          <p className="text-[9px] text-zinc-600 italic">Estimated API usage cost</p>
        </div>
      )}
    </aside>
  );
};
