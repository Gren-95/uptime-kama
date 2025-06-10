const sgMail = require('@sendgrid/mail');

// Check if we're running on localhost or in test mode
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'test' || 
                   !process.env.NODE_ENV ||
                   !process.env.SENDGRID_API_KEY ||
                   process.env.PLAYWRIGHT_TEST === 'true';

// Test email override - set this to your email for testing
const TEST_EMAIL_OVERRIDE = 'prii.sander@gmail.com';

// Configuration for SendGrid sender
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'prii.sander@gmail.com';
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Status Monitor';

// Initialize SendGrid
function initializeSendGrid() {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('⚠️  SendGrid not configured. Set SENDGRID_API_KEY environment variable.');
        console.warn('📧 Email notifications will not work without a valid SendGrid API key.');
        return false;
    }

    try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log(`📧 SendGrid initialized with API key: ${process.env.SENDGRID_API_KEY.substring(0, 10)}...`);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize SendGrid:', error.message);
        return false;
    }
}

// Mock email function for development
function mockSendEmail(to, subject, text, html) {
    console.log('📧 MOCK EMAIL SERVICE - Would send email:');
    console.log(`From: ${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', text || html);
    console.log('---');
    return Promise.resolve({
        id: `mock-${Date.now()}@localhost`,
        message: 'Queued. Thank you.',
        statusCode: 202
    });
}

// Send email function with improved error handling
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

        console.log('📧 Using REAL SendGrid service for production');
        
        // Initialize SendGrid if not already done
        if (!initializeSendGrid()) {
            throw new Error('SendGrid not configured properly');
        }

        const messageData = {
            to: finalTo,
            from: {
                email: DEFAULT_FROM_EMAIL,
                name: DEFAULT_FROM_NAME
            },
            subject: subject,
            text: text
        };

        if (html) {
            messageData.html = html;
        }

        console.log(`📤 Sending email from ${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}> to ${finalTo}`);
        console.log(`Subject: ${subject}`);

        const result = await sgMail.send(messageData);
        
        console.log(`✅ Email sent successfully!`);
        console.log(`Status Code: ${result[0].statusCode}`);
        console.log(`Message ID: ${result[0].headers['x-message-id'] || 'Not provided'}`);
        
        return {
            id: result[0].headers['x-message-id'] || `sendgrid-${Date.now()}`,
            message: 'Queued. Thank you.',
            statusCode: result[0].statusCode
        };

    } catch (error) {
        console.error('❌ SendGrid email failed:');
        console.error(`Error: ${error.message}`);

        if (error.response && error.response.body) {
            console.error('SendGrid API Response:', JSON.stringify(error.response.body, null, 2));
        }

        // Enhanced error handling for common SendGrid issues
        if (
            error.message.includes('does not match a verified Sender Identity') ||
            (error.response && JSON.stringify(error.response.body).includes('does not match a verified Sender Identity'))
        ) {
            console.log('\n🔧 SENDER VERIFICATION NEEDED:');
            console.log('1. Go to: https://app.sendgrid.com/settings/sender_auth');
            console.log('2. Click "Create a Single Sender" or verify your domain.');
            console.log(`3. Verify ${DEFAULT_FROM_EMAIL} as a sender.`);
            console.log('4. Check your email inbox for verification.');
            console.log('5. Try sending again after verification.');
        } else {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('- Check if the "from" address is verified in SendGrid.');
            console.log('- Check recipient spam folder.');
            console.log('- Check SendGrid activity: https://app.sendgrid.com/email_activity');
            console.log('- If using free SendGrid account, verify Single Sender or Domain Authentication.');
        }
        
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
    const subject = '✅ Uptime Kama - Email Notifications Test (SendGrid)';
    const text = `
Hello!

This is a test email from Uptime Kama to confirm that SendGrid email notifications are working correctly.

Email Provider: SendGrid
From Email: ${DEFAULT_FROM_EMAIL}
From Name: ${DEFAULT_FROM_NAME}
Mode: ${isLocalhost ? 'Development (Mock)' : 'Production (Real SendGrid)'}

If you received this email, your notification settings are configured properly.

Best regards,
Uptime Kama Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SendGrid Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 10px; border-radius: 0 0 5px 5px; font-size: 12px; }
        .logo { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📧 SendGrid</div>
            <h2>✅ Test Email Success</h2>
        </div>
        <div class="content">
            <h3>Hello!</h3>
            <p>This is a test email from <strong>Uptime Kama</strong> to confirm that SendGrid email notifications are working correctly.</p>
            
            <div class="details">
                <h4>Configuration:</h4>
                <p><strong>Email Provider:</strong> SendGrid</p>
                <p><strong>From Email:</strong> ${DEFAULT_FROM_EMAIL}</p>
                <p><strong>From Name:</strong> ${DEFAULT_FROM_NAME}</p>
                <p><strong>Mode:</strong> ${isLocalhost ? 'Development (Mock)' : 'Production (Real SendGrid)'}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p>If you received this email, your notification settings are configured properly.</p>
            <p>You're all set to receive monitor alerts!</p>
        </div>
        <div class="footer">
            This test email was sent by Uptime Kuma monitoring system using SendGrid API.
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