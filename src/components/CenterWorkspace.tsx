import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Iteration } from '../types';
import { Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight, Maximize2, RotateCcw, Code, Copy, Image as ImageIcon, Check, Loader2, Star, Eraser } from 'lucide-react';
import { toPng } from 'html-to-image';

export const CenterWorkspace: React.FC = () => {
  const { 
    projects, 
    activeProjectId, 
    setIterationIndex, 
    addReferenceImage, 
    updateIterationHtml, 
    addIteration,
    processingTasks,
    targetDevice
  } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeScreen = activeProject?.screens.find(s => s.id === activeProject.activeScreenId);
  
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>(targetDevice);

  // Sync viewport with targetDevice when it changes from store
  useEffect(() => {
    setViewport(targetDevice);
  }, [targetDevice]);
  const [showCode, setShowCode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const isProcessing = processingTasks.some(t => 
    t.projectId === activeProjectId && 
    (t.screenId === activeScreen?.id || (t.type === 'screen' && !activeScreen)) && 
    t.status === 'processing'
  );
  const [pngStatus, setPngStatus] = useState<'idle' | 'exporting' | 'success'>('idle');
  const [refStatus, setRefStatus] = useState<'idle' | 'adding' | 'success'>('idle');
  const [editedHtml, setEditedHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeIteration = activeScreen?.iterations[activeScreen.activeIterationIndex];

  const { updateIterationScreenshot } = useAppStore();

  useEffect(() => {
    if (activeIteration && !activeIteration.screenshot && iframeRef.current && !isProcessing) {
      const captureScreenshot = async () => {
        // Wait a bit for the iframe to fully render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!iframeRef.current?.contentDocument?.documentElement) return;
        
        try {
          const docEl = iframeRef.current.contentDocument.documentElement;
          const width = docEl.scrollWidth || 1280;
          const height = docEl.scrollHeight || 800;

          const dataUrl = await toPng(docEl, {
            backgroundColor: '#ffffff',
            skipFonts: true,
            width,
            height,
            style: {
              width: width + 'px',
              height: height + 'px',
              transform: 'none'
            }
          });
          
          if (activeProjectId && activeScreen) {
            updateIterationScreenshot(activeProjectId, activeScreen.id, activeIteration.id, dataUrl);
          }
        } catch (err) {
          console.error('Auto-screenshot failed:', err);
        }
      };

      captureScreenshot();
    }
  }, [activeIteration?.id, isProcessing, activeProjectId, activeScreen?.id]);

  useEffect(() => {
    if (activeIteration) {
      setEditedHtml(activeIteration.htmlContent);
    }
  }, [activeIteration?.id]);

  const handleHtmlUpdate = (newHtml: string, prompt: string = 'Manual Edit') => {
    if (activeProjectId && activeScreen && activeIteration) {
      const newIteration: Iteration = {
        id: crypto.randomUUID(),
        prompt,
        htmlContent: newHtml,
        timestamp: Date.now(),
        cost: 0, // Manual edits are free
      };
      addIteration(activeProjectId, activeScreen.id, newIteration);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'html-update' && activeProjectId && activeScreen && activeIteration) {
        handleHtmlUpdate(event.data.html, event.data.prompt || 'Element Deleted');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeProjectId, activeScreen?.id, activeIteration?.id]);

  useEffect(() => {
    if (iframeRef.current && activeIteration && isDeleteMode) {
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;

      const scriptId = 'delete-mode-script';
      if (doc.getElementById(scriptId)) return;

      const script = doc.createElement('script');
      script.id = scriptId;
      script.textContent = `
        (function() {
          let lastEl = null;
          
          function onMouseOver(e) {
            if (lastEl) lastEl.style.outline = '';
            e.target.style.outline = '2px solid #ef4444';
            e.target.style.outlineOffset = '-2px';
            lastEl = e.target;
            e.stopPropagation();
          }
          
          function onMouseOut(e) {
            e.target.style.outline = '';
            e.stopPropagation();
          }
          
          function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            const el = e.target;
            const tagName = el.tagName.toLowerCase();
            el.remove();
            
            // Get HTML without the outline style and without the script itself
            const currentOutline = el.style.outline;
            el.style.outline = '';
            
            const script = document.getElementById('${scriptId}');
            const scriptParent = script ? script.parentElement : null;
            if (script) script.remove();
            
            const html = document.documentElement.outerHTML;
            
            // Put the script back so delete mode continues
            if (script && scriptParent) scriptParent.appendChild(script);
            el.style.outline = currentOutline;

            window.parent.postMessage({ 
              type: 'html-update', 
              html: html,
              prompt: 'Deleted <' + tagName + '>'
            }, '*');
          }

          document.addEventListener('mouseover', onMouseOver, true);
          document.addEventListener('mouseout', onMouseOut, true);
          document.addEventListener('click', onClick, true);
          
          window._cleanupDeleteMode = () => {
            document.removeEventListener('mouseover', onMouseOver, true);
            document.removeEventListener('mouseout', onMouseOut, true);
            document.removeEventListener('click', onClick, true);
            if (lastEl) lastEl.style.outline = '';
            const self = document.getElementById('${scriptId}');
            if (self) self.remove();
          };
        })();
      `;
      if (doc.body) {
        doc.body.appendChild(script);
      } else {
        doc.documentElement.appendChild(script);
      }
    } else if (iframeRef.current && !isDeleteMode) {
      const doc = iframeRef.current.contentDocument;
      if (doc && (doc.defaultView as any)._cleanupDeleteMode) {
        (doc.defaultView as any)._cleanupDeleteMode();
      }
    }
  }, [isDeleteMode, activeIteration?.id]);

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '440px'
  };

  const handlePrev = () => {
    if (activeScreen && activeScreen.activeIterationIndex > 0) {
      setIterationIndex(activeProject!.id, activeScreen.id, activeScreen.activeIterationIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeScreen && activeScreen.activeIterationIndex < activeScreen.iterations.length - 1) {
      setIterationIndex(activeProject!.id, activeScreen.id, activeScreen.activeIterationIndex + 1);
    }
  };

  const handleCopyAsPng = async () => {
    if (!iframeRef.current?.contentDocument?.documentElement) return;
    setPngStatus('exporting');
    try {
      const docEl = iframeRef.current.contentDocument.documentElement;
      const width = docEl.scrollWidth;
      const height = docEl.scrollHeight;

      const dataUrl = await toPng(docEl, {
        backgroundColor: '#ffffff',
        skipFonts: true,
        width,
        height,
        style: {
          width: width + 'px',
          height: height + 'px',
          transform: 'none'
        }
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setPngStatus('success');
      setTimeout(() => setPngStatus('idle'), 2000);
    } catch (err) {
      console.error('PNG export failed:', err);
      const link = document.createElement('a');
      link.download = 'ui-forge-export.png';
      link.href = (await toPng(iframeRef.current.contentDocument.body)) || '';
      link.click();
      setPngStatus('idle');
    }
  };

  const handleAddAsReference = async () => {
    if (!iframeRef.current?.contentDocument?.documentElement || !activeProjectId || !activeIteration) return;
    setRefStatus('adding');
    try {
      const docEl = iframeRef.current.contentDocument.documentElement;
      const width = docEl.scrollWidth;
      const height = docEl.scrollHeight;

      const dataUrl = await toPng(docEl, {
        backgroundColor: '#ffffff',
        skipFonts: true,
        width,
        height,
        style: {
          width: width + 'px',
          height: height + 'px',
          transform: 'none'
        }
      });
      
      addReferenceImage(activeProjectId, activeScreen.id, {
        id: crypto.randomUUID(),
        base64Data: dataUrl,
        filename: `ref-${activeScreen?.name}-v${activeScreen?.activeIterationIndex + 1}.png`,
      });
      
      setRefStatus('success');
      setTimeout(() => setRefStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to add as reference:', err);
      setRefStatus('idle');
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Workspace Toolbar */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-all ${viewport === 'desktop' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-all ${viewport === 'tablet' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-all ${viewport === 'mobile' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (activeIteration) {
                  navigator.clipboard.writeText(activeIteration.htmlContent);
                  alert('Code copied to clipboard!');
                }
              }}
              disabled={!activeIteration}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              <Code className="w-3.5 h-3.5" />
              Copy Code
            </button>
            <button 
              onClick={handleCopyAsPng}
              disabled={!activeIteration || pngStatus !== 'idle'}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              {pngStatus === 'exporting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pngStatus === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {pngStatus === 'success' ? 'Copied PNG' : 'Copy as PNG'}
            </button>
            <button 
              onClick={handleAddAsReference}
              disabled={!activeIteration || refStatus !== 'idle'}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all disabled:opacity-50"
              title="Add this screen as a reference asset"
            >
              {refStatus === 'adding' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : refStatus === 'success' ? <Check className="w-3.5 h-3.5 text-blue-500" /> : <Star className="w-3.5 h-3.5" />}
              {refStatus === 'success' ? 'Added Ref' : 'Add as Ref'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeScreen && (activeScreen.iterations?.length || 0) > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrev}
                disabled={activeScreen.activeIterationIndex <= 0}
                className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 flex items-center gap-2">
                <span>V{activeScreen.activeIterationIndex + 1} / {activeScreen.iterations?.length || 0}</span>
                {activeIteration?.cost !== undefined && (
                  <>
                    <span className="w-px h-3 bg-zinc-800" />
                    <span className="text-emerald-500 font-bold">${activeIteration.cost.toFixed(4)}</span>
                  </>
                )}
              </span>
              <button 
                onClick={handleNext}
                disabled={activeScreen.activeIterationIndex >= (activeScreen.iterations?.length || 0) - 1}
                className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDeleteMode(!isDeleteMode)}
            disabled={!activeIteration}
            className={`p-1.5 rounded-md transition-all ${isDeleteMode ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-zinc-300'} disabled:opacity-50`}
            title="Delete Elements Mode"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowCode(!showCode)}
            className={`p-1.5 rounded-md transition-all ${showCode ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="View Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-zinc-500 hover:text-zinc-300">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-8 flex items-center justify-center overflow-hidden relative">
        {activeIteration ? (
          <div 
            className="h-full bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ease-in-out relative flex flex-col"
            style={{ width: viewportWidths[viewport] }}
          >
            {showCode ? (
              <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">HTML Editor</span>
                  <button 
                    onClick={() => handleHtmlUpdate(editedHtml)}
                    disabled={editedHtml === activeIteration.htmlContent}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>
                <textarea 
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="flex-1 bg-transparent p-4 text-[11px] text-zinc-300 font-mono leading-relaxed outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="relative flex-1">
                <iframe 
                  ref={iframeRef}
                  srcDoc={activeIteration.htmlContent}
                  className="w-full h-full border-none"
                  title="UI Preview"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-zinc-100">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-zinc-900">Forging New Version...</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-1">Background task active</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeScreen?.primaryImage ? (
          <div className="flex flex-col items-center justify-center text-center max-w-2xl animate-in fade-in zoom-in duration-700">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl mb-6">
              <img src={activeScreen.primaryImage} className="w-full h-full object-cover" alt="Primary Reference" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white mb-1">{activeScreen.name}</h3>
                  <p className="text-xs text-zinc-300 font-medium uppercase tracking-widest">Primary Reference Design</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              This is your primary reference image. Use the prompt below to generate the first version of this screen.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-md animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
              <RotateCcw className="w-10 h-10 text-zinc-700 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Forge Your Interface</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Describe your vision in the prompt below. Gemini will generate a fully functional, responsive UI in seconds.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};
