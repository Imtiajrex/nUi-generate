import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Image as ImageIcon, X, Plus, FileText, Loader2 } from 'lucide-react';
import { compressImage, analyzeReferenceImage } from '../services/gemini';
import { ImageModal } from './ImageModal';

export const LeftSidebar: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    addReferenceImage, 
    removeReferenceImage, 
    contextAssetsEnabled, 
    setContextAssetsEnabled,
    selectedReferenceImageIds,
    toggleReferenceImageSelection,
    setSelectedReferenceImageIds,
    updateReferenceImageDescription,
    referenceAssetMode,
    setReferenceAssetMode,
    apiKey,
    selectedModel,
    openRouterApiKey,
    openRouterModel
  } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreen = activeProject?.screens.find(s => s.id === activeProject.activeScreenId);
  const [selectedImage, setSelectedImage] = useState<{ url: string, title: string } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeProjectId || !activeProject?.activeScreenId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        const imageId = crypto.randomUUID();
        addReferenceImage(activeProjectId, activeProject.activeScreenId!, {
          id: imageId,
          base64Data: compressed,
          filename: file.name,
        });

        // Trigger analysis in background
        analyzeReferenceImage(compressed, selectedModel, apiKey, { apiKey: openRouterApiKey, model: openRouterModel })
          .then(({ description }) => {
            updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, description || 'Analysis completed');
          })
          .catch(err => {
            console.error('Analysis failed:', err);
            updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, 'Analysis failed. Please try again.');
          });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || !activeProjectId || !activeProject?.activeScreenId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const compressed = await compressImage(base64);
        const imageId = crypto.randomUUID();
        addReferenceImage(activeProjectId, activeProject.activeScreenId!, {
          id: imageId,
          base64Data: compressed,
          filename: file.name,
        });

        // Trigger analysis in background
        analyzeReferenceImage(compressed, selectedModel, apiKey, { apiKey: openRouterApiKey, model: openRouterModel })
          .then(({ description }) => {
            updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, description || 'Analysis completed');
          })
          .catch(err => {
            console.error('Analysis failed:', err);
            updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, 'Analysis failed. Please try again.');
          });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    if (!activeProjectId || !activeProject?.activeScreenId) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const compressed = await compressImage(base64);
            const imageId = crypto.randomUUID();
            addReferenceImage(activeProjectId, activeProject.activeScreenId!, {
              id: imageId,
              base64Data: compressed,
              filename: `pasted-image-${Date.now()}.jpg`,
            });

            // Trigger analysis in background
            analyzeReferenceImage(compressed, selectedModel, apiKey, { apiKey: openRouterApiKey, model: openRouterModel })
              .then(({ description }) => {
                updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, description || 'Analysis completed');
              })
              .catch(err => {
                console.error('Analysis failed:', err);
                updateReferenceImageDescription(activeProjectId, activeProject.activeScreenId!, imageId, 'Analysis failed. Please try again.');
              });
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  return (
    <aside 
      className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0 outline-none"
      onPaste={handlePaste}
    >
      <div className="p-4 border-b border-zinc-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Context Assets</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setContextAssetsEnabled(!contextAssetsEnabled)}
                className={`w-8 h-4 rounded-full transition-colors relative ${contextAssetsEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${contextAssetsEnabled ? 'left-4.5' : 'left-0.5'}`} />
              </button>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                {contextAssetsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
            {activeScreen?.referenceImages?.length || 0}
          </span>
        </div>

        {contextAssetsEnabled && activeScreen && (activeScreen.referenceImages?.length || 0) > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Selection</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedReferenceImageIds(activeScreen.referenceImages.map(img => img.id))}
                  className="text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase tracking-tighter"
                >
                  All
                </button>
                <button 
                  onClick={() => setSelectedReferenceImageIds([])}
                  className="text-[9px] text-zinc-500 hover:text-zinc-400 font-bold uppercase tracking-tighter"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-950/50 p-1.5 rounded-lg border border-zinc-800/50">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter ml-1">Send Mode</span>
              <div className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
                <button
                  onClick={() => setReferenceAssetMode('image')}
                  className={`p-1 rounded transition-all ${referenceAssetMode === 'image' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                  title="Send raw images to AI"
                >
                  <ImageIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setReferenceAssetMode('description')}
                  className={`p-1 rounded transition-all ${referenceAssetMode === 'description' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                  title="Send AI-generated descriptions to AI"
                >
                  <FileText className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer relative group"
        >
          <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          <span className="text-[10px] font-medium text-zinc-500 text-center">Drop or paste images here</span>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileSelect} 
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {activeScreen?.referenceImages?.map((img) => {
            const isSelected = selectedReferenceImageIds.includes(img.id);
            return (
              <div 
                key={img.id} 
                className={`relative aspect-square rounded-lg overflow-hidden border transition-all group cursor-pointer ${
                  isSelected && contextAssetsEnabled
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
                onClick={() => {
                  if (contextAssetsEnabled) {
                    toggleReferenceImageSelection(img.id);
                  } else {
                    setSelectedImage({ url: img.base64Data, title: img.filename });
                  }
                }}
              >
                <img src={img.base64Data} alt={img.filename} className="w-full h-full object-cover" />
                
                {/* Analysis Status */}
                {!img.description && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-[8px] text-blue-400 font-bold uppercase tracking-tighter">Analyzing</span>
                  </div>
                )}

                {/* Selection Indicator */}
                {contextAssetsEnabled && (
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/40 border-white/20'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage({ url: img.base64Data, title: img.filename });
                    }}
                    className="p-1.5 bg-zinc-900/80 text-white rounded-md hover:bg-zinc-800"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReferenceImage(activeProject.id, activeScreen.id, img.id);
                    }}
                    className="p-1.5 bg-red-500/80 text-white rounded-md hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-[10px] text-blue-400 leading-relaxed">
            Images added here are sent as context to every generation request for this screen.
          </p>
        </div>
      </div>

      <ImageModal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        imageUrl={selectedImage?.url || ''} 
        title={selectedImage?.title}
      />
    </aside>
  );
};
