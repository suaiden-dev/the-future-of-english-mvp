-- Função para buscar informações do perfil do usuário
-- Esta função bypassa as restrições RLS para usuários autenticados

CREATE OR REPLACE FUNCTION get_user_profile_info(user_id_param UUID)
RETURNS TABLE (
  name TEXT,
  email TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.role() != 'authenticated' THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Retornar informações do perfil
  RETURN QUERY
  SELECT 
    p.name,
    p.email,
    p.phone
  FROM profiles p
  WHERE p.id = user_id_param;
END;
$$;

-- Garantir que a função seja executável por usuários autenticados
GRANT EXECUTE ON FUNCTION get_user_profile_info(UUID) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION get_user_profile_info(UUID) IS 'Function to get user profile information, bypassing RLS restrictions for authenticated users';
