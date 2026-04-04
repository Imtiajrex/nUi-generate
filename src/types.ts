export type ModelType = 
  | 'gemini-3.1-flash-lite-preview'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3-flash-preview'
  | 'openrouter';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface ReferenceImage {
  id: string;
  base64Data: string;
  filename: string;
  description?: string;
}

export interface Iteration {
  id: string;
  prompt: string;
  htmlContent: string;
  screenshot?: string;
  description?: string;
  timestamp: number;
  cost?: number;
}

export interface Screen {
  id: string;
  name: string;
  iterations: Iteration[];
  activeIterationIndex: number;
  isApproved: boolean;
  primaryObjective?: string;
  primaryComponents?: string;
  primaryImage?: string;
  referenceImages: ReferenceImage[];
}

export interface DesignSystem {
  typography: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  theme: 'light' | 'dark' | 'system';
  customInstructions?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  screens: Screen[];
  activeScreenId: string | null;
  designSystem?: DesignSystem;
}

export interface ProcessingTask {
  id: string;
  projectId: string;
  screenId?: string;
  prompt: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
  type: 'iteration' | 'screen';
  timestamp: number;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  apiKey: string;
  openRouterApiKey: string;
  openRouterModel: string;
  selectedModel: ModelType;
  contextAssetsEnabled: boolean;
  selectedIterationIds: string[];
  selectedReferenceImageIds: string[];
  isDesignSystemOpen: boolean;
  isSettingsOpen: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  googleAccessToken: string | null;
  processingTasks: ProcessingTask[];
  targetDevice: 'desktop' | 'mobile';
  referenceAssetMode: 'image' | 'description';
  _hasHydrated: boolean;
  
  // Actions
  setApiKey: (key: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setOpenRouterModel: (model: string) => void;
  setSelectedModel: (model: ModelType) => void;
  setTargetDevice: (device: 'desktop' | 'mobile') => void;
  setReferenceAssetMode: (mode: 'image' | 'description') => void;
  setContextAssetsEnabled: (enabled: boolean) => void;
  setSelectedIterationIds: (ids: string[]) => void;
  toggleIterationSelection: (id: string) => void;
  setSelectedReferenceImageIds: (ids: string[]) => void;
  toggleReferenceImageSelection: (id: string) => void;
  setIsDesignSystemOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setGoogleAccessToken: (token: string | null) => void;
  hydrateStore: (state: Partial<AppState>) => void;
  
  addProcessingTask: (task: ProcessingTask) => void;
  updateProcessingTask: (id: string, updates: Partial<ProcessingTask>) => void;
  removeProcessingTask: (id: string) => void;
  
  createProject: (name: string, description: string) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  importProject: (project: Project) => void;
  
  addScreen: (projectId: string, name: string) => void;
  deleteScreen: (projectId: string, screenId: string) => void;
  selectScreen: (projectId: string, screenId: string | null) => void;
  toggleApproveScreen: (projectId: string, screenId: string) => void;
  updateScreenPrimaryInfo: (projectId: string, screenId: string, info: { primaryObjective?: string; primaryComponents?: string; primaryImage?: string }) => void;
  
  addIteration: (projectId: string, screenId: string, iteration: Iteration) => void;
  deleteIteration: (projectId: string, screenId: string, iterationId: string) => void;
  setIterationIndex: (projectId: string, screenId: string, index: number) => void;
  updateIterationHtml: (projectId: string, screenId: string, iterationId: string, html: string) => void;
  updateIterationDescription: (projectId: string, screenId: string, iterationId: string, description: string) => void;
  updateIterationScreenshot: (projectId: string, screenId: string, iterationId: string, screenshot: string) => void;
  
  addReferenceImage: (projectId: string, screenId: string, image: ReferenceImage) => void;
  removeReferenceImage: (projectId: string, screenId: string, imageId: string) => void;
  updateReferenceImageDescription: (projectId: string, screenId: string, imageId: string, description: string) => void;

  updateDesignSystem: (projectId: string, designSystem: DesignSystem) => void;
}
