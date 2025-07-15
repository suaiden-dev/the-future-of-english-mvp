import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Environment check:');
console.log('- VITE_SUPABASE_URL:', supabaseUrl || 'NOT SET');
console.log('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  console.error('[Supabase] Missing environment variables:', missingVars);
  console.error('[Supabase] Please check your .env file and restart the dev server');
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test connection with better error handling
console.log('[Supabase] Testing connection...');
const testConnection = async () => {
  try {
    // Test basic auth connection first
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[Supabase] Auth connection failed:', sessionError.message);
      return;
    }
    console.log('[Supabase] Auth connection successful');
    
    // Test database connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('[Supabase] Database connection failed:', error.message);
      console.error('[Supabase] This usually means:');
      console.error('  1. Supabase is not running (run: supabase start)');
      console.error('  2. Wrong URL in .env file');
      console.error('  3. Tables not created (run the migration)');
    } else {
      console.log('[Supabase] Database connection successful');
    }
  } catch (err) {
    console.error('[Supabase] Connection test failed:', err);
    console.error('[Supabase] Check if Supabase is running and .env is configured correctly');
  }
};

testConnection();

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, name: string) => {
    console.log('[auth.signUp] Iniciando signup', { email });
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });
    if (authError) {
      console.error('[auth.signUp] Erro no signup:', authError);
        throw authError;
    }
    console.log('[auth.signUp] Signup realizado com sucesso', { authData });
    return authData;
  },

  signIn: async (email: string, password: string) => {
    console.log('[auth.signIn] Iniciando login', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      console.error('[auth.signIn] Erro no login:', error);
      throw error;
    }
    console.log('[auth.signIn] Login realizado com sucesso', { data });
    return data;
  },

  signOut: async () => {
    console.log('[auth.signOut] Iniciando signout');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth.signOut] Erro no signout:', error);
      throw error;
    }
    console.log('[auth.signOut] Signout realizado com sucesso');
  },

  getCurrentUser: async () => {
    console.log('[auth.getCurrentUser] Buscando usuário atual');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[auth.getCurrentUser] Erro ao buscar usuário:', error);
      throw error;
    }
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error('[auth.getCurrentUser] Erro ao buscar profile:', profileError);
        throw profileError;
      }
      console.log('[auth.getCurrentUser] Profile encontrado', { profile });
      return profile;
    }
    console.log('[auth.getCurrentUser] Nenhum usuário logado');
    return null;
  }
};

// Database helpers
export const db = {
  // Documents
  getDocuments: async (userId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getAllDocuments: async () => {
    console.log('[db.getAllDocuments] Iniciando busca de todos os documentos...');
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        profiles:user_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[db.getAllDocuments] Erro na query:', error);
      throw error;
    }
    console.log('[db.getAllDocuments] Query executada com sucesso, documentos:', data?.length || 0);
    return data;
  },

  createDocument: async (document: {
    user_id: string;
    folder_id?: string | null;
    filename: string;
    pages: number;
    total_cost: number;
    file_url?: string;
  }) => {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateDocumentStatus: async (documentId: string, status: 'pending' | 'processing' | 'completed') => {
    const { data, error } = await supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  verifyDocument: async (verificationCode: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('verification_code', verificationCode)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Folders
  getFolders: async (userId: string) => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createFolder: async (folder: {
    user_id: string;
    name: string;
    parent_id?: string;
    color?: string;
  }) => {
    const { data, error } = await supabase
      .from('folders')
      .insert(folder)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateFolder: async (folderId: string, updates: { name?: string; color?: string }) => {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteFolder: async (folderId: string) => {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);
    
    if (error) throw error;
  }
};

// @ts-ignore
window.supabase = supabase;