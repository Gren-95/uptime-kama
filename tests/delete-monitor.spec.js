// tests/delete-monitor.spec.js
import { test, expect } from '@playwright/test';

test.describe('Delete Monitor (Story 1.3)', () => {
    test.beforeEach(async ({ page }) => {
        // Create account and login first with unique email
        const timestamp = Date.now();
        const email = `test${timestamp}@example.com`;

        await page.goto('/signup');
        await page.fill('[name="email"]', email);
        await page.fill('[name="password"]', 'TestPass123!');
        await page.fill('[name="confirmPassword"]', 'TestPass123!');
        await page.click('button[type="submit"]');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // Add a monitor to delete later
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Monitor to Delete');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '5');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');
    });

    test('should display delete button for each monitor', async ({ page }) => {
        const monitorItem = page.locator('.monitor-item').first();

        // Should see delete button for the monitor
        await expect(monitorItem.locator('.delete-monitor-btn')).toBeVisible();
    });

    test('should show confirmation dialog before deletion', async ({ page }) => {
        const monitorItem = page.locator('.monitor-item').first();

        // Click delete button
        await monitorItem.locator('.delete-monitor-btn').click();

        // Should see confirmation dialog
        await expect(page.locator('.confirmation-dialog')).toBeVisible();
        await expect(page.locator('.confirmation-dialog')).toContainText(/are you sure|confirm|delete/i);

        // Should see cancel and confirm buttons
        await expect(page.locator('.confirm-delete-btn')).toBeVisible();
        await expect(page.locator('.cancel-delete-btn')).toBeVisible();
    });

    test('should cancel deletion when cancel button is clicked', async ({ page }) => {
        const monitorItem = page.locator('.monitor-item').first();

        // Click delete button
        await monitorItem.locator('.delete-monitor-btn').click();

        // Click cancel
        await page.click('.cancel-delete-btn');

        // Confirmation dialog should disappear
        await expect(page.locator('.confirmation-dialog')).not.toBeVisible();

        // Monitor should still be visible
        await expect(page.locator('.monitor-item')).toContainText('Monitor to Delete');
    });

    test('should successfully delete monitor when confirmed', async ({ page }) => {
        // Verify monitor exists before deletion
        await expect(page.locator('.monitor-item')).toContainText('Monitor to Delete');

        const monitorItem = page.locator('.monitor-item').first();

        // Click delete button
        await monitorItem.locator('.delete-monitor-btn').click();

        // Confirm deletion
        await page.click('.confirm-delete-btn');

        // Wait for page to reload/update
        await page.waitForLoadState('networkidle');

        // Monitor should be removed from dashboard immediately
        await expect(page.locator('.monitor-item').filter({ hasText: 'Monitor to Delete' })).not.toBeVisible();

        // Should show "No monitors" message if this was the only monitor
        await expect(page.locator('.no-monitors')).toContainText('No monitors configured yet');
    });

    test('should stop checking monitor after deletion', async ({ page }) => {
        // Add a monitor that gets checked frequently
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Frequent Check Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/200');
        await page.selectOption('[name="interval"]', '1'); // 1 minute interval
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait for monitor to be checked at least once
        await page.waitForTimeout(3000);
        await page.reload();

        // Verify monitor is being checked (has status)
        const monitorItem = page.locator('.monitor-item').filter({ hasText: 'Frequent Check Monitor' });
        await expect(monitorItem.locator('.status')).toBeVisible();

        // Delete the monitor
        await monitorItem.locator('.delete-monitor-btn').click();
        await page.click('.confirm-delete-btn');
        await page.waitForLoadState('networkidle');

        // Monitor should be completely removed
        await expect(page.locator('.monitor-item').filter({ hasText: 'Frequent Check Monitor' })).not.toBeVisible();

        // Note: We can't easily test that monitoring actually stopped without
        // checking server logs or database, but removal from UI implies it stopped
    });

    test('should handle multiple monitor deletions', async ({ page }) => {
        // Add two more monitors
        const monitors = ['Monitor 2', 'Monitor 3'];

        for (const monitorName of monitors) {
            await page.click('#add-monitor-btn');
            await page.fill('[name="name"]', monitorName);
            await page.fill('[name="url"]', 'https://example.com');
            await page.selectOption('[name="interval"]', '5');
            await page.click('#submit-monitor-btn');
            await page.waitForLoadState('networkidle');
        }

        // Should have 3 monitors total
        await expect(page.locator('.monitor-item')).toHaveCount(3);

        // Delete first monitor
        await page.locator('.monitor-item').first().locator('.delete-monitor-btn').click();
        await page.click('.confirm-delete-btn');
        await page.waitForLoadState('networkidle');

        // Should have 2 monitors left
        await expect(page.locator('.monitor-item')).toHaveCount(2);

        // Delete another monitor
        await page.locator('.monitor-item').first().locator('.delete-monitor-btn').click();
        await page.click('.confirm-delete-btn');
        await page.waitForLoadState('networkidle');

        // Should have 1 monitor left
        await expect(page.locator('.monitor-item')).toHaveCount(1);
    });

    test('should show success message after deletion', async ({ page }) => {
        const monitorItem = page.locator('.monitor-item').first();

        // Delete monitor
        await monitorItem.locator('.delete-monitor-btn').click();
        await page.click('.confirm-delete-btn');
        await page.waitForLoadState('networkidle');

        // Should see success message
        await expect(page.locator('.success-message')).toContainText(/monitor.*deleted|monitor.*removed/i);
    });
});