import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para buscar o papel customizado
  const fetchUserRole = async (userId: string) => {
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
  };

  useEffect(() => {
    console.log('[AuthProvider] Inicializando auth state com novo Supabase');
    supabase.auth.getSession().then(async ({ data }) => {
      if (error) {
        console.error('[AuthProvider] Erro ao obter sessão inicial:', error);
        setLoading(false);
        return;
      }
      console.log('[AuthProvider] Sessão inicial:', data.session?.user?.email);
      setSession(data.session);
      let userObj = data.session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
        console.log('[AuthProvider] Role do usuário:', role);
        userObj = { ...userObj, role };
      }
      setUser(userObj);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider] Auth state change:', _event, session?.user?.email || 'Sem usuário');
      setSession(session);
      let userObj = session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
        console.log('[AuthProvider] Role após mudança:', role);
        userObj = { ...userObj, role };
        console.log('[AuthProvider] Definindo usuário com role:', userObj);
      }
      setUser(userObj);
      console.log('[AuthProvider] Estado do usuário atualizado:', userObj?.email, userObj?.role);
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthProvider] Tentando fazer login:', email);
    console.log('[AuthProvider] Estado atual antes do login:', { user: user?.email, loading });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    console.log('[AuthProvider] Login bem-sucedido:', data.user?.email);
    console.log('[AuthProvider] Dados completos do login:', data);
    // Não precisamos definir o user aqui, o onAuthStateChange vai fazer isso
    console.log('[AuthProvider] signIn completado, aguardando onAuthStateChange');
    return data;
  };

  const signOut = async () => {
    console.log('[AuthProvider] Fazendo logout');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('[AuthProvider] Iniciando signup:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      console.error('[AuthProvider] Erro no signup:', error);
      throw error;
    }
    console.log('[AuthProvider] Signup realizado:', data);
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