
const BACKUP_FILENAME = 'ui_forge_state_backup.json';

export interface DriveFile {
  id: string;
  name: string;
}

export class GoogleDriveService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Drive API error');
    }

    return response;
  }

  async findBackupFile(): Promise<DriveFile | null> {
    const q = `name = '${BACKUP_FILENAME}' and 'appDataFolder' in parents`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder`;
    
    const response = await this.fetchWithAuth(url);
    const data = await response.json();
    
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async uploadBackup(content: any, fileId?: string): Promise<string> {
    const metadata: any = {
      name: BACKUP_FILENAME,
    };

    if (!fileId) {
      metadata.parents = ['appDataFolder'];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const response = await this.fetchWithAuth(url, {
      method,
      body: form,
    });

    const data = await response.json();
    return data.id;
  }

  async downloadBackup(fileId: string): Promise<any> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }
}
