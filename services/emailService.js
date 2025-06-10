const nodemailer = require('nodemailer');

// Check if we're running on localhost or in test mode
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.NODE_ENV === 'test' || 
                   (!process.env.NODE_ENV && !process.env.SMTP_HOST && !process.env.SMTP_USER) ||
                   process.env.PLAYWRIGHT_TEST === 'true';

// Test email override - set this to your email for testing
const TEST_EMAIL_OVERRIDE = 'prii.sander@gmail.com';

// Configuration for SMTP sender
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'up@up.bee-srv.me';
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Status Monitor';

// SMTP Configuration
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

let transporter = null;

// Initialize SMTP transporter
function initializeSMTP() {
    if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
        console.warn('⚠️  SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
        console.warn('📧 Email notifications will not work without valid SMTP configuration.');
        return false;
    }

    try {
        transporter = nodemailer.createTransport(SMTP_CONFIG);
        console.log(`📧 SMTP initialized:`);
        console.log(`   Host: ${SMTP_CONFIG.host}`);
        console.log(`   Port: ${SMTP_CONFIG.port} (${SMTP_CONFIG.secure ? 'SSL/TLS' : 'STARTTLS'})`);
        console.log(`   User: ${SMTP_CONFIG.auth.user}`);
        console.log(`   From: ${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize SMTP:', error.message);
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

        console.log('📧 Using REAL SMTP service for production');
        
        // Initialize SMTP if not already done
        if (!initializeSMTP()) {
            throw new Error('SMTP not configured properly');
        }

        const messageData = {
            from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
            to: finalTo,
            subject: subject,
            text: text
        };

        if (html) {
            messageData.html = html;
        }

        console.log(`📤 Sending email from ${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}> to ${finalTo}`);
        console.log(`Subject: ${subject}`);

        const result = await transporter.sendMail(messageData);
        
        console.log(`✅ Email sent successfully!`);
        console.log(`Message ID: ${result.messageId}`);
        console.log(`Response: ${result.response}`);
        
        return {
            id: result.messageId || `smtp-${Date.now()}`,
            message: 'Email sent successfully',
            statusCode: 250
        };

    } catch (error) {
        console.error('❌ SMTP email failed:');
        console.error(`Error: ${error.message}`);

        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }

        // Enhanced error handling for common SMTP issues
        if (error.code === 'EAUTH' || error.message.includes('authentication failed')) {
            console.log('\n🔧 AUTHENTICATION ERROR:');
            console.log('1. Check your SMTP username and password');
            console.log('2. Verify your Mailgun domain is active');
            console.log('3. Check if your Mailgun API key is correct');
            console.log('4. Make sure your IP is not blocked');
        } else if (error.code === 'ECONNECTION' || error.message.includes('connection')) {
            console.log('\n🔧 CONNECTION ERROR:');
            console.log('1. Check your internet connection');
            console.log('2. Verify SMTP host and port settings');
            console.log('3. Check if firewall is blocking the connection');
            console.log('4. Try different ports: 587, 465, 25, or 2525');
        } else {
            console.log('\n💡 TROUBLESHOOTING TIPS:');
            console.log('- Check SMTP configuration settings');
            console.log('- Verify the "from" address is allowed by your SMTP provider');
            console.log('- Check recipient spam folder');
            console.log('- Review Mailgun logs for more details');
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
    const subject = '✅ Uptime Kama - Email Notifications Test (SMTP)';
    const text = `
Hello!

This is a test email from Uptime Kama to confirm that SMTP email notifications are working correctly.

Email Provider: SMTP (Mailgun)
SMTP Host: ${SMTP_CONFIG.host}
SMTP Port: ${SMTP_CONFIG.port} (${SMTP_CONFIG.secure ? 'SSL/TLS' : 'STARTTLS'})
From Email: ${DEFAULT_FROM_EMAIL}
From Name: ${DEFAULT_FROM_NAME}
Mode: ${isLocalhost ? 'Development (Mock)' : 'Production (Real SMTP)'}

If you received this email, your notification settings are configured properly.

Best regards,
Uptime Kama Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SMTP Test Email</title>
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
            <div class="logo">📧 SMTP</div>
            <h2>✅ Test Email Success</h2>
        </div>
        <div class="content">
            <h3>Hello!</h3>
            <p>This is a test email from <strong>Uptime Kama</strong> to confirm that SMTP email notifications are working correctly.</p>
            
            <div class="details">
                <h4>Configuration:</h4>
                <p><strong>Email Provider:</strong> SMTP (Mailgun)</p>
                <p><strong>SMTP Host:</strong> ${SMTP_CONFIG.host}</p>
                <p><strong>SMTP Port:</strong> ${SMTP_CONFIG.port} (${SMTP_CONFIG.secure ? 'SSL/TLS' : 'STARTTLS'})</p>
                <p><strong>From Email:</strong> ${DEFAULT_FROM_EMAIL}</p>
                <p><strong>From Name:</strong> ${DEFAULT_FROM_NAME}</p>
                <p><strong>Mode:</strong> ${isLocalhost ? 'Development (Mock)' : 'Production (Real SMTP)'}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p>If you received this email, your notification settings are configured properly.</p>
            <p>You're all set to receive monitor alerts!</p>
        </div>
        <div class="footer">
            This test email was sent by Uptime Kama monitoring system using SMTP.
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