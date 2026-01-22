import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastCheckedPath = useRef<string>('');
  const [isAffiliate, setIsAffiliate] = useState<boolean | null>(null);
  const [checkingAffiliate, setCheckingAffiliate] = useState(false);
  const checkedUserId = useRef<string | null>(null);
  
  // Reset affiliate check when user changes
  useEffect(() => {
    if (!user) {
      setIsAffiliate(null);
      checkedUserId.current = null;
    }
  }, [user]);

  // Verificar se o usuário é afiliado (apenas uma vez por usuário)
  useEffect(() => {
    const checkAffiliate = async () => {
      if (!user || checkingAffiliate || checkedUserId.current === user.id) {
        return;
      }

      setCheckingAffiliate(true);
      checkedUserId.current = user.id;
      
      try {
        // Usar função do banco de dados para verificar se é afiliado
        // Isso bypassa RLS e é mais confiável
        const { data, error } = await supabase
          .rpc('is_user_affiliate', { p_user_id: user.id });

        // A função retorna true/false
        setIsAffiliate(data === true && !error);
      } catch (err) {
        // Se der erro, assumir que não é afiliado
        console.error('[AuthRedirect] Erro ao verificar afiliado:', err);
        setIsAffiliate(false);
      } finally {
        setCheckingAffiliate(false);
      }
    };

    checkAffiliate();
  }, [user, checkingAffiliate]);

  useEffect(() => {
    if (loading || checkingAffiliate || isAffiliate === null) {
      return;
    }
    const currentPath = location.pathname;
    
    // Rotas públicas SEMPRE acessíveis (mas não rotas de afiliados logados)
    const publicPaths = ['/', '/login', '/register', '/translations', '/verify'];
    const isPublicPath = publicPaths.some(path => currentPath === path || currentPath.startsWith(path));
    const isAffiliatePublicPath = currentPath === '/affiliates/register' || currentPath === '/affiliates/login';
    
    if (isPublicPath || isAffiliatePublicPath) {
      // Se já está logado e tenta acessar login/register, redireciona para dashboard correto
      if (user && (currentPath === '/login' || currentPath === '/register')) {
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (user.role === 'authenticator') {
          navigate('/authenticator', { replace: true });
        } else if (user.role === 'finance') {
          navigate('/finance', { replace: true });
        } else if (user.role === 'user') {
          // Se for afiliado, redirecionar para dashboard de afiliados
          if (isAffiliate) {
            navigate('/affiliates/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
      return;
    }
    // Rotas privadas
    const privatePaths = ['/dashboard', '/upload', '/admin', '/authenticator', '/finance', '/documents'];
    const isPrivate = privatePaths.some(path => currentPath.startsWith(path));
    if (isPrivate && !user) {
      navigate('/login', { replace: true });
      return;
    }
    // Proteção de rotas por role
    if (user?.role === 'admin' && !currentPath.startsWith('/admin')) {
      if (currentPath !== '/admin') {
        navigate('/admin', { replace: true });
      }
      return;
    }
    if (user?.role === 'authenticator' && !currentPath.startsWith('/authenticator')) {
      if (currentPath !== '/authenticator') {
        navigate('/authenticator', { replace: true });
      }
      return;
    }
    if (user?.role === 'finance' && !currentPath.startsWith('/finance')) {
      if (currentPath !== '/finance') {
        navigate('/finance', { replace: true });
      }
      return;
    }
    if (user?.role === 'user') {
      // Se for afiliado, permitir acesso a rotas de afiliados
      if (isAffiliate) {
        // Se está tentando acessar dashboard normal, redirecionar para dashboard de afiliados
        if (currentPath.startsWith('/dashboard') && !currentPath.startsWith('/affiliates')) {
          navigate('/affiliates/dashboard', { replace: true });
          return;
        }
        // Permitir acesso a rotas de afiliados
        if (currentPath.startsWith('/affiliates')) {
          return; // Permitir acesso
        }
        // Se não está em uma rota de afiliados ou dashboard normal, redirecionar para dashboard de afiliados
        if (!['/dashboard', '/upload', '/documents'].some(p => currentPath.startsWith(p))) {
          navigate('/affiliates/dashboard', { replace: true });
          return;
        }
      } else {
        // Se não é afiliado, comportamento normal
        if (!['/dashboard', '/upload', '/documents'].some(p => currentPath.startsWith(p))) {
          if (currentPath !== '/dashboard') {
            navigate('/dashboard', { replace: true });
          }
          return;
        }
      }
    }
  }, [user, loading, location.pathname, navigate, isAffiliate, checkingAffiliate]);

  if (loading || checkingAffiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="md" color="blue" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect; 