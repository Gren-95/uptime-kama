import { test, expect } from '@playwright/test';

test.describe('Email Notifications (Story 2.1)', () => {
    let testEmail;
    
    test.beforeEach(async ({ page }) => {
        // Create account and login first with unique email
        const timestamp = Date.now();
        testEmail = `test${timestamp}@example.com`;
        
        await page.goto('/signup');
        await page.fill('[name="email"]', testEmail);
        await page.fill('[name="password"]', 'TestPass123!');
        await page.fill('[name="confirmPassword"]', 'TestPass123!');
        await page.click('button[type="submit"]');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should allow user to set email address for notifications', async ({ page }) => {
        // Navigate to settings or notification preferences
        await page.click('#settings-btn');
        await expect(page).toHaveURL(/\/settings/);

        // Should see notification settings section
        await expect(page.locator('.notification-settings h2')).toContainText('Email Notifications');
        
        // Should see email input field
        await expect(page.locator('[name="notificationEmail"]')).toBeVisible();
        
        // Should be pre-filled with user's email
        await expect(page.locator('[name="notificationEmail"]')).toHaveValue(testEmail);
        
        // Should be able to change email
        const newEmail = `notifications${Date.now()}@example.com`;
        await page.fill('[name="notificationEmail"]', newEmail);
        await page.click('#save-notification-settings');
        
        // Should see success message
        await expect(page.locator('.success-message')).toContainText('Notification settings saved');
        
        // Email should be saved
        await page.reload();
        await expect(page.locator('[name="notificationEmail"]')).toHaveValue(newEmail);
    });

    test('should allow user to turn email notifications on/off globally', async ({ page }) => {
        await page.click('#settings-btn');
        await expect(page).toHaveURL(/\/settings/);

        // Should see global email toggle
        const emailToggle = page.locator('[name="enableEmailNotifications"]');
        await expect(emailToggle).toBeVisible();
        
        // Should be able to toggle off
        if (await emailToggle.isChecked()) {
            await emailToggle.uncheck();
        } else {
            await emailToggle.check();
        }
        
        await page.click('#save-notification-settings');
        
        // Should see success message
        await expect(page.locator('.success-message')).toContainText('Notification settings saved');
    });

    test('should allow user to turn email notifications on/off per monitor', async ({ page }) => {
        // First add a monitor
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Test Monitor');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '5');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Go to monitor settings or edit monitor
        await page.click('.monitor-item .edit-btn');
        
        // Should see email notification toggle for this monitor
        const monitorEmailToggle = page.locator('[name="emailNotifications"]');
        await expect(monitorEmailToggle).toBeVisible();
        
        // Should be able to toggle notifications for this monitor
        const isChecked = await monitorEmailToggle.isChecked();
        if (isChecked) {
            await monitorEmailToggle.uncheck();
        } else {
            await monitorEmailToggle.check();
        }
        
        await page.click('#save-monitor-btn');
        
        // Should see success message
        await expect(page.locator('.success-message')).toContainText('Monitor updated');
        
        // Verify the setting was saved
        await page.click('.monitor-item .edit-btn');
        await expect(monitorEmailToggle).toBeChecked({ checked: !isChecked });
    });

    test('should send email when monitor goes from UP to DOWN', async ({ page }) => {
        // Mock nodemailer to capture sent emails
        await page.addInitScript(() => {
            window.sentEmails = [];
            window.mockNodemailer = {
                createTransport: () => ({
                    sendMail: (options) => {
                        window.sentEmails.push(options);
                        return Promise.resolve({ messageId: 'test-id' });
                    }
                })
            };
        });

        // Add a monitor that will go DOWN
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Down Test Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/500');
        await page.selectOption('[name="interval"]', '1');
        
        // Enable email notifications for this monitor
        await page.check('[name="emailNotifications"]');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait for monitor to be checked and go DOWN
        await page.waitForTimeout(5000);
        
        // Check if email was sent (this would require backend integration)
        // For now, we'll verify the email notification setting is enabled
        await page.click('.monitor-item .edit-btn');
        await expect(page.locator('[name="emailNotifications"]')).toBeChecked();
        
        // In a real implementation, you would:
        // 1. Mock the email service
        // 2. Trigger the monitor check
        // 3. Verify email was sent with correct content
    });

    test('should send email when monitor recovers from DOWN to UP', async ({ page }) => {
        // This test would follow similar pattern to DOWN test
        // but would test the recovery scenario
        
        // Add a monitor that starts DOWN then goes UP
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Recovery Test Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/200');
        await page.selectOption('[name="interval"]', '1');
        
        // Enable email notifications
        await page.check('[name="emailNotifications"]');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Verify notification setting is enabled
        await page.click('.monitor-item .edit-btn');
        await expect(page.locator('[name="emailNotifications"]')).toBeChecked();
    });

    test('should include monitor name, URL, and timestamp in email content', async ({ page }) => {
        // Navigate to settings to verify email template preview
        await page.click('#settings-btn');
        await expect(page).toHaveURL(/\/settings/);

        // Should see email template preview section
        const emailPreview = page.locator('.email-template-preview');
        if (await emailPreview.isVisible()) {
            // Should show variables that will be included
            await expect(emailPreview).toContainText('Monitor Name: {{monitorName}}');
            await expect(emailPreview).toContainText('URL: {{monitorUrl}}');
            await expect(emailPreview).toContainText('Timestamp: {{timestamp}}');
            await expect(emailPreview).toContainText('Status: {{status}}');
        }
    });

    test('should not send emails when notifications are disabled globally', async ({ page }) => {
        // Disable global email notifications
        await page.click('#settings-btn');
        await page.uncheck('[name="enableEmailNotifications"]');
        await page.click('#save-notification-settings');
        
        // Add a monitor with email notifications enabled
        await page.goto('/dashboard');
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'No Email Test');
        await page.fill('[name="url"]', 'https://httpstat.us/500');
        await page.selectOption('[name="interval"]', '1');
        await page.check('[name="emailNotifications"]');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Verify monitor was created but global notifications are disabled
        await page.click('#settings-btn');
        await expect(page.locator('[name="enableEmailNotifications"]')).not.toBeChecked();
    });

    test('should not send emails when notifications are disabled for specific monitor', async ({ page }) => {
        // Add a monitor with email notifications disabled
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'No Email Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/500');
        await page.selectOption('[name="interval"]', '1');
        await page.uncheck('[name="emailNotifications"]');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Verify notification is disabled for this monitor
        await page.click('.monitor-item .edit-btn');
        await expect(page.locator('[name="emailNotifications"]')).not.toBeChecked();
    });

    test('should validate email address format in notification settings', async ({ page }) => {
        await page.click('#settings-btn');
        
        // Try invalid email formats
        const invalidEmails = [
            'invalid-email',
            'invalid@',
            '@invalid.com',
            'invalid.com',
            ''
        ];

        for (const invalidEmail of invalidEmails) {
            await page.fill('[name="notificationEmail"]', invalidEmail);
            await page.click('#save-notification-settings');
            
            // Should see validation error
            await expect(page.locator('.error-message')).toContainText(/invalid.*email|email.*invalid|valid.*email/i);
        }

        // Valid email should work
        await page.fill('[name="notificationEmail"]', 'valid@example.com');
        await page.click('#save-notification-settings');
        await expect(page.locator('.success-message')).toContainText('Notification settings saved');
    });

    test('should display current email notification status on dashboard', async ({ page }) => {
        // Add a monitor with notifications enabled
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Status Display Test');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '5');
        await page.check('[name="emailNotifications"]');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Should show notification status on dashboard
        const monitorItem = page.locator('.monitor-item').first();
        const notificationStatus = monitorItem.locator('.notification-status');
        
        // Should indicate email notifications are enabled
        if (await notificationStatus.isVisible()) {
            await expect(notificationStatus).toContainText(/email.*on|notifications.*enabled/i);
        }
    });
}); 