import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Redirecionar baseado no role do usuário
    if (user?.role === 'authenticator') {
      navigate('/authenticator/authenticate');
    } else if (user?.role === 'admin') {
      navigate('/dashboard/progress');
    } else {
      navigate('/dashboard/progress');
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    // The deleteNotification function was removed from useNotifications,
    // so this part of the logic needs to be re-evaluated or removed
    // if the intent was to remove the notification entirely.
    // For now, we'll just remove it from the local state if it were managed here.
    // Since it's not, we'll keep the function signature but remove the implementation.
    console.warn(`Notification deletion not implemented in useNotifications hook. Notification ID: ${notificationId}`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_upload':
        return <FileText className="w-4 h-4 text-tfe-blue-500" />;
      case 'document_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'document_rejected':
        return <XCircle className="w-4 h-4 text-tfe-red-500" />;
      case 'translation_ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
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
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-tfe-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-2">
          {/* Mobile backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-25" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification panel */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[70vh] lg:static lg:w-80 xl:w-96 lg:max-h-96 bg-white rounded-t-xl lg:rounded-xl shadow-xl lg:shadow-lg border border-gray-200 overflow-hidden">
            {/* Mobile handle bar */}
            <div className="lg:hidden flex justify-center py-2">
              <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-tfe-blue-600 hover:text-tfe-blue-800 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Lista de notificações */}
          <div className="max-h-60 lg:max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-tfe-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="text-gray-400 hover:text-tfe-red-500 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {!notification.is_read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-tfe-blue-100 text-tfe-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
} 