#!/usr/bin/env node

/**
 * Test script for Mailgun email functionality
 * This script tests sending emails through the Mailgun API
 */

require('dotenv').config();
const formData = require('form-data');
const Mailgun = require('mailgun.js');

async function testMailgunEmail() {
    console.log('🧪 Testing Mailgun Email System...\n');
    
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`- MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN || '❌ Not set'}`);
    console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}\n`);
    
    // Check if we should use mock or real emails
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                       process.env.NODE_ENV === 'test' || 
                       !process.env.NODE_ENV ||
                       !process.env.MAILGUN_API_KEY ||
                       !process.env.MAILGUN_DOMAIN;
                       
    if (isLocalhost) {
        console.log('📧 Running in MOCK mode (development)');
        console.log('To test real emails:');
        console.log('1. Get your Mailgun domain from https://app.mailgun.com/app/domains');
        console.log('2. Set MAILGUN_DOMAIN in .env file');
        console.log('3. Set EMAIL_FROM in .env file');
        console.log('4. Set NODE_ENV=production');
        console.log('5. Run this test again\n');
        
        // Mock email test
        console.log('🧪 MOCK EMAIL TEST:');
        console.log('To: efemarko1@gmail.com');
        console.log('Subject: 🧪 Mailgun Test Email');
        console.log('Content: This is a test email from Uptime Kama Mailgun system');
        console.log('✅ Mock email test completed\n');
        return;
    }
    
    console.log('📧 Running in PRODUCTION mode - will send real email via Mailgun\n');
    
    try {
        // Initialize Mailgun
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({
            username: 'api',
            key: process.env.MAILGUN_API_KEY
        });
        
        console.log(`🔗 Testing connection to Mailgun...`);
        console.log(`📧 Using domain: ${process.env.MAILGUN_DOMAIN}`);
        
        // Send test email
        console.log('📤 Sending test email...');
        const messageData = {
            from: process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`,
            to: 'efemarko1@gmail.com',
            subject: '🧪 Mailgun Test Email - Uptime Kama',
            text: `
Test Email from Uptime Kama Mailgun System

This is a test email to verify that the Mailgun API integration is working correctly.

Configuration:
- API Key: ${process.env.MAILGUN_API_KEY.substring(0, 10)}...
- Domain: ${process.env.MAILGUN_DOMAIN}
- From: ${process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`}
- To: efemarko1@gmail.com

If you received this email, the Mailgun email system is working correctly!

Timestamp: ${new Date().toISOString()}

Best regards,
Uptime Kama Team
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mailgun Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FA7669; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 10px; border-radius: 0 0 5px 5px; font-size: 12px; }
        .logo { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📧 Mailgun</div>
            <h2>🧪 Test Email Success</h2>
        </div>
        <div class="content">
            <h3>Test Email from Uptime Kama</h3>
            <p>This is a test email to verify that the Mailgun API integration is working correctly.</p>
            
            <div class="details">
                <h4>Configuration:</h4>
                <p><strong>Email Provider:</strong> Mailgun API</p>
                <p><strong>API Key:</strong> ${process.env.MAILGUN_API_KEY.substring(0, 10)}...</p>
                <p><strong>Domain:</strong> ${process.env.MAILGUN_DOMAIN}</p>
                <p><strong>From:</strong> ${process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`}</p>
                <p><strong>To:</strong> efemarko1@gmail.com</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            
            <p><strong>✅ If you received this email, the Mailgun email system is working correctly!</strong></p>
            
            <p>You can now start receiving monitor alerts from Uptime Kama.</p>
        </div>
        <div class="footer">
            This test email was sent by Uptime Kama monitoring system using Mailgun API.
        </div>
    </div>
</body>
</html>
            `.trim()
        };
        
        const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
        
        console.log('✅ Email sent successfully!');
        console.log(`📬 Message ID: ${result.id}`);
        console.log(`📧 Sent to: efemarko1@gmail.com`);
        console.log(`📊 Status: ${result.message}\n`);
        
        console.log('🎉 Mailgun email test completed successfully!');
        console.log('Check your inbox at efemarko1@gmail.com for the test email.');
        console.log('Check your Mailgun dashboard at https://app.mailgun.com/app/logs for delivery logs.');
        
    } catch (error) {
        console.error('❌ Mailgun email test failed:');
        console.error(`Error: ${error.message}\n`);
        
        // Check for common Mailgun errors
        if (error.message.includes('Forbidden')) {
            console.log('🔧 Troubleshooting - Authentication Error:');
            console.log('1. Check if your MAILGUN_API_KEY is correct');
            console.log('2. Verify your API key at https://app.mailgun.com/app/account/security');
            console.log('3. Make sure you\'re using the correct API key format');
        } else if (error.message.includes('domain')) {
            console.log('🔧 Troubleshooting - Domain Error:');
            console.log('1. Check if your MAILGUN_DOMAIN is correct');
            console.log('2. Verify your domain at https://app.mailgun.com/app/domains');
            console.log('3. Use sandbox domain for testing (e.g., sandbox123.mailgun.org)');
        } else {
            console.log('🔧 Troubleshooting:');
            console.log('1. Verify Mailgun credentials in .env file');
            console.log('2. Check your Mailgun account status');
            console.log('3. Ensure your domain is verified in Mailgun');
            console.log('4. Check Mailgun logs at https://app.mailgun.com/app/logs');
        }
        
        console.log('\n📚 Helpful links:');
        console.log('- Mailgun Dashboard: https://app.mailgun.com/app/dashboard');
        console.log('- API Documentation: https://documentation.mailgun.com/api_reference.html');
        console.log('- Domain Setup: https://app.mailgun.com/app/domains\n');
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testMailgunEmail().catch(console.error);
} 