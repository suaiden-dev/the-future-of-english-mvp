import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function AffiliatesLogin() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signIn, user } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Verificar se o usuário já está logado e é afiliado
  useEffect(() => {
    const checkAffiliate = async () => {
      if (user) {
        try {
          const { data: isAffiliate, error } = await supabase
            .rpc('is_user_affiliate', { p_user_id: user.id });

          if (isAffiliate && !error) {
            navigate('/affiliates/dashboard');
          }
        } catch (err) {
          console.error('[AffiliatesLogin] Erro ao verificar afiliado:', err);
        }
      }
    };

    checkAffiliate();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError(t('errors.validationError'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('affiliates.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      await signIn(formData.email.trim().toLowerCase(), formData.password);
      
      // Aguardar um pouco para garantir que a sessão está estabelecida
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar se é afiliado após login usando a função
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: isAffiliate, error: checkError } = await supabase
          .rpc('is_user_affiliate', { p_user_id: authUser.id });

        if (isAffiliate && !checkError) {
          // Removido toast de sucesso do login
          // Usar replace para evitar voltar para login
          navigate('/affiliates/dashboard', { replace: true });
        } else {
          // Usuário logado mas não é afiliado - redirecionar para dashboard normal
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      let errorMessage = t('affiliates.loginFailed');
      
      if (err?.message) {
        const message = err.message.toLowerCase();
        if (message.includes('invalid login credentials') || 
            message.includes('invalid email or password') ||
            message.includes('invalid credentials')) {
          errorMessage = t('affiliates.invalidCredentials');
        } else if (message.includes('email not confirmed') || 
                   message.includes('email confirmation')) {
          errorMessage = t('affiliates.emailNotConfirmed');
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('affiliates.loginTitle')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 sm:text-sm transition-colors"
                  placeholder={t('affiliates.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 sm:text-sm transition-colors"
                  placeholder={t('auth.password')}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-tfe-blue-600 hover:text-tfe-blue-700"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-tfe-red-50 border border-tfe-red-200 rounded-lg p-4">
                <p className="text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-2">❌</span> {error}
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-tfe-blue-600 to-tfe-red-600 hover:from-tfe-blue-700 hover:to-tfe-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.loading')}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    {t('affiliates.login')}
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('affiliates.dontHaveAccount')}{' '}
              <Link to="/affiliates/register" className="text-tfe-blue-600 hover:text-tfe-blue-700 font-medium">
                {t('affiliates.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

