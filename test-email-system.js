#!/usr/bin/env node

// Test script to demonstrate email notification system
const emailService = require('./services/emailService');

async function testEmailSystem() {
    console.log('🧪 Testing Uptime Kama Email Notification System\n');
    
    console.log('📧 Current Configuration:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Email Mode: ${emailService.isLocalhost ? 'MOCK (console logs)' : 'REAL (actual emails)'}`);
    console.log(`   Target Email: efemarko1@gmail.com`);
    console.log('');
    
    // Test 1: Basic test email
    console.log('1. Testing welcome/test email...');
    try {
        await emailService.sendTestEmail('test@example.com');
        console.log('✅ Test email sent successfully\n');
    } catch (error) {
        console.log('❌ Test email failed:', error.message, '\n');
    }
    
    // Test 2: Monitor DOWN alert
    console.log('2. Testing monitor DOWN alert...');
    try {
        await emailService.sendMonitorAlert(
            'user@example.com',
            'Test Website',
            'https://example.com',
            'down',
            5000,
            'Connection timeout',
            new Date().toISOString()
        );
        console.log('✅ DOWN alert sent successfully\n');
    } catch (error) {
        console.log('❌ DOWN alert failed:', error.message, '\n');
    }
    
    // Test 3: Monitor UP recovery alert
    console.log('3. Testing monitor UP recovery alert...');
    try {
        await emailService.sendMonitorAlert(
            'user@example.com',
            'Test Website',
            'https://example.com',
            'up',
            250,
            null,
            new Date().toISOString()
        );
        console.log('✅ UP recovery alert sent successfully\n');
    } catch (error) {
        console.log('❌ UP recovery alert failed:', error.message, '\n');
    }
    
    console.log('🎉 Email system test completed!');
    console.log('');
    
    if (emailService.isLocalhost) {
        console.log('📝 Note: Running in MOCK mode - emails are logged above');
        console.log('');
        console.log('🔧 To test with real Gmail emails:');
        console.log('   1. Get a Gmail App Password (see EMAIL_SETUP.md)');
        console.log('   2. Set environment variables:');
        console.log('      export SMTP_USER=efemarko1@gmail.com');
        console.log('      export SMTP_PASS=your-gmail-app-password');
        console.log('      export NODE_ENV=production');
        console.log('   3. Run: node test-email-system.js');
    } else {
        console.log('📧 Real emails were sent to: efemarko1@gmail.com');
        console.log('📬 Check your inbox and spam folder!');
    }
}

// Run the test
if (require.main === module) {
    testEmailSystem().catch(console.error);
}

module.exports = { testEmailSystem }; 