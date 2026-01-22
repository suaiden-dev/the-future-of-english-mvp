-- Migration: Update get_affiliate_referrals to include withdrawal fields
-- This ensures the frontend can display "Available on" and "Withdrawn" amounts

CREATE OR REPLACE FUNCTION get_affiliate_referrals(p_affiliate_id uuid)
RETURNS TABLE (
  id uuid,
  referred_user_id uuid,
  referral_code text,
  status text,
  conversion_date timestamptz,
  commission_amount numeric,
  created_at timestamptz,
  user_email text,
  user_name text,
  available_for_withdrawal_at timestamptz,
  withdrawn_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.referred_user_id,
    ar.referral_code,
    ar.status,
    ar.conversion_date,
    ar.commission_amount,
    ar.created_at,
    au.email::text as user_email,
    COALESCE(p.name, au.raw_user_meta_data->>'name', '')::text as user_name,
    ar.available_for_withdrawal_at,
    ar.withdrawn_amount
  FROM affiliate_referrals ar
  JOIN auth.users au ON ar.referred_user_id = au.id
  LEFT JOIN profiles p ON ar.referred_user_id = p.id
  WHERE ar.affiliate_id = p_affiliate_id
  ORDER BY ar.created_at DESC;
END;
$$;
