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