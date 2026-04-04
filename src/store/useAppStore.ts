import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { AppState, Project, Screen, Iteration, ReferenceImage, ModelType } from '../types';
import { get, set as idbSet, del } from 'idb-keyval';

// Custom storage object for IndexedDB
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,
      apiKey: '',
      openRouterApiKey: '',
      openRouterModel: 'anthropic/claude-3.5-sonnet',
      selectedModel: 'gemini-3-flash-preview',
      contextAssetsEnabled: true,
      selectedIterationIds: [],
      selectedReferenceImageIds: [],
      isDesignSystemOpen: false,
      isSettingsOpen: false,
      syncStatus: 'idle',
      lastSyncedAt: null,
      googleAccessToken: null,
      processingTasks: [],
      targetDevice: 'desktop',
      referenceAssetMode: 'image',
      _hasHydrated: false,

      setApiKey: (apiKey) => set({ apiKey }),
      setOpenRouterApiKey: (openRouterApiKey) => set({ openRouterApiKey }),
      setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setTargetDevice: (targetDevice) => set({ targetDevice }),
      setReferenceAssetMode: (referenceAssetMode) => set({ referenceAssetMode }),
      setContextAssetsEnabled: (contextAssetsEnabled) => set({ contextAssetsEnabled }),
      setSelectedIterationIds: (selectedIterationIds) => set({ selectedIterationIds }),
      setSelectedReferenceImageIds: (selectedReferenceImageIds) => set({ selectedReferenceImageIds }),
      setIsDesignSystemOpen: (isDesignSystemOpen) => set({ isDesignSystemOpen }),
      setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setGoogleAccessToken: (googleAccessToken) => set({ googleAccessToken }),
      hydrateStore: (state) => set((prev) => ({ ...prev, ...state })),
      
      addProcessingTask: (task) => set((state) => ({
        processingTasks: [...state.processingTasks, task]
      })),

      updateProcessingTask: (id, updates) => set((state) => ({
        processingTasks: state.processingTasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      removeProcessingTask: (id) => set((state) => ({
        processingTasks: state.processingTasks.filter(t => t.id !== id)
      })),

      toggleIterationSelection: (id) => set((state) => ({
        selectedIterationIds: state.selectedIterationIds.includes(id)
          ? state.selectedIterationIds.filter(i => i !== id)
          : [...state.selectedIterationIds, id]
      })),
      toggleReferenceImageSelection: (id) => set((state) => ({
        selectedReferenceImageIds: state.selectedReferenceImageIds.includes(id)
          ? state.selectedReferenceImageIds.filter(i => i !== id)
          : [...state.selectedReferenceImageIds, id]
      })),

      createProject: (name, description) => set((state) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          createdAt: Date.now(),
          screens: [],
          activeScreenId: null,
        };
        return {
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id,
        };
      }),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      })),

      selectProject: (id) => set({ activeProjectId: id }),

      importProject: (project) => set((state) => ({
        projects: [...state.projects.filter(p => p.id !== project.id), project],
        activeProjectId: project.id
      })),

      addScreen: (projectId, name) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          const newScreen: Screen = {
            id: crypto.randomUUID(),
            name,
            iterations: [],
            activeIterationIndex: -1,
            isApproved: false,
            referenceImages: [],
          };
          return {
            ...p,
            screens: [...p.screens, newScreen],
            activeScreenId: p.activeScreenId || newScreen.id,
          };
        }),
      })),

      deleteScreen: (projectId, screenId) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          const remainingScreens = p.screens.filter((s) => s.id !== screenId);
          return {
            ...p,
            screens: remainingScreens,
            activeScreenId: p.activeScreenId === screenId 
              ? (remainingScreens[0]?.id || null) 
              : p.activeScreenId,
          };
        }),
      })),

      selectScreen: (projectId, screenId) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return { ...p, activeScreenId: screenId };
        }),
      })),

      toggleApproveScreen: (projectId, screenId) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) =>
              s.id === screenId ? { ...s, isApproved: !s.isApproved } : s
            ),
          };
        }),
      })),

      updateScreenPrimaryInfo: (projectId, screenId, info) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) =>
              s.id === screenId ? { ...s, ...info } : s
            ),
          };
        }),
      })),

      addIteration: (projectId, screenId, iteration) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              const newIterations = [...s.iterations, iteration];
              return {
                ...s,
                iterations: newIterations,
                activeIterationIndex: newIterations.length - 1,
              };
            }),
          };
        }),
        selectedIterationIds: [iteration.id],
      })),

      deleteIteration: (projectId, screenId, iterationId) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              const newIterations = s.iterations.filter(i => i.id !== iterationId);
              const newIndex = s.activeIterationIndex >= newIterations.length 
                ? Math.max(0, newIterations.length - 1) 
                : s.activeIterationIndex;
              return {
                ...s,
                iterations: newIterations,
                activeIterationIndex: newIterations.length === 0 ? -1 : newIndex,
              };
            }),
          };
        }),
        selectedIterationIds: state.selectedIterationIds.filter(id => id !== iterationId),
      })),

      setIterationIndex: (projectId, screenId, index) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) =>
              s.id === screenId ? { ...s, activeIterationIndex: index } : s
            ),
          };
        }),
      })),

      updateIterationHtml: (projectId, screenId, iterationId, html) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                iterations: s.iterations.map((it) =>
                  it.id === iterationId ? { ...it, htmlContent: html } : it
                ),
              };
            }),
          };
        }),
      })),
      
      updateIterationDescription: (projectId, screenId, iterationId, description) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                iterations: s.iterations.map((it) =>
                  it.id === iterationId ? { ...it, description } : it
                ),
              };
            }),
          };
        }),
      })),

      updateIterationScreenshot: (projectId, screenId, iterationId, screenshot) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                iterations: s.iterations.map((it) =>
                  it.id === iterationId ? { ...it, screenshot } : it
                ),
              };
            }),
          };
        }),
      })),

      addReferenceImage: (projectId, screenId, image) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                referenceImages: [...s.referenceImages, image],
              };
            }),
          };
        }),
        selectedReferenceImageIds: [...state.selectedReferenceImageIds, image.id],
      })),

      removeReferenceImage: (projectId, screenId, imageId) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                referenceImages: s.referenceImages.filter((img) => img.id !== imageId),
              };
            }),
          };
        }),
        selectedReferenceImageIds: state.selectedReferenceImageIds.filter(id => id !== imageId),
      })),

      updateReferenceImageDescription: (projectId, screenId, imageId, description) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            screens: p.screens.map((s) => {
              if (s.id !== screenId) return s;
              return {
                ...s,
                referenceImages: s.referenceImages.map((img) =>
                  img.id === imageId ? { ...img, description } : img
                ),
              };
            }),
          };
        }),
      })),

      updateDesignSystem: (projectId, designSystem) => set((state) => ({
        projects: state.projects.map((p) => {
          if (p.id !== projectId) return p;
          return { ...p, designSystem };
        }),
      })),
    }),
    {
      name: 'gemini-ui-forge-storage',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
      partialize: (state) => {
        const { _hasHydrated, processingTasks, syncStatus, ...rest } = state;
        return rest;
      }
    }
  )
);
