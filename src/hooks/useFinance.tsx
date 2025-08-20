import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useFinance = () => {
  const [isFinance, setIsFinance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFinanceRole();
  }, []);

  const checkFinanceRole = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsFinance(false);
        return;
      }

      // Verificar se o usuário tem role finance
      const { data, error } = await supabase
        .rpc('is_finance', { user_id: user.id });
      
      if (error) {
        console.error('Erro ao verificar role finance:', error);
        setIsFinance(false);
        return;
      }

      setIsFinance(data);
      
    } catch (error) {
      console.error('Erro ao verificar role finance:', error);
      setIsFinance(false);
    } finally {
      setLoading(false);
    }
  };

  return { isFinance, loading };
};
