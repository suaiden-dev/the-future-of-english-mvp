import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook para capturar e armazenar código de referência de afiliado
 * Funciona em qualquer página que tenha query params
 */
export function useAffiliateRef() {
  const [searchParams] = useSearchParams();
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    
    if (refFromUrl) {
      console.log('[useAffiliateRef] Código de referência capturado da URL:', refFromUrl);
      // Salvar no localStorage para persistir mesmo se o usuário navegar
      localStorage.setItem('affiliate_ref', refFromUrl);
      setRefCode(refFromUrl);
    } else {
      // Se não há na URL, verificar se há no localStorage
      const refFromStorage = localStorage.getItem('affiliate_ref');
      if (refFromStorage) {
        console.log('[useAffiliateRef] Código de referência encontrado no localStorage:', refFromStorage);
        setRefCode(refFromStorage);
      }
    }
  }, [searchParams]);

  // Retornar o código atual
  return refCode || localStorage.getItem('affiliate_ref');
}

