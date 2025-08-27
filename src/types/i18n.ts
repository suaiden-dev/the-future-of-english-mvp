// Tipos para as traduções
export interface TranslationKeys {
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    upload: string;
    download: string;
    search: string;
    filter: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    confirm: string;
    yes: string;
    no: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    to: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    documents: string;
    profile: string;
    settings: string;
    logout: string;
    login: string;
    register: string;
  };
  auth: {
    login: string;
    register: string;
    forgotPassword: string;
    resetPassword: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    signIn: string;
    signUp: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    passwordResetSent: string;
    passwordResetSuccess: string;
  };
  dashboard: {
    welcome: string;
    overview: string;
    stats: string;
    recentActivity: string;
    quickActions: string;
    totalDocuments: string;
    pendingDocuments: string;
    completedDocuments: string;
    processingDocuments: string;
  };
  documents: {
    uploadDocument: string;
    documentName: string;
    documentType: string;
    documentStatus: string;
    uploadDate: string;
    completionDate: string;
    documentSize: string;
    documentLanguage: string;
    originalLanguage: string;
    targetLanguage: string;
    translationProgress: string;
    pending: string;
    processing: string;
    completed: string;
    cancelled: string;
    draft: string;
  };
  folders: {
    createFolder: string;
    folderName: string;
    folderColor: string;
    parentFolder: string;
    noParent: string;
    folderCreated: string;
    folderUpdated: string;
    folderDeleted: string;
  };
  notifications: {
    notifications: string;
    noNotifications: string;
    markAllAsRead: string;
    unreadCount: string;
    unreadCount_plural: string;
  };
  payments: {
    payment: string;
    paymentMethod: string;
    paymentStatus: string;
    paymentAmount: string;
    paymentDate: string;
    paymentSuccess: string;
    paymentCancelled: string;
    paymentFailed: string;
  };
  errors: {
    somethingWentWrong: string;
    tryAgain: string;
    networkError: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    validationError: string;
    fileTooLarge: string;
    invalidFileType: string;
  };
  language: {
    portuguese: string;
    spanish: string;
    english: string;
    selectLanguage: string;
  };
}

// Tipo para os idiomas suportados
export type SupportedLanguage = 'pt' | 'es' | 'en';

// Tipo para o contexto de internacionalização
export interface I18nContextType {
  currentLanguage: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, options?: any) => string;
}
