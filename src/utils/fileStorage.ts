// File storage utility using IndexedDB for persistence across page refreshes

interface StoredFile {
  id: string;
  file: File;
  timestamp: number;
  metadata?: {
    documentType?: string;
    certification?: boolean;
    notarization?: boolean;
    pageCount?: number;
  };
}

class FileStorage {
  private dbName = 'DocumentStorage';
  private dbVersion = 1;
  private storeName = 'files';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async storeFile(file: File, metadata?: any): Promise<string> {
    console.log('Storing file in IndexedDB:', file.name, 'Size:', file.size);
    
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedFile: StoredFile = {
      id: fileId,
      file: file,
      timestamp: Date.now(),
      metadata: metadata
    };

    return new Promise((resolve, reject) => {
      const request = store.put(storedFile);
      
      request.onsuccess = () => {
        console.log('File stored successfully with ID:', fileId);
        resolve(fileId);
      };
      
      request.onerror = () => {
        console.error('Error storing file:', request.error);
        reject(request.error);
      };
    });
  }

  async getFile(fileId: string): Promise<StoredFile | null> {
    console.log('Retrieving file from IndexedDB:', fileId);
    
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(fileId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('File retrieved successfully:', result.file.name);
          resolve(result);
        } else {
          console.log('File not found in IndexedDB:', fileId);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('Error retrieving file:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    console.log('Deleting file from IndexedDB:', fileId);
    
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(fileId);
      
      request.onsuccess = () => {
        console.log('File deleted successfully from IndexedDB:', fileId);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error deleting file:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllFiles(): Promise<StoredFile[]> {
    console.log('Retrieving all files from IndexedDB');
    
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const files = request.result;
        console.log('Retrieved', files.length, 'files from IndexedDB');
        resolve(files);
      };
      
      request.onerror = () => {
        console.error('Error retrieving all files:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAllFiles(): Promise<void> {
    console.log('Clearing all files from IndexedDB');
    
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All files cleared from IndexedDB');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error clearing all files:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const fileStorage = new FileStorage();
export type { StoredFile }; 