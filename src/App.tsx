import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { CenterWorkspace } from './components/CenterWorkspace';
import { PromptInput } from './components/PromptInput';
import { InitializationModal } from './components/InitializationModal';
import { DesignSystemModal } from './components/DesignSystemModal';
import { SettingsModal } from './components/SettingsModal';
import { useAppStore } from './store/useAppStore';
import { Plus, Trash2, Folder, X } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  const { 
    projects, 
    activeProjectId, 
    selectProject, 
    deleteProject, 
    createProject,
    isDesignSystemOpen,
    setIsDesignSystemOpen,
    isSettingsOpen,
    setIsSettingsOpen
  } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), '');
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  if (!activeProjectId) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="h-screen w-full bg-zinc-950 text-zinc-300 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
          <TopBar />
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="max-w-4xl w-full space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Your Projects</h1>
                  <p className="text-zinc-500 mt-1">Select a project to continue or create a new one.</p>
                </div>
                {!isCreating ? (
                  <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </button>
                ) : (
                  <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                    <input 
                      autoFocus
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                      placeholder="Project Name..."
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button 
                      onClick={handleCreateProject}
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsCreating(false)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                    className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer relative"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Folder className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{project.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{project.description || 'No description'}</p>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                      <span>{project.screens.length} Screens</span>
                      <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                
                {projects.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                    <Folder className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm">No projects yet</p>
                    <p className="text-xs mt-2">Create your first project to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <InitializationModal />
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="h-screen w-full bg-zinc-950 text-zinc-300 flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
        <TopBar />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Control Panel: Assets + History + Chat */}
          <div className="flex flex-col border-r border-zinc-800 shrink-0 bg-zinc-900/10 w-[544px]">
            <div className="flex-1 flex overflow-hidden">
              <LeftSidebar />
              <RightSidebar />
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
              <PromptInput />
            </div>
          </div>
          
          {/* Right Workspace: Canvas */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <CenterWorkspace />
          </div>
        </div>

        <InitializationModal />
        <DesignSystemModal 
          isOpen={isDesignSystemOpen} 
          onClose={() => setIsDesignSystemOpen(false)} 
        />
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </GoogleOAuthProvider>
  );
}
