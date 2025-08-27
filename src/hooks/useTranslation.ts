import { useI18n } from '../contexts/I18nContext';

/**
 * Hook personalizado para facilitar o uso das traduções
 * Fornece acesso direto às funções de tradução e idioma atual
 */
export const useTranslation = () => {
  const { t, currentLanguage, changeLanguage } = useI18n();
  
  return {
    t,
    currentLanguage,
    changeLanguage,
    // Funções de conveniência para traduções comuns
    common: {
      loading: () => t('common.loading'),
      save: () => t('common.save'),
      cancel: () => t('common.cancel'),
      delete: () => t('common.delete'),
      edit: () => t('common.edit'),
      view: () => t('common.view'),
      upload: () => t('common.upload'),
      download: () => t('common.download'),
      search: () => t('common.search'),
      filter: () => t('common.filter'),
      close: () => t('common.close'),
      back: () => t('common.back'),
      next: () => t('common.next'),
      previous: () => t('common.previous'),
      submit: () => t('common.submit'),
      confirm: () => t('common.confirm'),
      yes: () => t('common.yes'),
      no: () => t('common.no'),
      error: () => t('common.error'),
      success: () => t('common.success'),
      warning: () => t('common.warning'),
      info: () => t('common.info'),
      to: () => t('common.to'),
      user: () => t('common.user')
    },
    navigation: {
      home: () => t('navigation.home'),
      dashboard: () => t('navigation.dashboard'),
      documents: () => t('navigation.documents'),
      profile: () => t('navigation.profile'),
      settings: () => t('navigation.settings'),
      logout: () => t('navigation.logout'),
      login: () => t('navigation.login'),
      register: () => t('navigation.register')
    },
    auth: {
      login: () => t('auth.login'),
      register: () => t('auth.register'),
      forgotPassword: () => t('auth.forgotPassword'),
      resetPassword: () => t('auth.resetPassword'),
      email: () => t('auth.email'),
      password: () => t('auth.password'),
      confirmPassword: () => t('auth.confirmPassword'),
      firstName: () => t('auth.firstName'),
      lastName: () => t('auth.lastName'),
      signIn: () => t('auth.signIn'),
      signUp: () => t('auth.signUp'),
      alreadyHaveAccount: () => t('auth.alreadyHaveAccount'),
      dontHaveAccount: () => t('auth.dontHaveAccount'),
      passwordResetSent: () => t('auth.passwordResetSent'),
      passwordResetSuccess: () => t('auth.passwordResetSuccess')
    },
    dashboard: {
      welcome: () => t('dashboard.welcome'),
      welcomeBack: () => t('dashboard.welcomeBack'),
      overview: () => t('dashboard.overview'),
      stats: () => t('dashboard.stats'),
      recentActivity: () => t('dashboard.recentActivity'),
      quickActions: () => t('dashboard.quickActions'),
      totalDocuments: () => t('dashboard.totalDocuments'),
      pendingDocuments: () => t('dashboard.pendingDocuments'),
      completedDocuments: () => t('dashboard.completedDocuments'),
      processingDocuments: () => t('dashboard.processingDocuments'),
      uploadDescription: () => t('dashboard.uploadDescription')
    },
    documents: {
      uploadDocument: () => t('documents.uploadDocument'),
      documentName: () => t('documents.documentName'),
      documentType: () => t('documents.documentType'),
      documentStatus: () => t('documents.documentStatus'),
      uploadDate: () => t('documents.uploadDate'),
      completionDate: () => t('documents.completionDate'),
      documentSize: () => t('documents.documentSize'),
      documentLanguage: () => t('documents.documentLanguage'),
      originalLanguage: () => t('documents.originalLanguage'),
      targetLanguage: () => t('documents.targetLanguage'),
      translationProgress: () => t('documents.translationProgress'),
      pending: () => t('documents.pending'),
      processing: () => t('documents.processing'),
      completed: () => t('documents.completed'),
      cancelled: () => t('documents.cancelled'),
      draft: () => t('documents.draft')
    },
    errors: {
      somethingWentWrong: () => t('errors.somethingWentWrong'),
      tryAgain: () => t('errors.tryAgain'),
      networkError: () => t('errors.networkError'),
      unauthorized: () => t('errors.unauthorized'),
      forbidden: () => t('errors.forbidden'),
      notFound: () => t('errors.notFound'),
      validationError: () => t('errors.validationError'),
      fileTooLarge: () => t('errors.fileTooLarge'),
      invalidFileType: () => t('errors.invalidFileType')
    }
  };
};
