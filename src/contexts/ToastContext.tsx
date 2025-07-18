import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ToastNotification } from '../components/ToastNotification';
import { Notification } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';

interface ToastContextType {
  showToast: (notification: Notification) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const { markAsRead, registerToastCallback } = useNotifications();

  const showToast = useCallback((notification: Notification) => {
    setCurrentNotification(notification);
  }, []);

  const hideToast = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  // Registrar o callback do toast no hook de notificações
  useEffect(() => {
    registerToastCallback(showToast);
  }, [registerToastCallback, showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastNotification
        notification={currentNotification}
        onClose={hideToast}
        onMarkAsRead={handleMarkAsRead}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 