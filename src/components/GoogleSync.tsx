
import React, { useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAppStore } from '../store/useAppStore';
import { GoogleDriveService } from '../services/googleDriveService';
import debounce from 'lodash.debounce';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

export const GoogleSync: React.FC = () => {
  const { 
    projects, 
    googleAccessToken, 
    setGoogleAccessToken, 
    syncStatus, 
    setSyncStatus,
    hydrateStore 
  } = useAppStore();

  const driveServiceRef = useRef<GoogleDriveService | null>(null);
  const isInitialLoad = useRef(true);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleAccessToken(tokenResponse.access_token);
      setSyncStatus('synced');
    },
    onError: () => {
      setSyncStatus('error');
    },
    scope: 'https://www.googleapis.com/auth/drive.appdata',
  });

  const syncToDrive = useCallback(
    debounce(async (currentProjects: any) => {
      if (!driveServiceRef.current) return;
      
      setSyncStatus('syncing');
      try {
        const backupFile = await driveServiceRef.current.findBackupFile();
        await driveServiceRef.current.uploadBackup({ projects: currentProjects }, backupFile?.id);
        setSyncStatus('synced');
      } catch (error: any) {
        console.error('Sync to Drive failed:', error);
        if (error.message === 'TOKEN_EXPIRED') {
          setGoogleAccessToken(null);
        }
        setSyncStatus('error');
      }
    }, 5000),
    [setGoogleAccessToken, setSyncStatus]
  );

  const hydrateFromDrive = useCallback(async () => {
    if (!driveServiceRef.current) return;

    setSyncStatus('syncing');
    try {
      const backupFile = await driveServiceRef.current.findBackupFile();
      if (backupFile) {
        const data = await driveServiceRef.current.downloadBackup(backupFile.id);
        if (data && data.projects) {
          hydrateStore({ projects: data.projects });
        }
      }
      setSyncStatus('synced');
    } catch (error: any) {
      console.error('Hydration from Drive failed:', error);
      if (error.message === 'TOKEN_EXPIRED') {
        setGoogleAccessToken(null);
      }
      setSyncStatus('error');
    }
  }, [hydrateStore, setSyncStatus, setGoogleAccessToken]);

  useEffect(() => {
    if (googleAccessToken) {
      driveServiceRef.current = new GoogleDriveService(googleAccessToken);
      if (isInitialLoad.current) {
        hydrateFromDrive();
        isInitialLoad.current = false;
      }
    } else {
      driveServiceRef.current = null;
    }
  }, [googleAccessToken, hydrateFromDrive]);

  useEffect(() => {
    if (!isInitialLoad.current && googleAccessToken) {
      syncToDrive(projects);
    }
  }, [projects, googleAccessToken, syncToDrive]);

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
      {!googleAccessToken ? (
        <button 
          onClick={() => login()}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <CloudOff className="w-3.5 h-3.5" />
          Enable Cloud Sync
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                Syncing...
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                Sync Error
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                Cloud Active
              </>
            )}
          </div>
          <button 
            onClick={() => setGoogleAccessToken(null)}
            className="text-[9px] text-zinc-600 hover:text-zinc-400 underline underline-offset-2"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
