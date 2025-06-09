const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Check if we're running on localhost
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'test' || 
                   !process.env.NODE_ENV ||
                   !process.env.MAILGUN_API_KEY;

// Test email override - set this to your email for testing
const TEST_EMAIL_OVERRIDE = 'efemarko1@gmail.com';

// Initialize Mailgun
let mailgun = null;
let mg = null;

function initializeMailgun() {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        console.warn('⚠️  Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.');
        return null;
    }

    try {
        mailgun = new Mailgun(formData);
        mg = mailgun.client({
            username: 'api',
            key: process.env.MAILGUN_API_KEY
        });
        
        console.log(`📧 Mailgun initialized for domain: ${process.env.MAILGUN_DOMAIN}`);
        return mg;
    } catch (error) {
        console.error('❌ Failed to initialize Mailgun:', error.message);
        return null;
    }
}

// Mock email function for development
function mockSendEmail(to, subject, text, html) {
    console.log('📧 MOCK EMAIL SERVICE - Would send email:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', text || html);
    console.log('---');
    return Promise.resolve({
        id: `mock-${Date.now()}@localhost`,
        message: 'Queued. Thank you.'
    });
}

// Send email function
async function sendEmail(to, subject, text, html = null) {
    try {
        // Override recipient for testing if specified
        const finalTo = TEST_EMAIL_OVERRIDE && !isLocalhost ? TEST_EMAIL_OVERRIDE : to;
        
        if (TEST_EMAIL_OVERRIDE && !isLocalhost && to !== TEST_EMAIL_OVERRIDE) {
            console.log(`📧 Email redirected from ${to} to ${TEST_EMAIL_OVERRIDE} for testing`);
        }

        if (isLocalhost) {
            console.log('📧 Using MOCK email service for localhost');
            const result = await mockSendEmail(finalTo, subject, text, html);
            console.log(`✅ Email sent successfully to ${finalTo}: ${result.id}`);
            return result;
        }

        console.log('📧 Using REAL Mailgun service for production');
        
        // Initialize Mailgun if not already done
        if (!mg) {
            mg = initializeMailgun();
            if (!mg) {
                throw new Error('Mailgun not configured properly');
            }
        }

        const messageData = {
            from: process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`,
            to: finalTo,
            subject: subject,
            text: text
        };

        if (html) {
            messageData.html = html;
        }

        const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
        console.log(`✅ Email sent successfully to ${finalTo}: ${result.id}`);
        return result;

    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        throw error;
    }
}

// Send monitor alert email
async function sendMonitorAlert(userEmail, monitorName, monitorUrl, status, responseTime, errorMessage, timestamp) {
    const isDown = status === 'down';
    const subject = `🚨 ${monitorName} is ${status.toUpperCase()}`;
    
    const text = `
Monitor Alert - ${monitorName}

Status: ${status.toUpperCase()}
URL: ${monitorUrl}
${responseTime ? `Response Time: ${responseTime}ms` : ''}
${errorMessage ? `Error: ${errorMessage}` : ''}
Timestamp: ${timestamp}

${isDown ? 
    'Your monitor is currently down. We will continue checking and notify you when it recovers.' :
    'Your monitor has recovered and is now up!'
}

Best regards,
Uptime Kama Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monitor Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isDown ? '#dc3545' : '#28a745'}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 10px; border-radius: 0 0 5px 5px; font-size: 12px; }
        .status { font-weight: bold; color: ${isDown ? '#dc3545' : '#28a745'}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>${isDown ? '🚨' : '✅'} Monitor Alert</h2>
        </div>
        <div class="content">
            <h3>${monitorName}</h3>
            <div class="details">
                <p><strong>Status:</strong> <span class="status">${status.toUpperCase()}</span></p>
                <p><strong>URL:</strong> <a href="${monitorUrl}">${monitorUrl}</a></p>
                ${responseTime ? `<p><strong>Response Time:</strong> ${responseTime}ms</p>` : ''}
                ${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ''}
                <p><strong>Timestamp:</strong> ${timestamp}</p>
            </div>
            <p>
                ${isDown ? 
                    'Your monitor is currently down. We will continue checking and notify you when it recovers.' :
                    'Your monitor has recovered and is now up!'
                }
            </p>
        </div>
        <div class="footer">
            This alert was sent by Uptime Kama monitoring system.
        </div>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(userEmail, subject, text, html);
}

// Test email function
async function sendTestEmail(userEmail) {
    const subject = '✅ Uptime Kama - Email Notifications Test (Mailgun)';
    const text = `
Hello!

This is a test email from Uptime Kama to confirm that Mailgun email notifications are working correctly.

Email Provider: Mailgun
Domain: ${process.env.MAILGUN_DOMAIN || 'Not configured'}
Mode: ${isLocalhost ? 'Development (Mock)' : 'Production (Real Mailgun)'}

If you received this email, your notification settings are configured properly.

Best regards,
Uptime Kama Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mailgun Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 10px; border-radius: 0 0 5px 5px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ Mailgun Test Email</h2>
        </div>
        <div class="content">
            <h3>Hello!</h3>
            <p>This is a test email from <strong>Uptime Kama</strong> to confirm that Mailgun email notifications are working correctly.</p>
            
            <div class="details">
                <h4>Configuration:</h4>
                <p><strong>Email Provider:</strong> Mailgun</p>
                <p><strong>Domain:</strong> ${process.env.MAILGUN_DOMAIN || 'Not configured'}</p>
                <p><strong>Mode:</strong> ${isLocalhost ? 'Development (Mock)' : 'Production (Real Mailgun)'}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p>If you received this email, your notification settings are configured properly.</p>
            <p>You're all set to receive monitor alerts!</p>
        </div>
        <div class="footer">
            This test email was sent by Uptime Kama monitoring system using Mailgun.
        </div>
    </div>
</body>
</html>
    `.trim();

    return await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendEmail,
    sendMonitorAlert,
    sendTestEmail,
    isLocalhost
}; 