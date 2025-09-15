import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getResetPasswordUrl } from '../utils/urlUtils';

export interface CustomUser extends SupabaseUser {
  role: 'user' | 'authenticator' | 'admin' | 'finance';
  phone?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role?: 'user' | 'authenticator') => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Busca ou cria perfil na tabela profiles
  const fetchOrCreateProfile = async (userId: string, email: string, name: string, role: 'user' | 'authenticator' | 'admin' | 'finance' = 'user', phone?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('[Auth] Erro ao buscar perfil:', error);
        return null;
      }
      if (data) {
        let updates: any = {};
        if (!data.role || data.role === '') {
          updates.role = role;
        }
        if (!data.name || data.name !== name) {
          updates.name = name;
        }
        if (phone && (!data.phone || data.phone !== phone)) {
          updates.phone = phone;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', userId);
          return { ...data, ...updates };
        }
        return data;
      } else {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ id: userId, email, name, role, phone })
          .select()
          .single();
        if (createError) {
          console.error('[Auth] Erro ao criar perfil:', createError);
          return null;
        }
        return newProfile;
      }
    } catch (err) {
      console.error('[Auth] Erro inesperado ao buscar/criar perfil:', err);
      return null;
    }
  };

  // Centraliza a lógica de buscar/criar perfil e atualizar contexto
  const fetchAndSetUser = async (session: Session | null) => {
    if (session?.user) {
      const userObj = session.user;
      try {
        // Primeiro buscar o perfil existente para obter o role correto
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userObj.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[Auth] Erro ao buscar perfil existente:', profileError);
        }
        
        // Se o perfil existe, usar o role dele. Se não, criar com role 'user'
        const defaultRole = existingProfile?.role || 'user';
        const profile = await fetchOrCreateProfile(userObj.id, userObj.email ?? '', userObj.user_metadata?.name ?? '', defaultRole, userObj.user_metadata?.phone);
        const role = profile?.role || 'user';
        const customUser: CustomUser = { ...userObj, role, phone: profile?.phone };
        setUser(customUser);
        setSession(session);
        setSessionExpired(false);
      } catch (err) {
        console.error('[AuthProvider] Erro ao processar perfil:', err);
        setUser(null);
        setSession(session);
        setSessionExpired(true);
      }
    } else {
      setUser(null);
      setSession(null);
      if (session === null) {
        setSessionExpired(true);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAndSetUser(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        fetchAndSetUser(session);
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    // O listener de onAuthStateChange vai processar o usuário
    return data;
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name: string, phone: string, role: 'user' | 'authenticator' | 'admin' | 'finance' = 'user') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, phone } }
    });
    if (error) {
      throw error;
    }
    // Cria perfil imediatamente após registro
    if (data.user) {
      await fetchOrCreateProfile(data.user.id, email, name, role, phone);
    }
    return data;
  };

  const resetPassword = async (email: string) => {
    const resetUrl = getResetPasswordUrl();
    console.log('[resetPassword] Usando URL de reset:', resetUrl);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl
    });
    if (error) {
      throw error;
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, signUp, resetPassword }}>
      {/* Mensagem de sessão expirada removida */}
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