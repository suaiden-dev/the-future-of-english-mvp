import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
        const { to, subject, html, fromName, attachments } = await req.json();

        if (!to || !subject || !html) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Detecta localhost e simula envio
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const isLocalhost = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

        if (isLocalhost) {
            console.log(`🏠 Localhost detected. Skipping real SMTP send to: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`HTML preview: ${html.substring(0, 200)}...`);
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Localhost mode: Email skipped (simulated success)'
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Carrega configurações SMTP
        const smtpHost = Deno.env.get('SMTP_HOST');
        const smtpPort = Number(Deno.env.get('SMTP_PORT'));
        const smtpUser = Deno.env.get('SMTP_USER');
        const smtpPass = Deno.env.get('SMTP_PASS');
        const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || smtpUser;
        const smtpFromName = fromName || Deno.env.get('SMTP_FROM_NAME') || 'The Future of English';

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            console.error('Missing SMTP configuration');
            return new Response(
                JSON.stringify({ error: 'SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Importa Nodemailer
        const nodemailer = await import('npm:nodemailer@6.9.7');

        // Cria transporter
        const transporter = nodemailer.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // SSL para porta 465
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        // Prepara email
        const emailConfig: any = {
            from: `${smtpFromName} <${smtpFromEmail}>`,
            to: to,
            subject: subject,
            html: html,
        };

        // Adiciona anexos se fornecidos
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            emailConfig.attachments = attachments.map((att: any) => ({
                filename: att.filename,
                content: att.content,
                encoding: 'base64',
                contentType: att.contentType || 'application/pdf'
            }));
        }

        // Envia email
        console.log(`Sending email to: ${to}`);
        await transporter.sendMail(emailConfig);
        console.log(`Email sent successfully to: ${to}`);

        return new Response(
            JSON.stringify({ success: true, message: 'Email sent successfully' }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('[send-email] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to send email' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
