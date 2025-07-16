import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastCheckedPath = useRef<string>('');

  useEffect(() => {
    if (loading) {
      console.log('[AuthRedirect] loading=true, aguardando contexto...');
      return;
    }
    const currentPath = location.pathname;
    console.log('[AuthRedirect] Checando navegação:', { currentPath, user });
    // Rotas públicas SEMPRE acessíveis
    const publicPaths = ['/', '/login', '/register', '/translations', '/verify'];
    if (publicPaths.some(path => currentPath === path || currentPath.startsWith(path))) {
      // Se já está logado e tenta acessar login/register, redireciona para dashboard correto
      if (user && (currentPath === '/login' || currentPath === '/register')) {
        if (user.role === 'admin') {
          console.log('[AuthRedirect] Usuário admin tentando acessar login/register, redirecionando para /admin');
          navigate('/admin', { replace: true });
        } else if (user.role === 'authenticator') {
          console.log('[AuthRedirect] Usuário autenticador tentando acessar login/register, redirecionando para /authenticator');
          navigate('/authenticator', { replace: true });
        } else if (user.role === 'user') {
          console.log('[AuthRedirect] Usuário comum tentando acessar login/register, redirecionando para /dashboard');
          navigate('/dashboard', { replace: true });
        }
      } else {
        console.log('[AuthRedirect] Página pública acessada:', currentPath, 'User:', user);
      }
      return;
    }
    // Rotas privadas
    const privatePaths = ['/dashboard', '/upload', '/admin', '/authenticator', '/documents'];
    const isPrivate = privatePaths.some(path => currentPath.startsWith(path));
    if (isPrivate && !user) {
      console.log('[AuthRedirect] Tentativa de acesso a rota privada sem login, redirecionando para /login:', currentPath);
      navigate('/login', { replace: true });
      return;
    }
    // Proteção de rotas por role
    if (user?.role === 'admin' && !currentPath.startsWith('/admin')) {
      if (currentPath !== '/admin') {
        console.log('[AuthRedirect] Admin tentando acessar rota não-admin, redirecionando para /admin:', currentPath);
        navigate('/admin', { replace: true });
      }
      return;
    }
    if (user?.role === 'authenticator' && !currentPath.startsWith('/authenticator')) {
      if (currentPath !== '/authenticator') {
        console.log('[AuthRedirect] Autenticador tentando acessar rota não-autenticador, redirecionando para /authenticator:', currentPath);
        navigate('/authenticator', { replace: true });
      }
      return;
    }
    if (user?.role === 'user' && !['/dashboard', '/upload', '/documents'].some(p => currentPath.startsWith(p))) {
      if (currentPath !== '/dashboard') {
        console.log('[AuthRedirect] Usuário comum tentando acessar rota não-dashboard, redirecionando para /dashboard:', currentPath);
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    console.log('[AuthRedirect] Nenhum redirecionamento necessário:', { currentPath, user });
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirect; 