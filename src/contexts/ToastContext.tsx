import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastNotification } from '../components/ToastNotification';
import { Notification } from '../hooks/useNotifications';

interface ToastContextType {
  showToast: (notification: Notification) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  const showToast = useCallback((notification: Notification) => {
    setCurrentNotification(notification);
  }, []);

  const hideToast = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    // Mark as read logic can be implemented here if needed
    console.log('Marking notification as read:', id);
  }, []);

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