import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const ProcessingTasks: React.FC = () => {
  const { processingTasks, removeProcessingTask } = useAppStore();

  if (processingTasks.length === 0) return null;

  return (
    <div className="mb-4 space-y-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
      {processingTasks.map((task) => (
        <div 
          key={task.id}
          className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur-sm transition-all animate-in fade-in slide-in-from-left-4 ${
            task.status === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : task.status === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {task.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {task.status === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                {task.type === 'screen' ? 'New Screen' : 'Iteration'} • {task.status}
              </span>
              <p className="text-xs truncate font-medium">
                {task.error || task.prompt}
              </p>
            </div>
          </div>

          <button 
            onClick={() => removeProcessingTask(task.id)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
