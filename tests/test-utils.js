const { test } = require('@playwright/test');

/**
 * Test utilities for account creation tests
 */
class TestUtils {
  /**
   * Generate a unique username for testing
   * @returns {string} Unique username
   */
  static generateUniqueUsername() {
    return `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate a secure test password
   * @returns {string} Secure password
   */
  static generateSecurePassword() {
    return 'TestPassword123!';
  }

  /**
   * Clean up test users from database (implement based on your database)
   * This should be called in test setup/teardown
   * @param {string[]} usernames - Array of usernames to clean up
   */
  static async cleanupTestUsers(usernames) {
    // TODO: Implement database cleanup based on your database choice
    // Example for SQLite:
    // const db = require('../database'); // Your database connection
    // for (const username of usernames) {
    //   await db.run('DELETE FROM users WHERE username = ?', [username]);
    // }
    console.log('Cleaning up test users:', usernames);
  }

  /**
   * Create a test user in the database (for testing duplicate username scenario)
   * @param {string} username - Username to create
   * @param {string} password - Password for the user
   */
  static async createTestUser(username, password) {
    // TODO: Implement user creation based on your database
    // This should match your actual user creation logic
    console.log('Creating test user:', username);
  }

  /**
   * Check if a user exists in the database
   * @param {string} username - Username to check
   * @returns {boolean} True if user exists
   */
  static async userExists(username) {
    // TODO: Implement user existence check
    // Example:
    // const db = require('../database');
    // const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    // return !!user;
    return false;
  }

  /**
   * Get common form selectors for account creation
   * @returns {object} Object containing form selectors
   */
  static getFormSelectors() {
    return {
      username: '[name="username"]',
      password: '[name="password"]',
      confirmPassword: '[name="confirmPassword"]',
      submitButton: 'button[type="submit"]',
      errorMessage: '.error-message, .alert-danger, .field-error',
      successMessage: '.success-message, .alert-success'
    };
  }

  /**
   * Common form filling helper
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {object} credentials - Object with username, password, confirmPassword
   */
  static async fillSignupForm(page, credentials) {
    const selectors = this.getFormSelectors();
    
    await page.fill(selectors.username, credentials.username);
    await page.fill(selectors.password, credentials.password);
    if (credentials.confirmPassword) {
      await page.fill(selectors.confirmPassword, credentials.confirmPassword);
    }
  }

  /**
   * Submit signup form and wait for response
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  static async submitSignupForm(page) {
    const selectors = this.getFormSelectors();
    await page.click(selectors.submitButton);
    
    // Wait for either success or error response
    await page.waitForTimeout(1000); // Give time for form processing
  }

  /**
   * Password validation test cases
   * @returns {Array} Array of test cases with password and expected error
   */
  static getPasswordValidationTestCases() {
    return [
      { 
        password: '123', 
        description: 'too short',
        error: /too short|minimum.*characters/i 
      },
      { 
        password: 'password', 
        description: 'no uppercase',
        error: /uppercase|capital letter/i 
      },
      { 
        password: 'PASSWORD', 
        description: 'no lowercase',
        error: /lowercase/i 
      },
      { 
        password: 'Password', 
        description: 'no numbers',
        error: /number|digit/i 
      },
      { 
        password: 'Password123', 
        description: 'no special characters',
        error: /special character|symbol/i 
      }
    ];
  }
}

/**
 * Global test setup - runs before all tests
 */
test.beforeAll(async () => {
  // TODO: Set up test database, clear existing test data, etc.
  console.log('Setting up test environment...');
});

/**
 * Global test teardown - runs after all tests
 */
test.afterAll(async () => {
  // TODO: Clean up test database, remove test files, etc.
  console.log('Cleaning up test environment...');
});

module.exports = TestUtils; 