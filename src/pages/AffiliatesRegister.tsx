import React, { useState } from 'react';
import { User, Mail, Phone, Share2, CheckCircle, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function AffiliatesRegister() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});
    
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('affiliates.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('affiliates.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('affiliates.invalidEmail');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('affiliates.phoneRequired');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const authResult = await signUp(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.name.trim(),
        formData.phone.trim(),
        'user'
      );

      if (!authResult.user) {
        throw new Error('Falha ao criar conta de usuário');
      }

      // Criar registro de afiliado usando função do banco de dados
      // Isso bypassa RLS e retorna o referral_code diretamente
      const { data: functionResult, error: functionError } = await supabase
        .rpc('register_affiliate', {
          p_user_id: authResult.user.id,
          p_name: formData.name.trim(),
          p_email: formData.email.trim().toLowerCase(),
          p_phone: formData.phone.trim() || null
        });

      if (functionError) {
        console.error('[AffiliatesRegister] Erro ao criar registro de afiliado:', functionError);
        console.error('[AffiliatesRegister] Detalhes do erro:', {
          code: functionError.code,
          message: functionError.message,
          details: functionError.details,
          hint: functionError.hint
        });
        
        if (functionError.code === '23505') {
          setErrors({ general: t('affiliates.emailAlreadyRegistered') });
        } else if (functionError.code === '42501') {
          setErrors({ general: 'Permissão negada. Por favor, tente novamente.' });
        } else {
          setErrors({ general: functionError.message || t('affiliates.registrationFailed') });
        }
        return;
      }

      // Se chegou aqui, o registro foi criado com sucesso
      const referralCode = functionResult && functionResult.length > 0 ? functionResult[0].referral_code : null;
      
      if (referralCode) {
        setReferralCode(referralCode);
      }
      
      setSuccess(true);
      
      // Nota: O Supabase Auth envia automaticamente o email de confirmação quando:
      // 1. enable_confirmations = true no config.toml
      // 2. SMTP está configurado no Supabase Dashboard
      // O email será enviado automaticamente pelo Supabase após o signUp
      
    } catch (err: any) {
      let errorMessage = t('affiliates.registrationFailed');
      
      if (err?.message) {
        if (err.message.includes('already registered') || err.message.includes('already exists') || err.message.includes('User already registered')) {
          errorMessage = t('affiliates.emailAlreadyRegistered');
        } else if (err.message.includes('password')) {
          errorMessage = t('auth.passwordTooShort');
        } else if (err.message.includes('email')) {
          errorMessage = t('affiliates.invalidEmail');
        } else {
          errorMessage = err.message;
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen relative bg-gradient-to-br from-tfe-blue-950 via-tfe-blue-950 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Wave Shapes Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C50,200 150,180 350,200 C550,220 650,190 850,210 C950,220 1050,200 1250,180 L1250,300 L-50,300 Z" fill="white" opacity="1"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-30px)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C100,190 250,170 450,195 C650,220 750,185 950,205 C1050,215 1100,195 1250,175 L1250,300 L-50,300 Z" fill="white" opacity="0.35"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-60px)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C70,200 230,185 400,200 C600,220 700,195 900,210 C1000,220 1070,200 1250,185 L1250,300 L-50,300 Z" fill="white" opacity="0.25"/>
            </svg>
          </div>
        </div>
        
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              {t('affiliates.registrationSuccessTitle')}
            </h2>
            <div className="mt-6 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                {t('affiliates.registrationSuccessMessage')}
              </p>
              {referralCode && (
                <div className="bg-gradient-to-r from-tfe-blue-50 to-tfe-red-50 rounded-lg p-6 border-2 border-tfe-blue-200 mb-4">
                  <p className="text-xs text-gray-600 text-center mb-2 font-medium uppercase tracking-wide">
                    {t('affiliates.yourReferralCode')}
                  </p>
                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-tfe-blue-300">
                    <p className="text-2xl font-bold text-tfe-blue-900 text-center font-mono tracking-wider">
                      {referralCode}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 text-center mt-3">
                    {t('affiliates.referralCodeDescription')}
                  </p>
                </div>
              )}
              <div className="bg-tfe-blue-50 rounded-lg p-4 border border-tfe-blue-200 mb-4">
                <p className="text-sm text-tfe-blue-800 text-center font-medium mb-2">
                  📧 {t('affiliates.emailVerificationSent')}
                </p>
                <p className="text-xs text-tfe-blue-700 text-center">
                  {t('affiliates.emailVerificationMessage')}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate('/affiliates/dashboard')}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-tfe-blue-600 to-tfe-red-600 hover:from-tfe-blue-700 hover:to-tfe-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('affiliates.goToDashboard')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-tfe-blue-950 via-tfe-blue-950 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Wave Shapes Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}>
          <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
            <path d="M-50,300 C50,200 150,180 350,200 C550,220 650,190 850,210 C950,220 1050,200 1250,180 L1250,300 L-50,300 Z" fill="white" opacity="1"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-30px)' }}>
          <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
            <path d="M-50,300 C100,190 250,170 450,195 C650,220 750,185 950,205 C1050,215 1100,195 1250,175 L1250,300 L-50,300 Z" fill="white" opacity="0.35"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-60px)' }}>
          <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
            <path d="M-50,300 C70,200 230,185 400,200 C600,220 700,195 900,210 C1000,220 1070,200 1250,185 L1250,300 L-50,300 Z" fill="white" opacity="0.25"/>
          </svg>
        </div>
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('affiliates.registerTitle')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('affiliates.name')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border ${
                    errors.name ? 'border-tfe-red-300 focus:ring-red-500 focus:border-tfe-red-500' : 'border-gray-300 focus:ring-tfe-blue-500 focus:border-tfe-blue-500'
                  } placeholder-gray-500 text-gray-900 focus:outline-none sm:text-sm transition-colors`}
                  placeholder={t('affiliates.namePlaceholder')}
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              {errors.name && (
                <p className="mt-2 text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-1">⚠️</span> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {t('affiliates.phone')} (WhatsApp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={`appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border ${
                    errors.phone ? 'border-tfe-red-300 focus:ring-red-500 focus:border-tfe-red-500' : 'border-gray-300 focus:ring-tfe-blue-500 focus:border-tfe-blue-500'
                  } placeholder-gray-500 text-gray-900 focus:outline-none sm:text-sm transition-colors`}
                  placeholder="+55 (99) 99999-9999"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-1">⚠️</span> {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('affiliates.email')} <span className="text-red-500">*</span>
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
                  className={`appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border ${
                    errors.email ? 'border-tfe-red-300 focus:ring-red-500 focus:border-tfe-red-500' : 'border-gray-300 focus:ring-tfe-blue-500 focus:border-tfe-blue-500'
                  } placeholder-gray-500 text-gray-900 focus:outline-none sm:text-sm transition-colors`}
                  placeholder={t('affiliates.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-1">⚠️</span> {errors.email}
                </p>
              )}
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
                  className={`appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border ${
                    errors.password ? 'border-tfe-red-300 focus:ring-red-500 focus:border-tfe-red-500' : 'border-gray-300 focus:ring-tfe-blue-500 focus:border-tfe-blue-500'
                  } placeholder-gray-500 text-gray-900 focus:outline-none sm:text-sm transition-colors`}
                  placeholder={t('affiliates.passwordPlaceholder')}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-1">⚠️</span> {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.confirmPassword')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={`appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border ${
                    errors.confirmPassword ? 'border-tfe-red-300 focus:ring-red-500 focus:border-tfe-red-500' : 'border-gray-300 focus:ring-tfe-blue-500 focus:border-tfe-blue-500'
                  } placeholder-gray-500 text-gray-900 focus:outline-none sm:text-sm transition-colors`}
                  placeholder={t('affiliates.confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-1">⚠️</span> {errors.confirmPassword}
                </p>
              )}
            </div>

            {errors.general && (
              <div className="bg-tfe-red-50 border border-tfe-red-200 rounded-lg p-4">
                <p className="text-sm text-tfe-red-600 flex items-center">
                  <span className="mr-2">❌</span> {errors.general}
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-tfe-blue-600 to-tfe-red-600 hover:from-tfe-blue-700 hover:to-tfe-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('affiliates.submitting')}
                  </div>
                ) : (
                  t('affiliates.register')
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('affiliates.alreadyHaveAccount')}{' '}
              <Link to="/affiliates/login" className="text-tfe-blue-600 hover:text-tfe-blue-700 font-medium">
                {t('affiliates.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

