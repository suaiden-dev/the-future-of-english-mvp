import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastCheckedPath = useRef<string>('');

  useEffect(() => {
    if (loading) return;
    const currentPath = location.pathname;
    // Páginas públicas
    const publicPaths = ['/', '/login', '/register', '/translations', '/verify'];
    if (publicPaths.some(path => currentPath === path || currentPath.startsWith(path))) {
      if (user && (currentPath === '/login' || currentPath === '/register')) {
        // Redirecionar para dashboard correto
        if (user.role === 'admin') navigate('/admin', { replace: true });
        else navigate('/dashboard', { replace: true });
      }
      return;
    }
    // Se não autenticado, redirecionar para login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // Proteção de rotas por role
    if (user.role === 'admin' && !currentPath.startsWith('/admin')) {
      navigate('/admin', { replace: true });
      return;
    }
    if (user.role !== 'admin' && currentPath.startsWith('/admin')) {
      navigate('/dashboard', { replace: true });
      return;
    }
    // Se dashboard do cliente, garantir que está autenticado
    if (user.role !== 'admin' && !['/dashboard', '/upload', '/documents'].some(p => currentPath.startsWith(p))) {
      navigate('/dashboard', { replace: true });
      return;
    }
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