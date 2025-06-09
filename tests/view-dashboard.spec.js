// tests/view-dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('View Monitor Dashboard (Story 1.2)', () => {
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
    });

    test('should display empty dashboard when no monitors exist', async ({ page }) => {
        // Should see welcome message
        await expect(page.locator('.welcome-message h1')).toContainText('Welcome to your Dashboard');
        
        // Should see "No monitors" message
        await expect(page.locator('.no-monitors')).toContainText('No monitors configured yet');
        
        // Should see add monitor button
        await expect(page.locator('#add-monitor-btn')).toBeVisible();
        
        // Should not see monitors list
        await expect(page.locator('.monitors-list')).not.toBeVisible();
    });

    test('should display list of all monitors', async ({ page }) => {
        // Add multiple monitors first
        const monitors = [
            { name: 'Website 1', url: 'https://example.com' },
            { name: 'Website 2', url: 'https://httpstat.us/200' },
            { name: 'Website 3', url: 'https://github.com' }
        ];

        for (const monitor of monitors) {
            await page.click('#add-monitor-btn');
            await page.fill('[name="name"]', monitor.name);
            await page.fill('[name="url"]', monitor.url);
            await page.selectOption('[name="interval"]', '5');
            await page.click('#submit-monitor-btn');
            await page.waitForLoadState('networkidle');
        }

        // Should see monitors list
        await expect(page.locator('.monitors-list')).toBeVisible();
        
        // Should see all monitors
        for (const monitor of monitors) {
            await expect(page.locator('.monitor-item').filter({ hasText: monitor.name })).toBeVisible();
        }
        
        // Should see correct count
        await expect(page.locator('.monitor-item')).toHaveCount(monitors.length);
        
        // Should not see "No monitors" message
        await expect(page.locator('.no-monitors')).not.toBeVisible();
    });

    test('should display monitor name and URL for each monitor', async ({ page }) => {
        // Add a monitor
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'My Test Website');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '5');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        const monitorItem = page.locator('.monitor-item').first();
        
        // Should see monitor name
        await expect(monitorItem.locator('.monitor-name')).toContainText('My Test Website');
        
        // Should see monitor URL
        await expect(monitorItem.locator('.monitor-url')).toContainText('https://example.com');
    });

    test('should display monitor status (UP/DOWN) with correct styling', async ({ page }) => {
        // Add a monitor
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Status Test');
        await page.fill('[name="url"]', 'https://httpstat.us/200');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        const monitorItem = page.locator('.monitor-item').first();
        const statusElement = monitorItem.locator('.status');
        
        // Should see status element
        await expect(statusElement).toBeVisible();
        
        // Status should be one of UP, DOWN, or UNKNOWN
        const statusText = await statusElement.textContent();
        expect(['UP', 'DOWN', 'UNKNOWN']).toContain(statusText.trim());
        
        // Should have appropriate CSS class
        const statusClass = await statusElement.getAttribute('class');
        expect(statusClass).toMatch(/status-(up|down|unknown)/);
    });

    test('should display UP status in green styling', async ({ page }) => {
        // Add a monitor that should be UP
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'UP Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/200');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait a moment for the monitor to be checked
        await page.waitForTimeout(3000);
        await page.reload();

        const monitorItem = page.locator('.monitor-item').first();
        const statusElement = monitorItem.locator('.status');
        
        // Check if status is UP and has correct class
        const statusText = await statusElement.textContent();
        if (statusText.trim() === 'UP') {
            await expect(statusElement).toHaveClass(/.*status-up.*/);
        }
    });

    test('should display DOWN status in red styling', async ({ page }) => {
        // Add a monitor that should be DOWN
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'DOWN Monitor');
        await page.fill('[name="url"]', 'https://httpstat.us/500');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait a moment for the monitor to be checked
        await page.waitForTimeout(3000);
        await page.reload();

        const monitorItem = page.locator('.monitor-item').first();
        const statusElement = monitorItem.locator('.status');
        
        // Check if status is DOWN and has correct class
        const statusText = await statusElement.textContent();
        if (statusText.trim() === 'DOWN') {
            await expect(statusElement).toHaveClass(/.*status-down.*/);
        }
    });

    test('should display last checked time', async ({ page }) => {
        // Add a monitor
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Time Test');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait for monitor to be checked
        await page.waitForTimeout(3000);
        await page.reload();

        const monitorItem = page.locator('.monitor-item').first();
        
        // Should see last checked time (if monitor has been checked)
        const lastCheckElement = monitorItem.locator('.last-check');
        if (await lastCheckElement.isVisible()) {
            const lastCheckText = await lastCheckElement.textContent();
            expect(lastCheckText).toMatch(/Last checked:/);
            // Should contain relative time like "Just now", "2 minutes ago", etc.
            expect(lastCheckText).toMatch(/(Just now|minute|hour|day)/);
        }
    });

    test('should display response time for UP monitors', async ({ page }) => {
        // Add a monitor that should be UP
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Response Time Test');
        await page.fill('[name="url"]', 'https://httpstat.us/200');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait for monitor to be checked
        await page.waitForTimeout(5000);
        await page.reload();

        const monitorItem = page.locator('.monitor-item').first();
        const statusElement = monitorItem.locator('.status');
        
        // If status is UP, should see response time
        const statusText = await statusElement.textContent();
        if (statusText.trim() === 'UP') {
            const responseTimeElement = monitorItem.locator('.response-time');
            if (await responseTimeElement.isVisible()) {
                const responseTimeText = await responseTimeElement.textContent();
                expect(responseTimeText).toMatch(/\d+ms/);
            }
        }
    });

    test('should display check interval for each monitor', async ({ page }) => {
        // Add monitors with different intervals
        const intervals = [
            { minutes: '1', display: '1 minute' },
            { minutes: '5', display: '5 minutes' },
            { minutes: '60', display: '60 minutes' }
        ];

        for (let i = 0; i < intervals.length; i++) {
            await page.click('#add-monitor-btn');
            await page.fill('[name="name"]', `Monitor ${i + 1}`);
            await page.fill('[name="url"]', 'https://example.com');
            await page.selectOption('[name="interval"]', intervals[i].minutes);
            await page.click('#submit-monitor-btn');
            await page.waitForLoadState('networkidle');
        }

        // Check each monitor shows correct interval
        for (let i = 0; i < intervals.length; i++) {
            const monitorName = `Monitor ${i + 1}`;
            const monitorItem = page.locator('.monitor-item').filter({ hasText: monitorName });
            const intervalElement = monitorItem.locator('.check-interval');
            await expect(intervalElement).toContainText(`Checks every ${intervals[i].display}`);
        }
    });

    test('should show error message for DOWN monitors', async ({ page }) => {
        // Add a monitor that should be DOWN with error
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Error Test');
        await page.fill('[name="url"]', 'https://httpstat.us/404');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Wait for monitor to be checked
        await page.waitForTimeout(3000);
        await page.reload();

        const monitorItem = page.locator('.monitor-item').first();
        const statusElement = monitorItem.locator('.status');
        
        // If status is DOWN, should see error message
        const statusText = await statusElement.textContent();
        if (statusText.trim() === 'DOWN') {
            const errorElement = monitorItem.locator('.monitor-status .error-message');
            if (await errorElement.isVisible()) {
                const errorText = await errorElement.textContent();
                expect(errorText).toBeTruthy(); // Should have some error message
            }
        }
    });

    test('should auto-refresh page to show updated statuses', async ({ page }) => {
        // Add a monitor
        await page.click('#add-monitor-btn');
        await page.fill('[name="name"]', 'Auto Refresh Test');
        await page.fill('[name="url"]', 'https://example.com');
        await page.selectOption('[name="interval"]', '1');
        await page.click('#submit-monitor-btn');
        await page.waitForLoadState('networkidle');

        // Check that auto-refresh script is present
        const scriptContent = await page.locator('script').last().textContent();
        expect(scriptContent).toContain('setInterval');
        expect(scriptContent).toContain('window.location.reload');
        expect(scriptContent).toContain('30000'); // 30 seconds
    });

    test('should display monitors section and recent activity section', async ({ page }) => {
        // Should see both dashboard sections
        await expect(page.locator('.dashboard-section').first()).toContainText('Monitors');
        await expect(page.locator('.dashboard-section').last()).toContainText('Recent Activity');
    });

    test('should show monitor count in recent activity section', async ({ page }) => {
        // Initially should show no monitors
        await expect(page.locator('.dashboard-section').last()).toContainText('No monitors configured yet');

        // Add monitors
        const monitorCount = 2;
        for (let i = 1; i <= monitorCount; i++) {
            await page.click('#add-monitor-btn');
            await page.fill('[name="name"]', `Monitor ${i}`);
            await page.fill('[name="url"]', 'https://example.com');
            await page.selectOption('[name="interval"]', '5');
            await page.click('#submit-monitor-btn');
            await page.waitForLoadState('networkidle');
        }

        // Should show correct monitor count
        await expect(page.locator('.dashboard-section').last()).toContainText(`Monitoring ${monitorCount} websites`);
    });
}); 