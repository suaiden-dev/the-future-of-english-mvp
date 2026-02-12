import { supabase } from './supabase';

/**
 * Envia um email usando a Edge Function send-email
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName?: string
) {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to, subject, html, fromName },
        });

        if (error) {
            console.error('Error sending email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Error in sendEmail:', err);
        return { success: false, error: err };
    }
}

/**
 * Envia um email com anexos
 */
export async function sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachments: Array<{
        filename: string;
        content: string; // Base64
        contentType?: string;
    }>,
    fromName?: string
) {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to, subject, html, attachments, fromName },
        });

        if (error) {
            console.error('Error sending email with attachment:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Error in sendEmailWithAttachment:', err);
        return { success: false, error: err };
    }
}

/**
 * Template HTML para notificação de novo contato
 */
export function createContactNotificationEmail(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: string;
}) {

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            width: 130px;
            height: auto;
        }
        .content {
            padding: 40px 30px;
            color: #1e293b;
        }
        .content h1 {
            margin: 0 0 20px 0;
            font-size: 24px;
            color: #1e3a8a;
        }
        .info-row {
            margin: 15px 0;
            padding: 15px;
            background-color: #f1f5f9;
            border-radius: 6px;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 5px;
        }
        .info-value {
            color: #1e293b;
            word-wrap: break-word;
        }
        .message-box {
            margin: 20px 0;
            padding: 20px;
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
        }
        .footer {
            padding: 20px 30px;
            background-color: #f8fafc;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background-color: #1e3a8a; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin-top: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            background-color: #3b82f6;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="logo-container" style="text-align: center; padding: 20px; background: white;">
            <img src="https://thefutureofenglish.com/logo.png" alt="TFOE Logo" style="width: 130px; height: auto;">
        </div>
        <div class="header">
            <h2 style="color: white; margin: 0; font-size: 20px;">New Contact Received</h2>
        </div>
        
        <div class="content">
            <h1>New Lead</h1>
            
            ${data.source ? `<p><span class="badge">${data.source}</span></p>` : ''}
            
            <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">${data.name}</div>
            </div>
            
            <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value"><a href="mailto:${data.email}" style="color: #3b82f6; text-decoration: none;">${data.email}</a></div>
            </div>
            
            ${data.phone ? `
            <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value"><a href="https://wa.me/${data.phone.replace(/\D/g, '')}" style="color: #3b82f6; text-decoration: none;">${data.phone}</a></div>
            </div>
            ` : ''}
            
            <div class="message-box">
                <div class="info-label">Message:</div>
                <div class="info-value" style="margin-top: 10px; white-space: pre-wrap;">${data.message}</div>
            </div>
            
            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                <strong>Date/Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">This is an automated email from the The Future of English system</p>
            <p style="margin: 5px 0 0 0;">Please respond directly to the lead as soon as possible</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Envia notificação de novo contato para a equipe
 */
export async function sendContactNotification(contactData: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: string;
}) {
    // Email da equipe que receberá as notificações
    const notificationEmail = import.meta.env.VITE_NOTIFICATION_EMAIL || 'info@thefutureofenglish.com';

    const html = createContactNotificationEmail(contactData);
    const subject = `${contactData.source || 'Contact'} - ${contactData.name}`;

    return await sendEmail(
        notificationEmail,
        subject,
        html,
        'The Future of English System'
    );
}

/**
 * Template HTML para tradução completada
 */
export function createTranslationCompletionEmail(data: {
    userName: string;
    filename: string;
}) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .logo-container { text-align: center; padding: 10px 0; }
        .logo { width: 150px; height: auto; }
        .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; }
        .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background-color: #1e3a8a; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin-top: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <img src="https://thefutureofenglish.com/logo.png" alt="TFOE Logo" class="logo">
        </div>
        <div class="header">
            <h1 style="margin: 0;">Your Translation is Ready!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p>We are pleased to inform you that the translation of your document <strong>${data.filename}</strong> has been successfully completed and is now available for download.</p>
            <p>You can access your translated document directly in your dashboard:</p>
            <div style="text-align: center;">
                <a href="https://thefutureofenglish.com/dashboard" class="button">Access Dashboard</a>
            </div>
            <p style="margin-top: 20px;">If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The Future of English Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email, please do not reply directly.</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Envia notificação de tradução completada para o cliente
 */
export async function sendTranslationCompletionNotification(to: string, data: {
    userName: string;
    filename: string;
}) {
    const html = createTranslationCompletionEmail(data);
    return await sendEmail(
        to,
        `Your Translation is Ready! - ${data.filename}`,
        html,
        'The Future of English'
    );
}

/**
 * Template HTML para alerta de revisão manual de Zelle (Admin)
 */
export function createZelleManualReviewEmail(data: {
    clientName: string;
    clientEmail: string;
    amount: number;
    filename: string;
    paymentId: string;
}) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .logo-container { text-align: center; padding: 10px 0; }
        .logo { width: 150px; height: auto; }
        .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; }
        .info-row { margin: 10px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px; }
        .label { font-weight: bold; color: #666; }
        .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background-color: #1e3a8a; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin-top: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <img src="https://thefutureofenglish.com/logo.png" alt="TFOE Logo" class="logo">
        </div>
        <div class="header">
            <h1 style="margin: 0;">Zelle Manual Review Required</h1>
        </div>
        <div class="content">
            <p>A payment via Zelle requires manual review by administrators.</p>
            
            <div class="info-row">
                <span class="label">Client:</span> <span>${data.clientName} (${data.clientEmail})</span>
            </div>
            <div class="info-row">
                <span class="label">Amount:</span> <span>$${data.amount.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="label">Document:</span> <span>${data.filename}</span>
            </div>

            <div style="text-align: center;">
                <a href="https://thefutureofenglish.com/admin/documents" class="button">View in Admin Panel</a>
            </div>
        </div>
        <div class="footer">
            <p>Notification System - The Future of English</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Envia alerta de revisão manual para os admins
 */
export async function sendZelleManualReviewNotification(data: {
    clientName: string;
    clientEmail: string;
    amount: number;
    filename: string;
    paymentId: string;
}) {
    const adminEmail = import.meta.env.VITE_NOTIFICATION_EMAIL || 'contato@thefutureofenglish.com';
    const html = createZelleManualReviewEmail(data);

    return await sendEmail(
        adminEmail,
        `Zelle Manual Review Required - ${data.clientName}`,
        html,
        'TFOE System'
    );
}
