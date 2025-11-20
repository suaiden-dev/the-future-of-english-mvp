-- Migration: Fix affiliate commission to be $1.00 per document, not per payment
-- When multiple documents are processed in the same Stripe session, create one commission per document
-- This ensures affiliates get $1.00 for each document translated, not just $1.00 per payment
-- IMPORTANT: Only 1 payment record is created (as it should be), but multiple commission records are created

-- 1. Add document_id column to affiliate_referrals to track which document generated each commission
ALTER TABLE affiliate_referrals 
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id) ON DELETE SET NULL;

-- 2. Remove the unique constraint on payment_id (we'll create a composite unique constraint instead)
ALTER TABLE affiliate_referrals 
DROP CONSTRAINT IF EXISTS affiliate_referrals_payment_id_key;

-- 3. Add composite unique constraint: one commission per (payment_id, document_id) combination
-- This allows multiple commissions for the same payment (one per document)
-- Only applies when payment_id is NOT NULL (for commission records, not initial referral records)
ALTER TABLE affiliate_referrals 
DROP CONSTRAINT IF EXISTS affiliate_referrals_payment_document_unique;

CREATE UNIQUE INDEX affiliate_referrals_payment_document_unique 
ON affiliate_referrals(payment_id, document_id) 
WHERE payment_id IS NOT NULL;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_document_id ON affiliate_referrals(document_id);

-- 5. Update the trigger function
CREATE OR REPLACE FUNCTION process_affiliate_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id uuid;
  v_referral_code text;
  v_commission_amount numeric := 1.00; -- Fixed $1.00 commission per document
  v_document_count integer;
  v_stripe_session_id text;
  v_existing_commissions integer;
  v_document_ids uuid[];
BEGIN
  -- Only process if status is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the stripe_session_id from the payment
    v_stripe_session_id := NEW.stripe_session_id;
    
    -- Check if user was referred by an affiliate
    -- IMPORTANT: Only look for the INITIAL referral record (where payment_id IS NULL)
    -- This is the record created when the user registers with an affiliate code
    SELECT affiliate_id, referral_code 
    INTO v_affiliate_id, v_referral_code
    FROM affiliate_referrals
    WHERE referred_user_id = NEW.user_id
      AND payment_id IS NULL  -- Only get the initial referral record (not commission records)
    ORDER BY created_at ASC  -- Get the FIRST (oldest) referral record
    LIMIT 1;
    
    -- Only create commission if user was actually referred (has initial referral record)
    IF v_affiliate_id IS NOT NULL AND v_stripe_session_id IS NOT NULL THEN
      
      -- Get document IDs from Stripe session metadata
      -- For multiple documents, the metadata contains documentIds as comma-separated string
      -- or as doc0_documentId, doc1_documentId, etc.
      SELECT 
        CASE 
          -- Try to get documentIds from metadata (comma-separated string)
          WHEN ss.metadata->>'documentIds' IS NOT NULL AND ss.metadata->>'documentIds' != '' THEN
            ARRAY(
              SELECT trim(unnest(string_to_array(ss.metadata->>'documentIds', ',')))
            )::uuid[]
          -- Try to get from doc0_documentId, doc1_documentId, etc.
          ELSE
            ARRAY(
              SELECT (ss.metadata->>('doc' || i || '_documentId'))::uuid
              FROM generate_series(0, 10) i
              WHERE ss.metadata->>('doc' || i || '_documentId') IS NOT NULL
                AND ss.metadata->>('doc' || i || '_documentId') != ''
            )
        END
      INTO v_document_ids
      FROM stripe_sessions ss
      WHERE ss.session_id = v_stripe_session_id
      LIMIT 1;
      
      -- If no documents found in metadata, use the current payment's document_id
      IF v_document_ids IS NULL OR array_length(v_document_ids, 1) IS NULL THEN
        v_document_ids := ARRAY[NEW.document_id];
      END IF;
      
      -- Filter out NULL values from array
      v_document_ids := ARRAY(SELECT unnest(v_document_ids) WHERE unnest(v_document_ids) IS NOT NULL);
      
      v_document_count := array_length(v_document_ids, 1);
      
      -- Create one commission record per document in the session
      -- Loop through each document and create a commission if it doesn't exist yet
      FOR i IN 1..v_document_count LOOP
        -- Check if commission already exists for this payment and document
        SELECT COUNT(*) INTO v_existing_commissions
        FROM affiliate_referrals
        WHERE payment_id = NEW.id
          AND document_id = v_document_ids[i]::uuid
          AND affiliate_id = v_affiliate_id;
        
        -- Only insert if commission doesn't exist yet
        IF v_existing_commissions = 0 THEN
          INSERT INTO affiliate_referrals (
            affiliate_id,
            referred_user_id,
            referral_code,
            status,
            commission_amount,
            available_for_withdrawal_at,
            payment_id,
            document_id,
            created_at
          )
          VALUES (
            v_affiliate_id,
            NEW.user_id,
            v_referral_code,
            'confirmed',
            v_commission_amount,
            now() + INTERVAL '30 days',
            NEW.id, -- Same payment_id for all documents in the session
            v_document_ids[i]::uuid, -- Unique document_id for each commission
            now()
          );
        END IF;
      END LOOP;
      
    ELSIF v_affiliate_id IS NOT NULL THEN
      -- Fallback: if no stripe_session_id, create single commission (old behavior)
      -- Check if commission already exists for this payment and document
      SELECT COUNT(*) INTO v_existing_commissions
      FROM affiliate_referrals
      WHERE payment_id = NEW.id
        AND document_id = NEW.document_id
        AND affiliate_id = v_affiliate_id;
      
      IF v_existing_commissions = 0 THEN
        INSERT INTO affiliate_referrals (
          affiliate_id,
          referred_user_id,
          referral_code,
          status,
          commission_amount,
          available_for_withdrawal_at,
          payment_id,
          document_id,
          created_at
        )
        VALUES (
          v_affiliate_id,
          NEW.user_id,
          v_referral_code,
          'confirmed',
          v_commission_amount,
          now() + INTERVAL '30 days',
          NEW.id,
          NEW.document_id,
          now()
        )
        ON CONFLICT (payment_id, document_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION process_affiliate_commission() IS 'Trigger function that creates affiliate commissions: $1.00 per document. For multiple documents in same Stripe session (single payment), creates one commission record per document.';

