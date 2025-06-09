const { test, expect } = require('@playwright/test');

test.describe('Account Creation (Story 0.1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the signup page before each test
    await page.goto('/signup');
  });

  test('should successfully create an account with valid credentials', async ({ page }) => {
    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const password = 'SecurePassword123!';

    // Fill in the signup form
    await page.fill('[name="email"]', email);
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
      await expect(page.locator('.user-info').first()).toBeVisible();
    }
  });

  test('should show error when email is already taken', async ({ page }) => {
    const existingEmail = `existing${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    // First create a user with that email
    await page.fill('[name="email"]', existingEmail);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // Go back to signup page
    await page.goto('/signup');

    // Try to create account with existing email
    await page.fill('[name="email"]', existingEmail);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);

    await page.click('button[type="submit"]');

    // Should show error message about email being taken
    await expect(page.locator('.error-message').first()).toContainText(/email.*already.*registered|email.*exists/i);

    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should validate password security requirements', async ({ page }) => {
    const email = `testuser${Date.now()}@example.com`;

    // Test case for weak password
    const weakPassword = '123';

    // Clear and fill form
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', weakPassword);
    await page.fill('[name="confirmPassword"]', weakPassword);

    await page.click('button[type="submit"]');

    // Should show appropriate error message
    await expect(page.locator('.error-message').first()).toContainText(/too short|minimum.*characters|8 characters/i);

    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should validate password confirmation matches', async ({ page }) => {
    const email = `testuser${Date.now()}@example.com`;
    const password = 'SecurePassword123!';
    const wrongConfirmation = 'DifferentPassword123!';

    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', wrongConfirmation);

    await page.click('button[type="submit"]');

    // Should show error about password mismatch
    await expect(page.locator('.error-message').first()).toContainText(/passwords.*match|passwords.*same/i);

    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should allow immediate login after account creation', async ({ page }) => {
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const password = 'SecurePassword123!';

    // Create account
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // If not automatically logged in, go to login page
    if (!page.url().includes('/dashboard')) {
      await page.goto('/login');

      // Login with the newly created credentials
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', password);
      await page.click('button[type="submit"]');
    }

    // Should successfully log in and reach dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.dashboard').first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors for required fields
    await expect(page.locator('.error-message').first()).toContainText(/required|cannot be empty|must be at least/i);

    // Should remain on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should display signup form elements correctly', async ({ page }) => {
    // Verify all form elements are present
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify form labels
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // Verify submit button text
    await expect(page.locator('button[type="submit"]')).toContainText(/sign up|create account|register/i);
  });


});

test.describe('User Login (Story 0.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/login');
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    // First create a user to login with
    const timestamp = Date.now();
    const email = `logintest${timestamp}@example.com`;
    const password = 'SecurePassword123!';

    // Create account first
    await page.goto('/signup');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // Go to login page
    await page.goto('/login');

    // Login with created credentials
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.user-info').first()).toBeVisible();
    await expect(page.locator('.user-info').first()).toContainText(email);
  });

  test('should show error with invalid email', async ({ page }) => {
    const nonExistentEmail = `nonexistent${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    await page.fill('[name="email"]', nonExistentEmail);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error-message').first()).toContainText(/invalid.*email.*password/i);

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error with incorrect password', async ({ page }) => {
    // First create a user
    const timestamp = Date.now();
    const email = `wrongpass${timestamp}@example.com`;
    const correctPassword = 'SecurePassword123!';
    const wrongPassword = 'WrongPassword456!';

    // Create account first
    await page.goto('/signup');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', correctPassword);
    await page.fill('[name="confirmPassword"]', correctPassword);
    await page.click('button[type="submit"]');

    // Go to login page
    await page.goto('/login');

    // Try to login with wrong password
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', wrongPassword);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error-message').first()).toContainText(/invalid.*email.*password/i);

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate required fields on login', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors for required fields
    await expect(page.locator('.error-message').first()).toContainText(/required|cannot be empty/i);

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });





  test('should display login form elements correctly', async ({ page }) => {
    // Verify all form elements are present
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify form labels
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // Verify submit button text
    await expect(page.locator('button[type="submit"]')).toContainText(/login|sign in/i);

    // Verify link to signup
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('should navigate between login and signup pages', async ({ page }) => {
    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // Click signup link
    await page.click('a[href="/signup"]');
    await expect(page).toHaveURL(/\/signup/);

    // Click login link
    await page.click('a[href="/login"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // First create and login a user
    const timestamp = Date.now();
    const email = `logouttest${timestamp}@example.com`;
    const password = 'SecurePassword123!';

    // Create account
    await page.goto('/signup');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.fill('[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');

    // Should be logged in and on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);

    // Should not see user info anymore
    await expect(page.locator('.user-info')).not.toBeVisible();
  });
});