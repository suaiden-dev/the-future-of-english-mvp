import React, { useEffect, useState } from 'react';
import { X, Bell, FileText, CheckCircle, XCircle, Info } from 'lucide-react';
import { Notification } from '../hooks/useNotifications';

interface ToastNotificationProps {
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

export function ToastNotification({ notification, onClose, onMarkAsRead }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsVisible(false);
      setIsExiting(false);
    }, 300);
  };

  const handleMarkAsRead = () => {
    if (notification) {
      onMarkAsRead(notification.id);
      handleClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_upload':
        return <FileText className="w-5 h-5 text-tfe-blue-500" />;
      case 'document_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'document_rejected':
        return <XCircle className="w-5 h-5 text-tfe-red-500" />;
      case 'translation_ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'document_upload':
        return 'border-l-blue-500 bg-tfe-blue-50';
      case 'document_approved':
        return 'border-l-green-500 bg-green-50';
      case 'document_rejected':
        return 'border-l-red-500 bg-tfe-red-50';
      case 'translation_ready':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div
        className={`
          max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 
          transform transition-all duration-300 ease-in-out
          ${getNotificationColor(notification.type)}
          ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                {notification.title}
              </h4>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {formatTimeAgo(notification.created_at)}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs text-tfe-blue-600 hover:text-tfe-blue-800 font-medium transition-colors"
                >
                  Mark as read
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string | null) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString('en-US');
} 