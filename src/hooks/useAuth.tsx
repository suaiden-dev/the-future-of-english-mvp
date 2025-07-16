import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface CustomUser extends User {
  role?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para buscar o papel customizado
  const fetchUserRole = async (userId: string) => {
    try {
    console.log('[Auth] Buscando role para userId:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[Auth] Erro ao buscar role do perfil:', error);
      return undefined;
    }
    console.log('[Auth] Role encontrado:', data?.role);
    return data?.role;
    } catch (err) {
      console.error('[Auth] Erro inesperado ao buscar role:', err);
      return undefined;
    } finally {
      console.log('[Auth] fetchUserRole FINALIZADO para userId:', userId);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    supabase.auth.getSession().then(async ({ data, error }) => {
      console.log('[AuthProvider] getSession result:', { data, error });
      try {
        if (error) {
          console.error('[AuthProvider] Erro ao obter sessão:', error);
          if (isMounted) setUser(null);
          // Fallback: tentar restaurar do localStorage
          if (typeof window !== 'undefined') {
            const savedUser = window.localStorage.getItem('app_user');
            if (savedUser) {
              const parsedUser = JSON.parse(savedUser);
              console.log('[AuthProvider] Restaurando usuário do localStorage:', parsedUser);
              setUser(parsedUser);
            }
          }
        } else {
      setSession(data.session);
      let userObj = data.session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
            userObj = { ...userObj, role } as CustomUser;
            console.log('[AuthProvider] userObj montado:', userObj);
            // Salvar no localStorage
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('app_user', JSON.stringify(userObj));
              console.log('[AuthProvider] Usuário salvo no localStorage:', userObj);
            }
      }
        if (isMounted) {
            console.log('[AuthProvider] Chamando setUser com:', userObj);
      setUser(userObj);
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Erro ao inicializar sessão:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider] onAuthStateChange:', _event, session);
      if (!session) {
        setUser(null);
        setLoading(false);
        // Limpar localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('app_user');
          console.log('[AuthProvider] Usuário removido do localStorage');
        }
        return;
      }
      try {
      setSession(session);
      let userObj = session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
          userObj = { ...userObj, role } as CustomUser;
          console.log('[AuthProvider] userObj montado:', userObj);
          // Salvar no localStorage
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('app_user', JSON.stringify(userObj));
            console.log('[AuthProvider] Usuário salvo no localStorage:', userObj);
          }
        }
        console.log('[AuthProvider] Chamando setUser com:', userObj);
      setUser(userObj);
      } catch (err) {
        setUser(null);
      } finally {
      setLoading(false);
      }
    });
    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
      console.log('[AuthProvider] useEffect CLEANUP');
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthProvider] signIn chamado:', email);
    console.log('[AuthProvider] Estado atual antes do login:', { user: user?.email, loading });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[AuthProvider] Erro no signIn:', error);
      throw error;
    }
    console.log('[AuthProvider] Login bem-sucedido:', data.user?.email);
    console.log('[AuthProvider] Dados completos do login:', data);
    // Log do localStorage após login
    if (typeof window !== 'undefined') {
      console.log('[AuthProvider] localStorage após login:', window.localStorage);
    }
    // Não precisamos definir o user aqui, o onAuthStateChange vai fazer isso
    console.log('[AuthProvider] signIn completado, aguardando onAuthStateChange');
    return data;
  };

  const signOut = async () => {
    console.log('[AuthProvider] Fazendo logout');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    console.log('[AuthProvider] Logout concluído, user e session limpos');
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('[AuthProvider] signUp chamado:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      console.error('[AuthProvider] Erro no signUp:', error);
      throw error;
    }
    console.log('[AuthProvider] Cadastro bem-sucedido:', data.user?.email);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 