import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Palette, Type, Sun, Moon, Monitor } from 'lucide-react';
import { DesignSystem } from '../types';
import { Modal } from './Modal';

interface DesignSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesignSystemModal: React.FC<DesignSystemModalProps> = ({ isOpen, onClose }) => {
  const { projects, activeProjectId, updateDesignSystem } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);

  const [designSystem, setDesignSystem] = useState<DesignSystem>({
    typography: 'Inter, system-ui, sans-serif',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    accentColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    theme: 'light',
    customInstructions: '',
  });

  useEffect(() => {
    if (activeProject?.designSystem) {
      setDesignSystem(activeProject.designSystem);
    }
  }, [activeProject?.designSystem]);

  if (!activeProject) return null;

  const handleSave = () => {
    updateDesignSystem(activeProject.id, designSystem);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Design System"
      maxWidth="max-w-lg"
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Default Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDesignSystem({ ...designSystem, theme: t })}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  designSystem.theme === t 
                    ? 'bg-blue-600/10 border-blue-600 text-blue-400' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {t === 'light' && <Sun className="w-5 h-5" />}
                {t === 'dark' && <Moon className="w-5 h-5" />}
                {t === 'system' && <Monitor className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Type className="w-3 h-3" /> Typography
          </label>
          <input
            type="text"
            value={designSystem.typography}
            onChange={(e) => setDesignSystem({ ...designSystem, typography: e.target.value })}
            placeholder="e.g. Inter, system-ui, sans-serif"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={designSystem.primaryColor}
                onChange={(e) => setDesignSystem({ ...designSystem, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={designSystem.primaryColor}
                onChange={(e) => setDesignSystem({ ...designSystem, primaryColor: e.target.value })}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={designSystem.secondaryColor}
                onChange={(e) => setDesignSystem({ ...designSystem, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={designSystem.secondaryColor}
                onChange={(e) => setDesignSystem({ ...designSystem, secondaryColor: e.target.value })}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={designSystem.backgroundColor}
                onChange={(e) => setDesignSystem({ ...designSystem, backgroundColor: e.target.value })}
                className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={designSystem.backgroundColor}
                onChange={(e) => setDesignSystem({ ...designSystem, backgroundColor: e.target.value })}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={designSystem.textColor}
                onChange={(e) => setDesignSystem({ ...designSystem, textColor: e.target.value })}
                className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={designSystem.textColor}
                onChange={(e) => setDesignSystem({ ...designSystem, textColor: e.target.value })}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            Custom Instructions
          </label>
          <textarea
            value={designSystem.customInstructions || ''}
            onChange={(e) => setDesignSystem({ ...designSystem, customInstructions: e.target.value })}
            placeholder="Add any specific design rules, component preferences, or brand guidelines..."
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
          />
        </div>
      </div>

      <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
        >
          Save Design System
        </button>
      </div>
    </Modal>
  );
};
