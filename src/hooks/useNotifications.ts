import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Tables } from '../lib/database.types';

export type Notification = Tables<'notifications'>;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState<((notification: Notification) => void) | null>(null);

  // Buscar notificações existentes
  useEffect(() => {
    if (!user) return;

    async function fetchNotifications() {
      try {
        console.log('[useNotifications] Buscando notificações...');
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[useNotifications] Erro ao buscar notificações:', error);
          return;
        }

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
        console.log('[useNotifications] Notificações carregadas:', data?.length);
      } catch (err) {
        console.error('[useNotifications] Erro inesperado:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [user]);

  // Configurar Realtime para novas notificações
  useEffect(() => {
    if (!user) return;

    console.log('[useNotifications] Configurando Realtime...');
    
    const channel = supabase
      .channel('notifications')
              .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user!.id}`
          },
        (payload) => {
          console.log('[useNotifications] Nova notificação recebida:', payload);
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast notification
          if (showToast) {
            showToast(newNotification);
          }
          
          // Mostrar notificação do navegador (opcional)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico'
              });
            }
          }
        }
      )
              .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user!.id}`
          },
        (payload) => {
          console.log('[useNotifications] Notificação atualizada:', payload);
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Recalcular contagem de não lidas
          setNotifications(prev => {
            const unread = prev.filter(n => !n.is_read).length;
            setUnreadCount(unread);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[useNotifications] Desconectando Realtime...');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user!.id);

      if (error) {
        console.error('[useNotifications] Erro ao marcar como lida:', error);
        return false;
      }

      console.log('[useNotifications] Notificação marcada como lida:', notificationId);
      return true;
    } catch (err) {
      console.error('[useNotifications] Erro inesperado:', err);
      return false;
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) {
        console.error('[useNotifications] Erro ao marcar todas como lidas:', error);
        return false;
      }

      console.log('[useNotifications] Todas as notificações marcadas como lidas');
      setUnreadCount(0);
      return true;
    } catch (err) {
      console.error('[useNotifications] Erro inesperado:', err);
      return false;
    }
  };

  // Deletar notificação
  const deleteNotification = async (notificationId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user!.id);

      if (error) {
        console.error('[useNotifications] Erro ao deletar notificação:', error);
        return false;
      }

      console.log('[useNotifications] Notificação deletada:', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      return true;
    } catch (err) {
      console.error('[useNotifications] Erro inesperado:', err);
      return false;
    }
  };

  // Função para registrar o callback do toast
  const registerToastCallback = (callback: (notification: Notification) => void) => {
    setShowToast(() => callback);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    registerToastCallback
  };
} 