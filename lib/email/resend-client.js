import { Resend } from 'resend';

// Initialize Resend client with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend
 * @param {Object} params - Email parameters
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} [params.text] - Plain text fallback
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function sendEmail({ to, subject, html, text }) {
    try {
        // Validate required parameters
        if (!to || !subject || !html) {
            throw new Error('Missing required email parameters: to, subject, html');
        }

        // Ensure RESEND_API_KEY is configured
        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not configured');
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Carol <info@useefficiency.com>',
            reply_to: process.env.REPLY_TO_EMAIL || 'info@useefficiency.com',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || undefined // Only include text if provided
        });

        if (error) {
            console.error('Resend API error:', error);
            return { success: false, error };
        }

        console.log('Email sent successfully:', data?.id);
        return { success: true, data };
    } catch (err) {
        console.error('Email service error:', err);
        return {
            success: false,
            error: err.message || 'Unknown email error'
        };
    }
}

/**
 * Send multiple emails in batch
 * @param {Array<{to: string, subject: string, html: string}>} emails
 * @returns {Promise<{success: boolean, results: Array}>}
 */
export async function sendBatchEmails(emails) {
    try {
        const results = await Promise.allSettled(
            emails.map(email => sendEmail(email))
        );

        const successCount = results.filter(
            r => r.status === 'fulfilled' && r.value.success
        ).length;

        return {
            success: true,
            results,
            successCount,
            failCount: results.length - successCount
        };
    } catch (err) {
        console.error('Batch email error:', err);
        return {
            success: false,
            error: err.message
        };
    }
}
