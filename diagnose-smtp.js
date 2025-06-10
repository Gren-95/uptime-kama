#!/usr/bin/env node

const nodemailer = require('nodemailer');

async function diagnoseSMTP() {
    console.log('🔍 SMTP Connection Diagnostics');
    console.log('==============================');
    
    const configs = [
        {
            name: 'Mailgun EU STARTTLS (587)',
            config: {
                host: 'smtp.eu.mailgun.org',
                port: 587,
                secure: false,
                auth: {
                    user: 'up@up.bee-srv.me',
                    pass: '!ITVZ%gSc1R&Glu2'
                },
                debug: true
            }
        },
        {
            name: 'Mailgun EU SSL (465)',
            config: {
                host: 'smtp.eu.mailgun.org',
                port: 465,
                secure: true,
                auth: {
                    user: 'up@up.bee-srv.me',
                    pass: '!ITVZ%gSc1R&Glu2'
                },
                debug: true
            }
        },
        {
            name: 'Mailgun EU Alternative (2525)',
            config: {
                host: 'smtp.eu.mailgun.org',
                port: 2525,
                secure: false,
                auth: {
                    user: 'up@up.bee-srv.me',
                    pass: '!ITVZ%gSc1R&Glu2'
                },
                debug: true
            }
        },
        {
            name: 'Mailgun US STARTTLS (587)',
            config: {
                host: 'smtp.mailgun.org',
                port: 587,
                secure: false,
                auth: {
                    user: 'up@up.bee-srv.me',
                    pass: '!ITVZ%gSc1R&Glu2'
                },
                debug: true
            }
        }
    ];
    
    for (const testConfig of configs) {
        console.log(`\n📡 Testing: ${testConfig.name}`);
        console.log(`   Host: ${testConfig.config.host}:${testConfig.config.port}`);
        console.log(`   Security: ${testConfig.config.secure ? 'SSL/TLS' : 'STARTTLS'}`);
        console.log(`   User: ${testConfig.config.auth.user}`);
        
        try {
            const transporter = nodemailer.createTransport(testConfig.config);
            
            // Test connection
            console.log('🔌 Testing connection...');
            await transporter.verify();
            console.log('✅ Connection successful!');
            
            // Try sending a test email
            console.log('📧 Attempting to send test email...');
            const result = await transporter.sendMail({
                from: 'Status Monitor <up@up.bee-srv.me>',
                to: 'efemarko1@gmail.com',
                subject: 'SMTP Test - Connection Successful',
                text: `This is a test email sent via ${testConfig.name}\n\nIf you receive this, the SMTP configuration is working!`,
                html: `<h2>✅ SMTP Test Successful</h2><p>This email was sent via <strong>${testConfig.name}</strong></p><p>Configuration is working correctly!</p>`
            });
            
            console.log(`🎉 EMAIL SENT SUCCESSFULLY via ${testConfig.name}!`);
            console.log(`📨 Message ID: ${result.messageId}`);
            console.log(`📊 Response: ${result.response}`);
            
            // If we get here, this configuration works
            console.log('\n✅ WORKING CONFIGURATION FOUND!');
            console.log('Add these to your .env file:');
            console.log(`SMTP_HOST=${testConfig.config.host}`);
            console.log(`SMTP_PORT=${testConfig.config.port}`);
            console.log(`SMTP_SECURE=${testConfig.config.secure}`);
            console.log(`SMTP_USER=${testConfig.config.auth.user}`);
            console.log(`SMTP_PASS=${testConfig.config.auth.pass}`);
            
            return; // Exit after first successful config
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            if (error.code) {
                console.log(`   Error Code: ${error.code}`);
            }
        }
    }
    
    console.log('\n❌ ALL CONFIGURATIONS FAILED');
    console.log('\n🔧 POSSIBLE ISSUES:');
    console.log('1. ❗ SMTP credentials are incorrect or expired');
    console.log('2. ❗ Mailgun domain is not properly configured');
    console.log('3. ❗ Account might not be verified or activated');
    console.log('4. ❗ IP address might be blocked');
    console.log('5. ❗ Two-factor authentication required');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. 🌐 Check your Mailgun dashboard: https://app.mailgun.com/');
    console.log('2. 📧 Verify your domain is active and verified');
    console.log('3. 🔑 Generate new SMTP credentials from Mailgun');
    console.log('4. 📍 Check if your domain is in EU or US region');
    console.log('5. 💳 Ensure your Mailgun account is not suspended');
}

diagnoseSMTP().catch(console.error); 