import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Folder = Database['public']['Tables']['folders']['Row'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

export function useFolders(userId?: string) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = async () => {
    if (!userId) {
      setFolders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await db.getFolders(userId);
      setFolders(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError('Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [userId]);

  const createFolder = async (folderData: Omit<FolderInsert, 'user_id'>) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const newFolder = await db.createFolder({
        ...folderData,
        user_id: userId
      });
      
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (err) {
      console.error('Error creating folder:', err);
      throw err;
    }
  };

  const updateFolder = async (folderId: string, updates: { name?: string; color?: string; parent_id?: string | null }) => {
    try {
      const updatedFolder = await db.updateFolder(folderId, updates);
      setFolders(prev => 
        prev.map(folder => 
          folder.id === folderId ? updatedFolder : folder
        )
      );
      return updatedFolder;
    } catch (err) {
      console.error('Error updating folder:', err);
      throw err;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await db.deleteFolder(folderId);
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
    } catch (err) {
      console.error('Error deleting folder:', err);
      throw err;
    }
  };

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: fetchFolders
  };
}