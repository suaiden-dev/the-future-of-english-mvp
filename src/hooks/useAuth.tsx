import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: (User & { role?: string }) | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para buscar o papel customizado
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[Auth] Erro ao buscar role do perfil:', error);
      return undefined;
    }
    return data?.role;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      let userObj = data.session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
        userObj = { ...userObj, role };
      }
      setUser(userObj);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      let userObj = session?.user ?? null;
      if (userObj) {
        const role = await fetchUserRole(userObj.id);
        userObj = { ...userObj, role };
      }
      setUser(userObj);
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    let userObj = data.user;
    if (userObj) {
      const role = await fetchUserRole(userObj.id);
      userObj = { ...userObj, role };
    }
    setUser(userObj);
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
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