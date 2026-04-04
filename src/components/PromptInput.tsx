import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Image as ImageIcon, X, Loader2, Command, Wand2, Monitor, Smartphone } from 'lucide-react';
import { generateUI, compressImage, describeImage, enhancePrompt, describeHTML } from '../services/gemini';
import { ImageModal } from './ImageModal';

import { ProcessingTasks } from './ProcessingTasks';

export const PromptInput: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    apiKey, 
    selectedModel, 
    addIteration, 
    addScreen, 
    contextAssetsEnabled,
    selectedIterationIds,
    toggleIterationSelection,
    setSelectedIterationIds,
    selectedReferenceImageIds,
    setSelectedReferenceImageIds,
    addProcessingTask,
    updateProcessingTask,
    removeProcessingTask,
    targetDevice,
    setTargetDevice,
    referenceAssetMode,
    openRouterApiKey,
    openRouterModel
  } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreen = activeProject?.screens.find(s => s.id === activeProject.activeScreenId);

  const [prompt, setPrompt] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating...');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset iteration selection when screen changes
  useEffect(() => {
    if (activeScreen && (activeScreen.iterations?.length || 0) > 0) {
      // Default to last iteration only if none selected
      if (selectedIterationIds.length === 0) {
        setSelectedIterationIds([activeScreen.iterations[activeScreen.iterations.length - 1].id]);
      }
    } else {
      setSelectedIterationIds([]);
    }
  }, [activeScreen?.id]);

  // Initialize reference image selection when screen changes
  useEffect(() => {
    if (activeScreen && (activeScreen.referenceImages?.length || 0) > 0) {
      if (selectedReferenceImageIds.length === 0) {
        setSelectedReferenceImageIds(activeScreen.referenceImages.map(img => img.id));
      }
    } else {
      setSelectedReferenceImageIds([]);
    }
  }, [activeScreen?.id]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const compressed = await compressImage(base64);
            setPastedImage(compressed);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleEnhancePrompt = async () => {
    if ((!prompt.trim() && !pastedImage) || isEnhancing) return;

    // Check if we need an API key for preview models or if we've hit a 403 before
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey && (selectedModel.includes('pro') || selectedModel.includes('image-preview'))) {
        if (confirm("This model requires a paid API key. Would you like to select one now?")) {
          await aistudio.openSelectKey();
        } else {
          return;
        }
      }
    }

    setIsEnhancing(true);
    setLoadingText('Enhancing prompt...');
    try {
      let imageDescription = '';
      if (pastedImage) {
        setLoadingText('Analyzing screen...');
        const { description } = await describeImage(pastedImage, selectedModel, apiKey, targetDevice, { apiKey: openRouterApiKey, model: openRouterModel });
        imageDescription = description;
      }

      setLoadingText('Refining prompt...');
      const { enhancedPrompt } = await enhancePrompt(prompt, apiKey, selectedModel, imageDescription || undefined, targetDevice, { apiKey: openRouterApiKey, model: openRouterModel });
      
      setPrompt(enhancedPrompt);
      setPastedImage(null); // Remove image as it's now described in text
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.toLowerCase().includes('forbidden')) {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.openSelectKey === 'function') {
          if (confirm("Access forbidden (403). This model might require a paid API key or billing setup. Would you like to select an API key?")) {
            await aistudio.openSelectKey();
            return;
          }
        }
      }
      alert(err.message);
    } finally {
      setIsEnhancing(false);
      setLoadingText('Generating...');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || !activeProjectId) return;
    if (selectedModel !== 'openrouter' && !apiKey) return;
    if (selectedModel === 'openrouter' && !openRouterApiKey) return;

    const currentPrompt = prompt;
    const currentPastedImage = pastedImage;
    const taskId = crypto.randomUUID();

    // Clear input immediately for next prompt
    setPrompt('');
    setPastedImage(null);

    // Add task to background queue
    addProcessingTask({
      id: taskId,
      projectId: activeProjectId,
      prompt: currentPrompt,
      status: 'processing',
      type: activeProject?.activeScreenId ? 'iteration' : 'screen',
      timestamp: Date.now(),
    });

    try {
      let targetScreenId = activeProject?.activeScreenId;
      
      // Check if we need an API key for preview models or if we've hit a 403 before
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey && (selectedModel.includes('pro') || selectedModel.includes('image-preview'))) {
          if (confirm("This model requires a paid API key. Would you like to select one now?")) {
            await aistudio.openSelectKey();
          } else {
            removeProcessingTask(taskId);
            return;
          }
        }
      }

      // If no screen exists, create one first
      if (!targetScreenId) {
        const screenName = currentPrompt.slice(0, 20) + '...';
        addScreen(activeProjectId, screenName);
        const updatedProject = useAppStore.getState().projects.find(p => p.id === activeProjectId);
        targetScreenId = updatedProject?.screens[updatedProject.screens.length - 1].id;
      }

      if (!targetScreenId) throw new Error("Could not determine target screen");

      let finalPrompt = currentPrompt;
      let totalCost = 0;

      // If there's a pasted image, describe it first
      if (currentPastedImage) {
        updateProcessingTask(taskId, { prompt: 'Analyzing screen...' });
        const { description, cost: descCost } = await describeImage(currentPastedImage, selectedModel, apiKey, targetDevice, { apiKey: openRouterApiKey, model: openRouterModel });
        totalCost += descCost;
        finalPrompt = `User Request: ${currentPrompt}\n\nSCREEN TO REDESIGN DESCRIPTION:\n${description}\n\nPlease redesign the screen described above based on the user request. The target device is ${targetDevice.toUpperCase()}. Use the reference images provided in the context for design system guidance (colors, typography, etc.) but do not recreate their content.`;
      }

      // Get selected iterations as context
      const selectedIterations = activeScreen?.iterations
        .filter(it => selectedIterationIds.includes(it.id)) || [];

      // Use existing descriptions or a placeholder to avoid waiting for AI calls during submission
      const previousIterations = selectedIterations.map(it => ({
        prompt: it.prompt,
        description: it.description || `[Structure description pending for version with prompt: ${it.prompt}]`,
        htmlContent: it.htmlContent,
        screenshot: it.screenshot
      }));

      // Trigger background description for any missing ones so they are ready for future iterations
      selectedIterations.forEach(it => {
        if (!it.description) {
          describeHTML(it.htmlContent, selectedModel, apiKey, targetDevice, { apiKey: openRouterApiKey, model: openRouterModel })
            .then(({ description }) => {
              useAppStore.getState().updateIterationDescription(activeProjectId, targetScreenId!, it.id, description);
            })
            .catch(err => console.error('Background description failed:', err));
        }
      });

      updateProcessingTask(taskId, { prompt: 'Forging UI...' });
      
      const primaryInfo = activeScreen ? {
        objective: activeScreen.primaryObjective,
        components: activeScreen.primaryComponents,
        image: activeScreen.primaryImage
      } : undefined;

      const { htmlContent, cost: genCost } = await generateUI(
        finalPrompt,
        selectedModel,
        apiKey,
        contextAssetsEnabled 
          ? (activeScreen?.referenceImages.filter(img => selectedReferenceImageIds.includes(img.id)) || []) 
          : [],
        previousIterations,
        activeProject?.designSystem,
        currentPastedImage || undefined,
        targetDevice,
        referenceAssetMode,
        { apiKey: openRouterApiKey, model: openRouterModel },
        primaryInfo
      );
      totalCost += genCost;

      const newIterationId = crypto.randomUUID();
      addIteration(activeProjectId, targetScreenId, {
        id: newIterationId,
        prompt: currentPrompt,
        htmlContent: htmlContent,
        timestamp: Date.now(),
        cost: totalCost,
      });

      // Generate description for the new iteration in the background
      describeHTML(htmlContent, selectedModel, apiKey, targetDevice, { apiKey: openRouterApiKey, model: openRouterModel }).then(({ description }) => {
        useAppStore.getState().updateIterationDescription(activeProjectId, targetScreenId!, newIterationId, description);
      });

      updateProcessingTask(taskId, { status: 'completed', prompt: 'UI Forged successfully!' });
      setTimeout(() => removeProcessingTask(taskId), 3000);
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.toLowerCase().includes('forbidden')) {
        const aistudio = (window as any).aistudio;
        if (aistudio && typeof aistudio.openSelectKey === 'function') {
          if (confirm("Access forbidden (403). This model might require a paid API key or billing setup. Would you like to select an API key?")) {
            await aistudio.openSelectKey();
            updateProcessingTask(taskId, { status: 'error', error: "Access forbidden. Please select a valid API key and try again." });
            return;
          }
        }
      }
      updateProcessingTask(taskId, { status: 'error', error: err.message });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!activeProject) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ProcessingTasks />
      
      {activeScreen && (activeScreen.iterations?.length || 0) > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Context Versions</span>
            <button 
              onClick={() => setSelectedIterationIds(activeScreen.iterations.map(i => i.id))}
              className="text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase tracking-tighter"
            >
              Select All
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {activeScreen.iterations.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => toggleIterationSelection(it.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                  selectedIterationIds.includes(it.id)
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                V{idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
        {pastedImage && (
          <div className="p-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/50">
            <div 
              className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer group/img"
              onClick={() => setIsImageModalOpen(true)}
            >
              <img src={pastedImage} alt="Pasted" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPastedImage(null);
                }}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-md hover:bg-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium italic">Image attached from clipboard</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-end p-2 gap-2">
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 px-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetDevice('desktop')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  targetDevice === 'desktop'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
                }`}
              >
                <Monitor className="w-3 h-3" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setTargetDevice('mobile')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  targetDevice === 'mobile'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                Mobile
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={activeScreen ? `Iterate on ${activeScreen.name}...` : "Describe your UI vision..."}
              className="bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:ring-0 py-3 px-3 resize-none max-h-[150px] min-h-[44px]"
            />
          </div>
          
          <div className="flex items-center gap-2 pb-1.5 pr-1.5">
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={(!prompt.trim() && !pastedImage) || isLoading || isEnhancing}
              className={`p-2.5 rounded-xl transition-all ${(!prompt.trim() && !pastedImage) || isLoading || isEnhancing ? 'text-zinc-600 cursor-not-allowed' : 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300'}`}
              title="Enhance Prompt"
            >
              {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            </button>

            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${!prompt.trim() ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
      <ImageModal 
        isOpen={isImageModalOpen} 
        onClose={() => setIsImageModalOpen(false)} 
        imageUrl={pastedImage || ''} 
        title="Attached Image"
      />
    </div>
  );
};
