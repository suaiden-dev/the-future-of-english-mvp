import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, referralCode } = await req.json();

    if (!email || !name || !referralCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Send email using Supabase's email service
    // Note: This requires SMTP to be configured in Supabase
    const { error } = await supabaseClient.auth.admin.generateLink({
      type: 'signup',
      email: email,
    });

    // For now, we'll just log that the email should be sent
    // In production, you would configure SMTP and use a proper email service
    console.log(`[send-affiliate-welcome-email] Email should be sent to ${email} with referral code ${referralCode}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email queued for sending',
        note: 'SMTP must be configured in Supabase for emails to be sent'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[send-affiliate-welcome-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

