const { test, expect } = require('@playwright/test');

test.describe('Account Creation (Story 0.1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the signup page before each test
    await page.goto('/signup');
  });

  test('should successfully create an account with valid credentials', async ({ page }) => {
    // Generate unique username to avoid conflicts
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const password = 'SecurePassword123!';

    // Fill in the signup form
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or show success message
    await expect(page).toHaveURL(/\/(dashboard|login)/);
    
    // If redirected to login, verify success message
    if (page.url().includes('/login')) {
      await expect(page.locator('.success-message, .alert-success')).toContainText(/account created|registration successful/i);
    }
    
    // If redirected to dashboard, verify we're logged in
    if (page.url().includes('/dashboard')) {
      await expect(page.locator('.user-info, .welcome-message')).toBeVisible();
    }
  });

  test('should show error when username is already taken', async ({ page }) => {
    const existingUsername = 'existinguser';
    const password = 'SecurePassword123!';

    // First, create an account (assuming this user exists or create one)
    // In a real scenario, you might seed the database with test data
    
    // Try to create account with existing username
    await page.fill('[name="username"]', existingUsername);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);

    await page.click('button[type="submit"]');

    // Should show error message about username being taken
    await expect(page.locator('.error-message, .alert-danger, .field-error')).toContainText(/username.*already.*taken|username.*exists/i);
    
    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should validate password security requirements', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    
    // Test cases for different password requirements
    const invalidPasswords = [
      { password: '123', error: /too short|minimum.*characters/i },
      { password: 'password', error: /uppercase|capital letter/i },
      { password: 'PASSWORD', error: /lowercase/i },
      { password: 'Password', error: /number|digit/i },
      { password: 'Password123', error: /special character|symbol/i }
    ];

    for (const testCase of invalidPasswords) {
      // Clear and fill form
      await page.fill('[name="username"]', username);
      await page.fill('[name="password"]', testCase.password);
      await page.fill('[name="confirmPassword"]', testCase.password);

      await page.click('button[type="submit"]');

      // Should show appropriate error message
      await expect(page.locator('.error-message, .alert-danger, .field-error, .password-error')).toContainText(testCase.error);
      
      // Should remain on signup page
      await expect(page).toHaveURL(/\/signup/);
    }
  });

  test('should validate password confirmation matches', async ({ page }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'SecurePassword123!';
    const wrongConfirmation = 'DifferentPassword123!';

    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', wrongConfirmation);

    await page.click('button[type="submit"]');

    // Should show error about password mismatch
    await expect(page.locator('.error-message, .alert-danger, .field-error')).toContainText(/passwords.*match|passwords.*same/i);
    
    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should allow immediate login after account creation', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const password = 'SecurePassword123!';

    // Create account
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // If not automatically logged in, go to login page
    if (!page.url().includes('/dashboard')) {
      await page.goto('/login');
      
      // Login with the newly created credentials
      await page.fill('[name="username"]', username);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');
    }

    // Should successfully log in and reach dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.dashboard, .welcome-message, h1')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors for required fields
    await expect(page.locator('.error-message, .alert-danger, .field-error')).toContainText(/required|cannot be empty/i);
    
    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should display signup form elements correctly', async ({ page }) => {
    // Verify all form elements are present
    await expect(page.locator('[name="username"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify form labels/placeholders
    await expect(page.locator('label[for="username"], [placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('label[for="password"], [placeholder*="password" i]')).toBeVisible();
    
    // Verify submit button text
    await expect(page.locator('button[type="submit"]')).toContainText(/sign up|create account|register/i);
  });

  test('should handle special characters in username', async ({ page }) => {
    const specialCharUsernames = [
      'user@domain.com', // email format
      'user-name',       // hyphen
      'user_name',       // underscore
      'user.name'        // dot
    ];

    for (const username of specialCharUsernames) {
      const password = 'SecurePassword123!';
      
      await page.fill('[name="username"]', username);
      await page.fill('[name="password"]', password);
      await page.fill('[name="confirmPassword"]', password);
      
      await page.click('button[type="submit"]');
      
      // Should either succeed or show appropriate validation message
      // This depends on your business rules for usernames
      const hasError = await page.locator('.error-message, .alert-danger').isVisible();
      
      if (hasError) {
        // If validation fails, should show clear message about allowed characters
        await expect(page.locator('.error-message, .alert-danger')).toContainText(/username.*invalid|allowed characters/i);
      } else {
        // If validation passes, should proceed successfully
        await expect(page).toHaveURL(/\/(dashboard|login)/);
      }
      
      // Reset for next iteration
      await page.goto('/signup');
    }
  });
}); 