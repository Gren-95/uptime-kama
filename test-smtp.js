#!/usr/bin/env node

/**
 * SMTP Email Test Script (Direct Nodemailer)
 * 
 * This script tests the SMTP email functionality with Mailgun using nodemailer directly.
 * 
 * Usage: node test-smtp.js [recipient-email]
 */

const nodemailer = require('nodemailer');

const SMTP_USER = 'up@up.bee-srv.me';
const SMTP_PASS = '!ITVZ%gSc1R&Glu2';
const SMTP_HOST = 'smtp.eu.mailgun.org';
const SMTP_PORT = 587;
const SMTP_SECURE = false; // STARTTLS

const DEFAULT_FROM = '"Status Monitor" <up@up.bee-srv.me>';

const recipient = process.argv[2] || 'efemarko1@gmail.com';

async function testSMTP() {
    console.log('🧪 Testing SMTP Email Configuration (Direct Nodemailer)');
    console.log('===================================');
    console.log(`SMTP Host: ${SMTP_HOST}`);
    console.log(`SMTP Port: ${SMTP_PORT}`);
    console.log(`SMTP User: ${SMTP_USER}`);
    console.log(`From:     ${DEFAULT_FROM}`);
    console.log(`To:       ${recipient}`);
    console.log('');

    // Create transporter
    let transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    // Verify connection
    try {
        await transporter.verify();
        console.log('✅ SMTP connection successful.');
    } catch (err) {
        console.error('❌ SMTP connection failed:', err.message);
        process.exit(1);
    }

    // Send test email
    try {
        let info = await transporter.sendMail({
            from: DEFAULT_FROM,
            to: recipient,
            subject: 'SMTP Test Email ✔️',
            text: 'This is a test email sent using Mailgun SMTP and Nodemailer.',
            html: '<b>This is a test email sent using <i>Mailgun SMTP</i> and <b>Nodemailer</b>.</b>'
        });
        console.log('✅ Test email sent!');
        console.log('Message ID:', info.messageId);
        if (info.accepted && info.accepted.length) {
            console.log('Accepted by:', info.accepted.join(', '));
        }
        if (info.rejected && info.rejected.length) {
            console.log('Rejected:', info.rejected.join(', '));
        }
    } catch (err) {
        console.error('❌ Failed to send test email:', err.message);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the test
console.log('🚀 Starting SMTP Test...');
testSMTP();